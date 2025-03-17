import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool, jsonSchema } from 'ai';

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

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

// Replace the database helper with a function to call the socket server
const callSocketServer = async (endpoint, params = {}) => {
  const url = new URL(endpoint, process.env.NEXT_PUBLIC_SOCKET_SERVER_URL);

  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
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
          data.trendStatus = "No trend data available for this coin";
          data.hasTrendData = false;
        } else if (data.trends.length > 0) {
          data.hasTrendData = true;
          data.trendStatus = `Found ${data.trends.length} trend records`;
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
          return { error: result.error };
        }

        return {
          coin: result.coin,
          trends: result.trends,
          trendStatus: result.trendStatus,
          hasTrendData: result.hasTrendData
        };
      } catch (error) {
        console.error('getCoinByContract Error:', {
          message: error.message,
          stack: error.stack,
          params: { contractAddress, chain, interval, trendLimit }
        });
        return { error: "Failed to fetch coin data" };
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
          return { error: result.error };
        }

        return {
          coin: result.coin,
          trends: result.trends,
          trendStatus: result.trendStatus,
          hasTrendData: result.hasTrendData
        };
      } catch (error) {
        console.error('getCoinBySymbol Error:', {
          message: error.message,
          stack: error.stack,
          params: { symbol, interval, trendLimit }
        });
        return { error: "Failed to fetch coin data" };
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
          return { error: result.error };
        }

        return {
          coin: result.coin,
          trends: result.trends,
          trendStatus: result.trendStatus,
          hasTrendData: result.hasTrendData
        };
      } catch (error) {
        console.error('getCoinByName Error:', {
          message: error.message,
          stack: error.stack,
          params: { name, interval, trendLimit }
        });
        return { error: "Failed to fetch coin data" };
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

        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('getAllCategories Error:', {
          message: error.message,
          stack: error.stack
        });
        return { error: "Failed to fetch categories" };
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

        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('getExtremeTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval, type }
        });
        return { error: "Failed to fetch extreme trends" };
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

        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('getAlignedTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { flavor }
        });
        return { error: "Failed to fetch aligned trends" };
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

        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('getCoinsByCategory Error:', {
          message: error.message,
          stack: error.stack,
          params: { category }
        });
        return { error: "Failed to fetch coins by category" };
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
          return { error: result.error };
        }

        return {
          date: result.date,
          trends: result.trends,
          hasExtremes: result.hasExtremes,
          extremes: result.extremes
        };
      } catch (error) {
        console.error('getMarketHealth Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval }
        });
        return { error: "Failed to fetch market health data" };
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
          return { error: result.error };
        }

        return {
          date: result.date,
          overtaking: result.overtaking,
          overtaken: result.overtaken,
          message: result.message
        };
      } catch (error) {
        console.error('getMarketHealthCrossing Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval }
        });
        return { error: "Failed to fetch market health crossing data" };
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
          coinId,
          interval,
          trendLimit
        });

        console.log('getCoinById - Result:', result);

        if (result.error) {
          return { error: result.error };
        }

        return {
          coin: result.coin,
          trends: result.trends,
          trendStatus: result.trendStatus,
          hasTrendData: result.hasTrendData
        };
      } catch (error) {
        console.error('getCoinById Error:', {
          message: error.message,
          stack: error.stack,
          params: { coinId, interval, trendLimit }
        });
        return { error: "Failed to fetch coin data" };
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

        // Ensure we always return an array
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('getRecentTweets Error:', {
          message: error.message,
          stack: error.stack,
          params: { handle }
        });
        return { error: "Failed to fetch tweets" };
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
    await trackMixpanelEvent('AI Prompt', {
      distinct_id: walletAddress || 'anonymous',
      prompt: userMessage.content,
      messageCount: messages.length,
      time: Math.floor(Date.now() / 1000)
    });
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
      model: openrouter(modelId),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...processedMessages
      ],
      tools,
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
        // Ensure the result is in the expected format
        if (toolName.startsWith('getCoinBy') && result) {
          // Make sure trends is always an array
          if (!result.trends || !Array.isArray(result.trends)) {
            result.trends = [];
          }

          // Ensure all properties have the expected types
          result.hasTrendData = !!result.trends.length;
          result.trendStatus = result.trends.length > 0
            ? `Found ${result.trends.length} trend records`
            : "No trend data available for this coin";

          console.log('Tool call result:', { toolName, toolCallId, result });
        }

        // Handle array results for list-based tools
        if (['getAllCategories', 'getExtremeTrends', 'getAlignedTrends', 'getCoinsByCategory'].includes(toolName)) {
          // Ensure result is always an array
          if (!Array.isArray(result)) {
            result = [];
          }

          console.log('Tool call result:', { toolName, toolCallId, resultCount: result.length });
        }

        // Handle market health tools
        if (toolName === 'getMarketHealth' && result && !result.error) {
          // Ensure trends object exists
          if (!result.trends) {
            result.trends = { UP: 0, HODL: 0, DOWN: 0 };
          }

          // Ensure extremes is an array
          if (!Array.isArray(result.extremes)) {
            result.extremes = [];
          }

          console.log('Tool call result:', { toolName, toolCallId, result });
        }

        // Handle market health crossing tool
        if (toolName === 'getMarketHealthCrossing' && result && !result.error) {
          // Add a formatted message if not present
          if (!result.message && result.overtaking && result.overtaken) {
            result.message = `${result.overtaking} trend overtook ${result.overtaken} trend on ${new Date(result.date).toLocaleDateString()}`;
          }

          console.log('Tool call result:', { toolName, toolCallId, result });
        }

        // Add special handling for empty trends
        if (toolName.startsWith('getCoinBy') &&
            result &&
            result.trends &&
            Array.isArray(result.trends) &&
            result.trends.length === 0) {
          console.log('Empty trends detected, adding placeholder data');
        }

        // For any other tools or if not handled above
        if (!toolName.startsWith('getCoinBy') &&
            !['getAllCategories', 'getExtremeTrends', 'getAlignedTrends', 'getCoinsByCategory', 'getMarketHealth', 'getMarketHealthCrossing'].includes(toolName)) {
          console.log('Tool call result:', {
            toolName,
            toolCallId,
            result: typeof result === 'object' ?
              JSON.stringify(result).substring(0, 100) + '...' :
              String(result).substring(0, 100) + '...'
          });
        }
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