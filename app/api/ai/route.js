import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool, jsonSchema } from 'ai';
import { Converter } from '@memochou1993/json2markdown';

export const runtime = 'edge';

// Function to track events in Mixpanel using fetch (Edge runtime compatible)
const trackMixpanelEvent = async (event, properties) => {
  try {
    const token = '743aa6797630eaf251e029aaed46382f';
    const data = {
      event,
      properties: {
        token,
        ...properties
      }
    };

    // Encode the data for Mixpanel
    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

    // Send the event to Mixpanel
    const response = await fetch('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/plain'
      },
      body: `data=${encodedData}`
    });

    if (!response.ok) {
      console.error('Failed to track event in Mixpanel:', await response.text());
    } else {
      console.log(`Successfully tracked "${event}" event in Mixpanel`);
    }
  } catch (error) {
    console.error('Error tracking event in Mixpanel:', error);
  }
};

// Replace the database helper with a function to call the socket server
const callSocketServer = async (endpoint, params = {}) => {
  const url = new URL(endpoint, process.env.NEXT_PUBLIC_SOCKET_SERVER_URL);

  // Add query parameters - with special handling for arrays
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined) {
      // Handle arrays with the proper [] notation
      if (Array.isArray(params[key])) {
        params[key].forEach(value => {
          url.searchParams.append(`${key}[]`, value);
        });
      } else {
        url.searchParams.append(key, params[key]);
      }
    }
  });

  try {
    console.log(`Calling socket server: ${url.toString()}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Socket server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Process the response to ensure it's in a format the AI can handle
    if (data && !data.error) {
      // Handle coin data responses
      if (endpoint.startsWith('/api/coin/')) {
        // Ensure trends is always an array
        data.trends = Array.isArray(data.trends) ? data.trends : [];

        // Add a clear message about trend data status
        if (data.trends.length === 0 && data.coin) {
          data.hasTrendData = false;
        } else if (data.trends.length > 0) {
          data.hasTrendData = true;
        }
      }

      // Handle array responses (categories, extreme trends, aligned trends, coins by category)
      if (endpoint === '/api/categories' ||
          endpoint === '/api/trends/extreme' ||
          endpoint === '/api/trends/aligned' ||
          endpoint === '/api/coins/category') {
        // Ensure we always return an array
        if (!Array.isArray(data)) {
          return [];
        }
      }

      // Handle market health response
      if (endpoint === '/api/market/health' && !data.error) {
        // Ensure trends object exists with all required properties
        if (!data.trends) {
          data.trends = { UP: 0, HODL: 0, DOWN: 0 };
        } else {
          // Ensure all trend types exist
          if (typeof data.trends.UP === 'undefined') data.trends.UP = 0;
          if (typeof data.trends.HODL === 'undefined') data.trends.HODL = 0;
          if (typeof data.trends.DOWN === 'undefined') data.trends.DOWN = 0;
        }

        // Ensure extremes is an array
        if (!Array.isArray(data.extremes)) {
          data.extremes = [];
        }
      }

      // Handle market crossing response
      if (endpoint === '/api/market/crossing' && !data.error) {
        // Add a formatted message if not present and we have crossing data
        if (!data.message && data.overtaking && data.overtaken && data.date) {
          data.message = `${data.overtaking} trend overtook ${data.overtaken} trend on ${new Date(data.date).toLocaleDateString()}`;
        }
      }
    }

    // Simple logging of the response data
    console.log(`API response from ${endpoint}:`, data);

    return data;
  } catch (error) {
    console.error('Socket server request failed:', {
      endpoint,
      params,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Function to convert JSON data to markdown
const jsonToMarkdown = (data) => {
  try {
    if (!data) return "No data available";

    // If it's an error object, return it as a simple error message
    if (data.error) return `**Error:** ${data.error}`;

    // Convert to markdown using json2md
    return Converter.toMarkdown(data);
  } catch (error) {
    console.error('Error converting JSON to markdown:', error);
    return "Error formatting data";
  }
};

const tools = {
  getCoinByContract: tool({
    description: "Use this when a user asks about a specific blockchain contract address. Example: 'Show me trends for ETH contract 0x123...' or 'What's the data for BSC contract 0xabc...'. Returns detailed coin info including marketCap, ATH/ATL, supply metrics, and recent trend data with dates and streaks.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'The blockchain contract address to look up'
        },
        chain: {
          type: 'string',
          description: 'The blockchain network (ethereum, binance-smart-chain, etc)'
        },
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        trendLimit: {
          type: 'number',
          description: 'Maximum number of trend records to return',
          default: 5
        }
      },
      required: ['contractAddress', 'chain']
    }),
    execute: async ({ contractAddress, chain, interval = "1d", trendLimit = 5 }) => {
      try {
        console.log('Tool executed: getCoinByContract', { contractAddress, chain, interval, trendLimit });

        // Call the socket server API endpoint for contract lookup
        const result = await callSocketServer('/api/coin/contract', {
          contractAddress,
          chain,
          interval,
          trendLimit
        });

        console.log('getCoinByContract - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          coin: result.coin,
          trends: result.trends,
          hasTrendData: result.hasTrendData
        };

        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getCoinByContract Error:', {
          message: error.message,
          stack: error.stack,
          params: { contractAddress, chain, interval, trendLimit }
        });
        return jsonToMarkdown({ error: "Failed to fetch coin data" });
      }
    }
  }),

  getCoinBySymbol: tool({
    description: "Use this when a user mentions a crypto symbol/ticker. Example: 'What's the trend for BTC?' or 'Show ETH analysis'. Returns detailed coin info including marketCap, ATH/ATL, supply metrics, and recent trend data with dates and streaks.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'The cryptocurrency trading symbol (BTC, ETH, etc)'
        },
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        trendLimit: {
          type: 'number',
          description: 'Maximum number of trend records to return',
          default: 5
        }
      },
      required: ['symbol']
    }),
    execute: async ({ symbol, interval = "1d", trendLimit = 5 }) => {
      try {
        console.log('Tool executed: getCoinBySymbol - Starting', { symbol, interval, trendLimit });

        // Call the socket server API endpoint for symbol lookup
        const result = await callSocketServer('/api/coin/symbol', {
          symbol,
          interval,
          trendLimit
        });

        console.log('getCoinBySymbol - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          coin: result.coin,
          trends: result.trends,
          hasTrendData: result.hasTrendData
        };
        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getCoinBySymbol Error:', {
          message: error.message,
          stack: error.stack,
          params: { symbol, interval, trendLimit }
        });
        return jsonToMarkdown({ error: "Failed to fetch coin data" });
      }
    }
  }),

  getCoinByName: tool({
    description: "Use this when a user mentions a cryptocurrency's full name. Example: 'Show me Bitcoin trends' or 'What's the analysis for Ethereum?'. Returns detailed coin info including marketCap, ATH/ATL, supply metrics, and recent trend data with dates and streaks.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The cryptocurrency's full name (Bitcoin, Ethereum, etc)"
        },
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        trendLimit: {
          type: 'number',
          description: 'Maximum number of trend records to return',
          default: 5
        }
      },
      required: ['name']
    }),
    execute: async ({ name, interval = "1d", trendLimit = 5 }) => {
      try {
        console.log('Tool executed: getCoinByName', { name, interval, trendLimit });

        // Call the socket server API endpoint for name lookup
        const result = await callSocketServer('/api/coin/name', {
          name,
          interval,
          trendLimit
        });

        console.log('getCoinByName - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          coin: result.coin,
          trends: result.trends,
          hasTrendData: result.hasTrendData
        };

        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getCoinByName Error:', {
          message: error.message,
          stack: error.stack,
          params: { name, interval, trendLimit }
        });
        return jsonToMarkdown({ error: "Failed to fetch coin data" });
      }
    }
  }),

  getAllCategories: tool({
    description: "Use this when a user asks for all categories. Returns a list of all unique cryptocurrency categories across all coins in the database.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        // No additional parameters needed
      },
      required: []
    }),
    execute: async () => {
      try {
        console.log('Tool executed: getAllCategories');

        // Call the socket server API endpoint for categories
        const result = await callSocketServer('/api/categories');

        console.log('getAllCategories - Result:', result);

        const categories = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ categories });
      } catch (error) {
        console.error('getAllCategories Error:', {
          message: error.message,
          stack: error.stack
        });
        return jsonToMarkdown({ error: "Failed to fetch categories" });
      }
    }
  }),

  getExtremeTrends: tool({
    description: "Use this when a user asks about fresh or stale trends. 'Fresh' trends are those that just started (streak = 1), while 'stale' trends are those that have been ongoing for a long time (high streak value).",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        type: {
          type: 'string',
          description: "Type of extreme trends to fetch ('fresh' or 'stale')",
          enum: ['fresh', 'stale'],
          default: 'fresh'
        }
      }
    }),
    execute: async ({ interval = "1d", type = "fresh" }) => {
      try {
        console.log('Tool executed: getExtremeTrends', { interval, type });

        // Call the socket server API endpoint for extreme trends
        const result = await callSocketServer('/api/trends/extreme', {
          interval,
          type
        });

        console.log('getExtremeTrends - Result:', result);

        const trends = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ trends });
      } catch (error) {
        console.error('getExtremeTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval, type }
        });
        return jsonToMarkdown({ error: "Failed to fetch extreme trends" });
      }
    }
  }),

  getAlignedTrends: tool({
    description: "Use this when a user asks about coins with aligned trends across all timeframes. Returns coins where the trend direction (UP, DOWN, HODL) is the same across all supported intervals.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        flavor: {
          type: 'string',
          description: 'The trend algorithm flavor to use',
          default: 'CoinRotator'
        }
      }
    }),
    execute: async ({ flavor = "CoinRotator" }) => {
      try {
        console.log('Tool executed: getAlignedTrends', { flavor });

        // Call the socket server API endpoint for aligned trends
        const result = await callSocketServer('/api/trends/aligned', {
          flavor
        });

        console.log('getAlignedTrends - Result:', result);

        const alignedTrends = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ alignedTrends });
      } catch (error) {
        console.error('getAlignedTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { flavor }
        });
        return jsonToMarkdown({ error: "Failed to fetch aligned trends" });
      }
    }
  }),

  getCoinsByCategory: tool({
    description: "Use this when a user asks about coins in a specific category. Returns a list of coins that belong to the specified category.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'The category name to search for'
        }
      },
      required: ['category']
    }),
    execute: async ({ category }) => {
      try {
        console.log('Tool executed: getCoinsByCategory', { category });

        // Call the socket server API endpoint for coins by category
        const result = await callSocketServer('/api/coins/category', {
          category
        });

        console.log('getCoinsByCategory - Result:', result);

        const coins = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ categoryName: category, coins });
      } catch (error) {
        console.error('getCoinsByCategory Error:', {
          message: error.message,
          stack: error.stack,
          params: { category }
        });
        return jsonToMarkdown({ error: "Failed to fetch coins by category" });
      }
    }
  }),

  getMarketHealth: tool({
    description: "Use this when a user asks about overall market health or sentiment. Returns data about the distribution of UP, DOWN, and HODL trends across the market. Returns an object with: date (timestamp), trends (object with counts of UP, HODL, and DOWN trends, e.g. { UP: 103, HODL: 462, DOWN: 409 }), hasExtremes (boolean), and extremes (array of extreme values for each trend).",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        }
      }
    }),
    execute: async ({ interval = "1d" }) => {
      try {
        console.log('Tool executed: getMarketHealth', { interval });

        // Call the socket server API endpoint for market health
        const result = await callSocketServer('/api/market/health', {
          interval
        });

        console.log('getMarketHealth - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          date: result.date,
          trends: result.trends,
          hasExtremes: result.hasExtremes,
          extremes: result.extremes
        };

        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getMarketHealth Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval }
        });
        return jsonToMarkdown({ error: "Failed to fetch market health data" });
      }
    }
  }),

  getMarketHealthCrossing: tool({
    description: "Use this when a user asks about market trend crossings or shifts. Returns information about the most recent crossing where one trend type overtook another.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        }
      }
    }),
    execute: async ({ interval = "1d" }) => {
      try {
        console.log('Tool executed: getMarketHealthCrossing', { interval });

        // Call the socket server API endpoint for market health crossing
        const result = await callSocketServer('/api/market/crossing', {
          interval
        });

        console.log('getMarketHealthCrossing - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          date: result.date,
          overtaking: result.overtaking,
          overtaken: result.overtaken,
          message: result.message
        };

        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getMarketHealthCrossing Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval }
        });
        return jsonToMarkdown({ error: "Failed to fetch market health crossing data" });
      }
    }
  }),

  getCoinById: tool({
    description: "Use this when you have a specific coinId to look up. Returns detailed coin info including marketCap, ATH/ATL, supply metrics, and recent trend data with dates and streaks.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        coinId: {
          type: 'string',
          description: 'The unique identifier of the coin to look up'
        },
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        trendLimit: {
          type: 'number',
          description: 'Maximum number of trend records to return',
          default: 5
        }
      },
      required: ['coinId']
    }),
    execute: async ({ coinId, interval = "1d", trendLimit = 5 }) => {
      try {
        console.log('Tool executed: getCoinById', { coinId, interval, trendLimit });

        // Call the socket server API endpoint for coinId lookup
        const result = await callSocketServer('/api/coin/id', {
          id: coinId,
          interval,
          trendLimit
        });

        console.log('getCoinById - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        const data = {
          coin: result.coin,
          trends: result.trends,
          hasTrendData: result.hasTrendData
        };

        return jsonToMarkdown(data);
      } catch (error) {
        console.error('getCoinById Error:', {
          message: error.message,
          stack: error.stack,
          params: { coinId, interval, trendLimit }
        });
        return jsonToMarkdown({ error: "Failed to fetch coin data" });
      }
    }
  }),

  getRecentTweets: tool({
    description: "Use this when a user asks about recent tweets from a specific Twitter account. Returns the 10 most recent tweets from the specified Twitter handle.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'Twitter username without the @ symbol at the start'
        }
      },
      required: ['handle']
    }),
    execute: async ({ handle }) => {
      try {
        console.log('Tool executed: getRecentTweets', { handle });

        // Call the socket server API endpoint for tweets
        const result = await callSocketServer('/api/twitter/tweets', {
          handle
        });

        console.log('getRecentTweets - Result:', result);

        const tweets = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ handle, tweets });
      } catch (error) {
        console.error('getRecentTweets Error:', {
          message: error.message,
          stack: error.stack,
          params: { handle }
        });
        return jsonToMarkdown({ error: "Failed to fetch tweets" });
      }
    }
  }),

  getFilteredCoins: tool({
    description: "Use this when a user wants to filter coins by criteria like trend direction, market cap, categories, etc. Example: 'Show me uptrend coins in the DeFi category' or 'Find coins with market cap under 100M with strong uptrends'.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        trend: {
          type: 'string',
          description: 'Filter by trend direction: UP, HODL, or DOWN',
          enum: ['UP', 'HODL', 'DOWN']
        },
        categories: {
          type: 'array',
          description: 'Filter by one or more categories (e.g., ["defi", "nft"])',
          items: {
            type: 'string'
          }
        },
        marketCapMin: {
          type: 'number',
          description: 'Minimum market cap in USD'
        },
        marketCapMax: {
          type: 'number',
          description: 'Maximum market cap in USD'
        },
        streakMin: {
          type: 'number',
          description: 'Minimum trend streak length (absolute value)'
        },
        streakMax: {
          type: 'number',
          description: 'Maximum trend streak length (absolute value)'
        },
        exchanges: {
          type: 'array',
          description: 'Filter by one or more exchanges',
          items: {
            type: 'string'
          }
        },
        cexOnly: {
          type: 'boolean',
          description: 'Only include coins listed on centralized exchanges'
        },
        dexOnly: {
          type: 'boolean',
          description: 'Only include coins listed on decentralized exchanges'
        },
        interval: {
          type: 'string',
          description: 'Trend data interval (1d, 4h)',
          default: '1d'
        },
        flavor: {
          type: 'string',
          description: 'Trend algorithm flavor',
          default: 'CoinRotator'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        }
      }
    }),
    execute: async ({ trend, categories, marketCapMin, marketCapMax, streakMin, streakMax,
                     exchanges, cexOnly, dexOnly, interval = "1d", flavor = "CoinRotator", limit = 10 }) => {
      try {
        console.log('Tool executed: getFilteredCoins', {
          trend, categories, marketCapMin, marketCapMax, streakMin, streakMax,
          exchanges, cexOnly, dexOnly, interval, flavor, limit
        });

        // Convert boolean parameters to strings for query params
        const cexOnlyParam = cexOnly === true ? 'true' : undefined;
        const dexOnlyParam = dexOnly === true ? 'true' : undefined;

        // Call the socket server API endpoint for filtered coins
        const coinIds = await callSocketServer('/api/coins/filter', {
          trend,
          categories: Array.isArray(categories) ? categories : undefined,
          marketCapMin,
          marketCapMax,
          streakMin,
          streakMax,
          exchanges: Array.isArray(exchanges) ? exchanges : undefined,
          cexOnly: cexOnlyParam,
          dexOnly: dexOnlyParam,
          interval,
          flavor,
          limit
        });

        console.log('getFilteredCoins - Result:', coinIds);

        // If no coins found, return a helpful message
        if (!Array.isArray(coinIds) || coinIds.length === 0) {
          return jsonToMarkdown({
            message: "No coins match the specified criteria",
            filters: {
              trend,
              categories: Array.isArray(categories) ? categories : undefined,
              marketCapRange: marketCapMin || marketCapMax ? `${marketCapMin || 'min'} to ${marketCapMax || 'max'}` : undefined,
              streakRange: streakMin || streakMax ? `${streakMin || 'min'} to ${streakMax || 'max'}` : undefined,
              exchanges: Array.isArray(exchanges) ? exchanges : undefined,
              cexOnly,
              dexOnly
            }
          });
        }

        // Return the coin IDs with filter details
        return jsonToMarkdown({
          message: `Found ${coinIds.length} coins matching the criteria`,
          filters: {
            trend,
            categories: Array.isArray(categories) ? categories : undefined,
            marketCapRange: marketCapMin || marketCapMax ? `${marketCapMin || 'min'} to ${marketCapMax || 'max'}` : undefined,
            streakRange: streakMin || streakMax ? `${streakMin || 'min'} to ${streakMax || 'max'}` : undefined,
            exchanges: Array.isArray(exchanges) ? exchanges : undefined,
            cexOnly,
            dexOnly
          },
          coinIds
        });
      } catch (error) {
        console.error('getFilteredCoins Error:', {
          message: error.message,
          stack: error.stack,
          params: { trend, categories, marketCapMin, marketCapMax, streakMin, streakMax,
                    exchanges, cexOnly, dexOnly, interval, flavor, limit }
        });
        return jsonToMarkdown({ error: "Failed to filter coins" });
      }
    }
  })
};

const fetchR2FileContents = async (fileName) => {
  const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_AWS_SECRET_ACCESS_KEY
    }
  });
  const { Body } = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_S3_BUCKET,
      Key: fileName
    })
  );

  // Convert ReadableStream to string
  const streamReader = Body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await streamReader.read();
    if (done) break;
    chunks.push(value);
  }

  const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let position = 0;

  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  return new TextDecoder('utf-8').decode(allChunks).trim();
}

const getSystemPrompt = async () => {
  return fetchR2FileContents('toadaiprompt.txt');
}

const getModelId = async () => {
  return fetchR2FileContents('toadaimodelid.txt');
}

export async function POST(req) {
  const { messages, walletAddress, data } = await req.json();
  console.log('Received POST request with messages:', JSON.stringify(messages, null, 2));
  console.log('Request data:', data);

  // Track the AI prompt in Mixpanel
  const userMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (userMessage && userMessage.role === 'user') {
    trackMixpanelEvent('AI Prompt', {
      distinct_id: walletAddress || 'anonymous',
      prompt: userMessage.content,
      messageCount: messages.length,
      time: Math.floor(Date.now() / 1000)
    }).catch(err => console.error('Mixpanel tracking error:', err));
  }

  try {
    console.log('Getting system prompt and model ID...');
    const [systemPrompt, modelId] = await Promise.all([
      getSystemPrompt(),
      getModelId()
    ]);
    console.log('System prompt:', systemPrompt);
    console.log('Model ID:', modelId);

    // Modify the messages array if coinId is present in data or to add timestamp
    let processedMessages = [...messages];
    if (userMessage && userMessage.role === 'user') {
      // Find the last user message
      const lastUserMessageIndex = processedMessages.findIndex(m => m.role === 'user');
      if (lastUserMessageIndex !== -1) {
        let modifiedContent = processedMessages[lastUserMessageIndex].content;

        // Add coinId if present
        if (data?.coinId) {
          modifiedContent = `coinid:${data.coinId} ${modifiedContent}`;
        }

        // Add timestamp (always included from frontend)
        if (data?.timestamp) {
          modifiedContent = `timestamp:${data.timestamp} ${modifiedContent}`;
        }

        // Create a modified copy of the message
        processedMessages[lastUserMessageIndex] = {
          ...processedMessages[lastUserMessageIndex],
          content: modifiedContent
        };

        console.log('Modified user message:', processedMessages[lastUserMessageIndex].content);
      }
    }

    console.log('Starting AI stream...');

    // Create a collection to store all steps for debugging
    const allSteps = [];

    const response = streamText({
      model: anthropic('claude-3-7-sonnet-20250219'),
      tools,
      messages: [
        {
          role: "system",
          content: systemPrompt,
          providerMetadata: {
            anthropic: {
              cacheControl: { type: 'ephemeral' },
            }
          }
        },
        ...processedMessages
      ],
      maxSteps: 10,

      // Keep your existing callbacks
      onFinish(result) {
        console.log('Stream finished:', {
          finishReason: result.finishReason,
          usage: result.usage,
          messageCount: result.messages?.length || 0,
          allSteps: allSteps.length
        });

        // Log any errors
        if (result.finishReason === 'error') {
          console.error('Stream error:', result.error);
        }
      },

      // Add onStepFinish callback to log each step
      onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
        const stepInfo = {
          text,
          toolCalls: toolCalls.map(call => ({
            toolName: call.toolName,
            args: call.args,
            id: call.toolCallId
          })),
          toolResults: toolResults.map(result => ({
            toolCallId: result.toolCallId,
            result: typeof result.result === 'object' ?
              JSON.stringify(result.result).substring(0, 100) + '...' :
              String(result.result).substring(0, 100) + '...'
          })),
          finishReason,
          usage
        };

        allSteps.push(stepInfo);
        console.log('Step finished:', JSON.stringify(stepInfo, null, 2));
      },

      // Add onToolCall callback for more detailed logging
      onToolCall({ toolName, toolCallId, args }) {
        console.log('Tool call initiated:', { toolName, toolCallId, args: JSON.stringify(args) });
        return { toolCallId };
      },

      // Add onToolCallResult callback to log results
      onToolCallResult({ toolName, toolCallId, result }) {
        // Log the result
        console.log('Tool call result:', {
          toolName,
          toolCallId,
          result: typeof result === 'string'
            ? (result.length > 100 ? result.substring(0, 100) + '...' : result)
            : 'Non-string result'
        });

        // No need for the tool-specific handling since we're returning markdown strings directly
      }
    });

    console.log('Stream created, converting to response...');
    const streamResponse = response.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('Stream error in response:', error);

        // Add more specific handling for type validation errors
        if (error.name === 'AI_TypeValidationError') {
          console.error('Type validation error details:', error.cause);
          return "There was an error processing the AI response format. Please try again with a different query.";
        }

        // Return a user-friendly error message based on error type
        if (error.name === 'NoSuchToolError') {
          return "The AI tried to use a tool that doesn't exist. Please try again with a different query.";
        } else if (error.name === 'InvalidToolArgumentsError') {
          return "The AI provided invalid arguments to a tool. Please try again with a more specific query.";
        } else if (error.name === 'ToolExecutionError') {
          return "There was an error executing the tool. Please try again later.";
        } else {
          return "An error occurred while processing your request. Please try again later.";
        }
      }
    });

    console.log('Returning stream response...');
    return streamResponse;

  } catch(e) {
    console.error('API Error:', {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause
    });

    // Return a more detailed error response
    return new Response(JSON.stringify({
      error: 'Server error',
      message: e.message,
      type: e.name,
      details: process.env.NODE_ENV === 'development' ? {
        stack: e.stack,
        cause: e.cause
      } : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}