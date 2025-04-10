import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { anthropic } from '@ai-sdk/anthropic';
import { vertex } from '@ai-sdk/google-vertex/edge';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool, jsonSchema } from 'ai';
import { Converter } from '@memochou1993/json2markdown';
import Exa from "exa-js"

// Hardcoded because of ENV newline issue
process.env.GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC7reXGCX4qCHvG\n6Z9RDOvOE/ip5wHCCa/eRTNvtwtQ9hdJDzP4nD3qMo4Ybgq/4NQBAXwo9DVX9zSk\nLl3Kme5XZvXEh26Xhz657nDiqT6JVJ4oPemNQrWuk7oZ4xbs2gM0ygx+jh3hQLW0\ni1dz1aS+vrF+LvNbdStnde/5TRSZV16dc8Imla34j/DpIn5osb+I/7hYJF314S4B\nZbwN5Dt5vzW0fBEhF4L9atntPNFQlPlvSYyv2RY7Gr0M5TTca3U0d/intZ1GiJps\nDewjxaoSjcQ3gAmBlMfPdKr7CHQu/buOdGohrs/uUhEFxBCcFA71EtuFJiQf+v/I\n3XgLjNgNAgMBAAECgf9CxjG6WXufTjq7yuNO3bSy3ZLbixVVCZ1JDStVKWByrcbF\nzQ2bUVELbRv2v9rolKrZW23mzvyBD7NAYZQn7Byg0ZZ1Fg/YWduMy7PeRoO5g3cX\nWkUpEqhm31NCDUoFezZ+Jw/K90V/n0ZcYOH8lJweQZAPv89V+u+LyqpW84B2DcMq\nxttBmYiaqaWd8/ZZN/kxcdM5gWOWOgJPBo5zhSSkU3/+hJ+vNSGPPpCW3tFsIi8E\ngHf8DS5i5gtxllLt8Ypt4DgFtjrfHNl3A5wf5CxBa5/WupI6ZhdLvRvM+FfpNAss\ngILf+rmN2PXMVB77CDE4g/BEmHFJE+yvvlatRgECgYEA8T2e1aNDMnw+TnODN93x\nREGnZlLBfaqKogGVQ6dUtjTeDPEoaP/Zt7LQoIebj42r0T8dOkQxbXPeWH6fuTSW\n5zvkNKAtxWTTAQL94TV1OtD2TxPxV14JaSQWW9QwGhe98r8TueWHyGkqU38+v5FO\naK9WnUCuuz1XjAqm9fETjgECgYEAxyliF0gwLK8PlQaObFcvEH02EsZjulNx6koy\nwJrPblQwoPP+Tdr7U47gI9kMFhOeJLf3bWTOTsd643n9/z02Tp8bMinr2Q17XEuz\nUQpqxJEynO4ZmxKH5YAMXgfxAiAEp6mKU9SnkZ1PhG91Yfk+fQrU21V3/T7c8qYV\npbGyog0CgYEAgMLHGHh/0V6HUxBMpXEM6cWxN+hL5ms0e6wko2uYx3gIXRgK3aBR\n8L68pDI9Ua3oW1M4onTrfOQvdUSAtDXhpaJN99jXFVjvVsbmA2KpI6+NCEA4vM0w\ncLIWTQVAd2zcschTGxHsG4gmU1LDhzRjiXSs4lo36TCgndrBqtv1+AECgYAsewyi\nYIgJ4stbIEy827fyOdTS2qY5XhuqFQpCxBCh9oGp4PSiFM9e+SEMQJSXdagzUTcc\nopAFPj4vAfb9g4FWi+h6CqzXHFC561pQNkBkSH2CWRc08C2Tz0Zz1dg4/ker3oy7\nblpChlzVGkOgLxeKu9mQZwVWdSzJsNhS2l4oHQKBgD4DjX/9alefFH4nGJ+lGl8s\n4i8Gw9lhMuhHpl1y1dCu5oPO5luVUTtcLnlsjOfd6YVAvb2Un7XN9Cl+fYgiBgW0\nJh95SMU8ryhQaa3109KqQAlI2eu6z3ubq93/BaKy5oRS18AJ+fKfhgUGKX1YOydu\nEz33m6tbTHD/abdmZPNE\n-----END PRIVATE KEY-----\n`;

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
  const url = new URL(endpoint, process.env.AI_SERVER_URL);

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
  exaSearch: tool({
    description: "Use this to search the web for information using the Exa API. Useful for finding current information or researching topics that aren't covered by the system's knowledge.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find information on the web'
        },
        useAutoprompt: {
          type: 'boolean',
          description: 'Whether to use Exa\'s autoprompt feature to improve the search query',
          default: false
        },
        numResults: {
          type: 'number',
          description: 'Number of search results to return',
          default: 5
        },
        startPublishedDate: {
          type: 'string',
          description: 'Filter for content published after this date (YYYY-MM-DD)',
        },
        endPublishedDate: {
          type: 'string',
          description: 'Filter for content published before this date (YYYY-MM-DD)',
        },
        includeDomains: {
          type: 'array',
          description: 'List of domains to include in the search results',
          items: {
            type: 'string'
          }
        },
        excludeDomains: {
          type: 'array',
          description: 'List of domains to exclude from the search results',
          items: {
            type: 'string'
          }
        }
      },
      required: ['query']
    }),
    execute: async ({ query, useAutoprompt = false, numResults = 5, startPublishedDate, endPublishedDate, includeDomains, excludeDomains }) => {
      try {
        console.log('Tool executed: exaSearch', {
          query,
          useAutoprompt,
          numResults,
          startPublishedDate,
          endPublishedDate,
          includeDomains,
          excludeDomains
        });

        // Initialize the Exa client with API key from environment
        const exa = new Exa(process.env.EXA_API_KEY);

        // Build search options
        const searchOptions = {
          numResults,
          useAutoprompt
        };

        // Add optional parameters if provided
        if (startPublishedDate) searchOptions.startPublishedDate = startPublishedDate;
        if (endPublishedDate) searchOptions.endPublishedDate = endPublishedDate;
        if (includeDomains && includeDomains.length > 0) searchOptions.includeDomains = includeDomains;
        if (excludeDomains && excludeDomains.length > 0) searchOptions.excludeDomains = excludeDomains;

        // Execute the search
        const searchResult = await exa.search(query, searchOptions);
        console.log('exaSearch - Result count:', searchResult.results?.length || 0);

        // Format the results for display
        const formattedResults = searchResult.results?.map(result => ({
          title: result.title,
          url: result.url,
          publishedDate: result.publishedDate,
          score: result.score,
          snippet: result.text || result.extract
        })) || [];

        return jsonToMarkdown({
          query,
          results: formattedResults
        });
      } catch (error) {
        console.error('exaSearch Error:', {
          message: error.message,
          stack: error.stack,
          params: { query, useAutoprompt, numResults }
        });
        return jsonToMarkdown({ error: "Failed to perform web search" });
      }
    }
  }),

  exaSearchWithContents: tool({
    description: "Search the web and retrieve full text contents of the search results in a single operation. Useful when you need more context from search results beyond just snippets.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find information on the web'
        },
        useAutoprompt: {
          type: 'boolean',
          description: 'Whether to use Exa\'s autoprompt feature to improve the search query',
          default: false
        },
        numResults: {
          type: 'number',
          description: 'Number of search results to return',
          default: 3
        },
        includeDomains: {
          type: 'array',
          description: 'List of domains to include in the search results',
          items: {
            type: 'string'
          }
        },
        retrieveText: {
          type: 'boolean',
          description: 'Whether to retrieve full text of the search results',
          default: true
        },
        retrieveHighlights: {
          type: 'boolean',
          description: 'Whether to retrieve highlights relevant to the query',
          default: false
        },
        maxCharacters: {
          type: 'number',
          description: 'Maximum number of characters to retrieve for each result',
          default: 5000
        }
      },
      required: ['query']
    }),
    execute: async ({ query, useAutoprompt = false, numResults = 3, includeDomains, retrieveText = true, retrieveHighlights = false, maxCharacters = 5000 }) => {
      try {
        console.log('Tool executed: exaSearchWithContents', {
          query,
          useAutoprompt,
          numResults,
          includeDomains,
          retrieveText,
          retrieveHighlights
        });

        // Initialize the Exa client with API key from environment
        const exa = new Exa(process.env.EXA_API_KEY);

        // Set up search options
        const searchOptions = {
          useAutoprompt,
          numResults
        };

        if (includeDomains && includeDomains.length > 0) searchOptions.includeDomains = includeDomains;

        // Set up contents options
        const contentsOptions = {};

        if (retrieveText) {
          contentsOptions.text = {
            maxCharacters
          };
        }

        if (retrieveHighlights) {
          contentsOptions.highlights = {
            highlightsPerUrl: 3,
            numSentences: 2,
            query
          };
        }

        // Execute the search and retrieve contents
        const result = await exa.searchAndContents(query, {
          ...searchOptions,
          ...contentsOptions
        });

        console.log('exaSearchWithContents - Result count:', result.results?.length || 0);

        // Format the results for display
        const formattedResults = result.results?.map(result => {
          const formattedResult = {
            title: result.title,
            url: result.url,
            publishedDate: result.publishedDate,
            score: result.score
          };

          // Add text content if available
          if (result.text) {
            formattedResult.content = result.text.slice(0, maxCharacters);
            if (result.text.length > maxCharacters) {
              formattedResult.content += '... (content truncated)';
            }
          }

          // Add highlights if available
          if (result.highlights && result.highlights.length > 0) {
            formattedResult.highlights = result.highlights;
          }

          return formattedResult;
        }) || [];

        return jsonToMarkdown({
          query,
          results: formattedResults
        });
      } catch (error) {
        console.error('exaSearchWithContents Error:', {
          message: error.message,
          stack: error.stack,
          params: { query, useAutoprompt, numResults, retrieveText, retrieveHighlights }
        });
        return jsonToMarkdown({ error: "Failed to perform web search with contents" });
      }
    }
  }),

  exaAnswer: tool({
    description: "Generate an answer to a question using Exa's search and answer capabilities with citations to source material. Best for factual questions that require up-to-date information.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to answer'
        },
        model: {
          type: 'string',
          description: 'The model to use for generating the answer',
          enum: ['exa', 'exa-pro'],
          default: 'exa'
        },
        retrieveText: {
          type: 'boolean',
          description: 'Whether to include the full text of cited sources in the response',
          default: false
        }
      },
      required: ['question']
    }),
    execute: async ({ question, model = 'exa', retrieveText = false }) => {
      try {
        console.log('Tool executed: exaAnswer', {
          question,
          model,
          retrieveText
        });

        // Initialize the Exa client with API key from environment
        const exa = new Exa(process.env.EXA_API_KEY);

        // Set options
        const options = {
          model,
          text: retrieveText
        };

        // Generate answer
        const answerResult = await exa.answer(question, options);
        console.log('exaAnswer - Generated answer with citations');

        // Format the result
        const formattedResult = {
          question,
          answer: answerResult.answer
        };

        // Include citations if available
        if (answerResult.citations && answerResult.citations.length > 0) {
          formattedResult.citations = answerResult.citations.map(citation => ({
            title: citation.title,
            url: citation.url,
            text: citation.text
          }));
        }

        return jsonToMarkdown(formattedResult);
      } catch (error) {
        console.error('exaAnswer Error:', {
          message: error.message,
          stack: error.stack,
          params: { question, model, retrieveText }
        });
        return jsonToMarkdown({ error: "Failed to generate answer from Exa" });
      }
    }
  }),

  exaFindSimilar: tool({
    description: "Find web content similar to a specific URL. Useful for discovering related articles, research, or alternative viewpoints on a topic.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to find similar content for'
        },
        numResults: {
          type: 'number',
          description: 'Number of similar results to return',
          default: 5
        },
        excludeSourceDomain: {
          type: 'boolean',
          description: 'Whether to exclude results from the same domain as the source URL',
          default: true
        },
        retrieveText: {
          type: 'boolean',
          description: 'Whether to retrieve the full text of similar results',
          default: false
        }
      },
      required: ['url']
    }),
    execute: async ({ url, numResults = 5, excludeSourceDomain = true, retrieveText = false }) => {
      try {
        console.log('Tool executed: exaFindSimilar', {
          url,
          numResults,
          excludeSourceDomain,
          retrieveText
        });

        // Initialize the Exa client with API key from environment
        const exa = new Exa(process.env.EXA_API_KEY);

        // Set options
        const options = {
          numResults,
          excludeSourceDomain
        };

        let result;
        // Decide whether to get contents along with similar URLs
        if (retrieveText) {
          result = await exa.findSimilarAndContents(url, {
            ...options,
            text: true
          });
        } else {
          result = await exa.findSimilar(url, options);
        }

        console.log('exaFindSimilar - Result count:', result.results?.length || 0);

        // Format the results
        const formattedResults = result.results?.map(result => {
          const formattedResult = {
            title: result.title,
            url: result.url,
            publishedDate: result.publishedDate,
            score: result.score,
            snippet: result.extract || result.text?.substring(0, 200) + '...'
          };

          // Add full text if requested and available
          if (retrieveText && result.text) {
            formattedResult.content = result.text;
          }

          return formattedResult;
        }) || [];

        return jsonToMarkdown({
          sourceUrl: url,
          similarResults: formattedResults
        });
      } catch (error) {
        console.error('exaFindSimilar Error:', {
          message: error.message,
          stack: error.stack,
          params: { url, numResults, excludeSourceDomain, retrieveText }
        });
        return jsonToMarkdown({ error: "Failed to find similar content" });
      }
    }
  }),

  getCoinByContract: tool({
    description: "Use this when a user asks about a specific blockchain contract address. Returns coin metadata, trend history with streaks, and band-based support/resistance zones.",
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

        return jsonToMarkdown(result);
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
    description: "Use this when a user mentions a crypto symbol/ticker. Example: 'What's the trend for BTC?' or 'Show ETH analysis'. Returns coin metadata, trend history with streaks, and band-based support/resistance zones.",
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

        return jsonToMarkdown(result);
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
    description: "Use this when a user mentions a cryptocurrency's full name. Example: 'Show me Bitcoin trends' or 'What's the analysis for Ethereum?'. Returns coin metadata, trend history with streaks, and band-based support/resistance zones.",
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

        return jsonToMarkdown(result);
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
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        },
        coinNames: {
          type: 'array',
          description: 'Filter results to only include these specific coins',
          items: {
            type: 'string'
          }
        }
      }
    }),
    execute: async ({ interval = "1d", type = "fresh", limit = 10, coinNames }) => {
      try {
        console.log('Tool executed: getExtremeTrends', { interval, type, limit, coinNames });

        // Call the socket server API endpoint for extreme trends
        const result = await callSocketServer('/api/trends/extreme', {
          interval,
          type,
          limit,
          coinNames
        });

        console.log('getExtremeTrends - Result:', result);

        const trends = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ trends });
      } catch (error) {
        console.error('getExtremeTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { interval, type, limit, coinNames }
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
        },
        intervals: {
          type: 'array',
          description: 'Array of intervals to check for trend alignment. If omitted, all intervals will be checked.',
          items: {
            type: 'string'
          }
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        },
        coinNames: {
          type: 'array',
          description: 'Filter results to only include these specific coins',
          items: {
            type: 'string'
          }
        }
      }
    }),
    execute: async ({ flavor = "CoinRotator", intervals, limit = 10, coinNames }) => {
      try {
        console.log('Tool executed: getAlignedTrends', { flavor, intervals, limit, coinNames });

        // Call the socket server API endpoint for aligned trends
        const result = await callSocketServer('/api/trends/aligned', {
          flavor,
          intervals,
          limit,
          coinNames
        });

        console.log('getAlignedTrends - Result:', result);

        const alignedTrends = Array.isArray(result) ? result : [];

        return jsonToMarkdown({ alignedTrends });
      } catch (error) {
        console.error('getAlignedTrends Error:', {
          message: error.message,
          stack: error.stack,
          params: { flavor, intervals, limit, coinNames }
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
    description: "Use this when a user asks about overall market health or sentiment. Returns data about the distribution of UP, DOWN, and HODL trends across the market. Returns an object with: date (timestamp), trends (object with counts of UP, HODL, and DOWN trends, e.g. { UP: 103, HODL: 462, DOWN: 409 }), extremes (array of extreme values for each trend).",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        interval: {
          type: 'string',
          description: 'Trend data interval',
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
    description: "Use this when you have a specific coinId to look up. Returns coin metadata, trend history with streaks, and band-based support/resistance zones.",
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

        return jsonToMarkdown(result);
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
  }),

  globalMarketData: tool({
    description: "Use this when a user asks about global cryptocurrency market data. Returns the latest global market statistics including totalMarketCap (total cryptocurrency market capitalization), totalMarketVolume (24h trading volume), and marketCapPercentage (dominance percentages of top cryptocurrencies like Bitcoin).",
    parameters: jsonSchema({
      type: 'object',
      properties: {},
      required: []
    }),
    execute: async () => {
      try {
        console.log('Tool executed: globalMarketData');

        // Call the socket server API endpoint for global market data
        const result = await callSocketServer('/api/global/market');

        console.log('globalMarketData - Result:', result);

        if (result.error) {
          return jsonToMarkdown({ error: result.error });
        }

        return jsonToMarkdown(result);
      } catch (error) {
        console.error('globalMarketData Error:', {
          message: error.message,
          stack: error.stack
        });
        return jsonToMarkdown({ error: "Failed to fetch global market data" });
      }
    }
  }),

  batchParallel: tool({
    description: "Execute multiple operations in parallel to save time. Great for analyzing multiple coins at once, comparing different timeframes, or gathering varied market data in a single request. Use this when you need to perform multiple similar operations (like checking several coins) or want to collect different types of related data simultaneously.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          description: 'Array of operations to execute in parallel',
          items: {
            type: 'object',
            properties: {
              tool: {
                type: 'string',
                description: 'Name of the tool to execute (e.g., "getCoinBySymbol", "getMarketHealth")'
              },
              args: {
                type: 'object',
                description: 'Arguments to pass to the tool'
              },
              label: {
                type: 'string',
                description: 'Optional label to identify this operation in the results'
              }
            },
            required: ['tool', 'args']
          }
        }
      },
      required: ['operations']
    }),
    execute: async ({ operations }) => {
      try {
        console.log('Tool executed: batchParallel', {
          operationCount: operations.length,
          operations: operations.map(op => ({ tool: op.tool, label: op.label }))
        });

        if (!Array.isArray(operations) || operations.length === 0) {
          return jsonToMarkdown({ error: "No operations provided" });
        }

        // Validate operations
        for (const op of operations) {
          if (!op.tool || !tools[op.tool]) {
            return jsonToMarkdown({
              error: `Invalid tool specified: ${op.tool}`,
              availableTools: Object.keys(tools).filter(t => t !== 'batchParallel')
            });
          }
        }

        // Execute all operations in parallel
        const results = await Promise.all(
          operations.map(async (op) => {
            try {
              // Get the tool's execute function
              const toolFn = tools[op.tool].execute;
              if (!toolFn) {
                return {
                  label: op.label || op.tool,
                  error: `Tool ${op.tool} does not have an execute function`
                };
              }

              // Execute the tool with the provided arguments
              const result = await toolFn(op.args || {});
              return {
                label: op.label || op.tool,
                tool: op.tool,
                args: op.args,
                result
              };
            } catch (error) {
              console.error(`Error executing operation ${op.tool}:`, error);
              return {
                label: op.label || op.tool,
                tool: op.tool,
                args: op.args,
                error: error.message || "Operation failed"
              };
            }
          })
        );

        console.log('batchParallel - Completed all operations:', results.length);

        // Return the combined results
        return jsonToMarkdown({
          batchResults: results.map(r => ({
            label: r.label,
            tool: r.tool,
            result: r.result || r.error
          }))
        });
      } catch (error) {
        console.error('batchParallel Error:', {
          message: error.message,
          stack: error.stack
        });
        return jsonToMarkdown({ error: "Failed to execute batch operations" });
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
  return fetchR2FileContents('playground-toadaiprompt.txt');
}

const getServerProvider = async () => {
  return fetchR2FileContents('playground-toadaiserverprovider.txt');
}

const getModelId = async () => {
  return fetchR2FileContents('playground-toadaimodelid.txt');
}

const getVertexModelId = async () => {
  return fetchR2FileContents('playground-vertex-toadaimodelid.txt');
}

export async function POST(req) {
  const { messages, walletAddress, data } = await req.json();
  console.log('Received POST request with messages:', JSON.stringify(messages, null, 2));
  console.log('Request data:', data);

  // Track the AI prompt in Mixpanel
  const userMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  // if (userMessage && userMessage.role === 'user') {
  //   trackMixpanelEvent('AI Prompt', {
  //     distinct_id: walletAddress || 'anonymous',
  //     prompt: userMessage.content,
  //     messageCount: messages.length,
  //     time: Math.floor(Date.now() / 1000)
  //   }).catch(err => console.error('Mixpanel tracking error:', err));
  // }

  try {
    console.log('Getting system prompt and model ID...');
    const [systemPrompt, serverProvider, modelId, vertexModelId] = await Promise.all([
      getSystemPrompt(),
      getServerProvider(),
      getModelId(),
      getVertexModelId()
    ]);
    console.log('Server Provider:', serverProvider);
    console.log('Model ID:', modelId);
    console.log('Vertex Model ID:', vertexModelId);
    // Modify the messages array if coinId is present in data or to add timestamp
    let processedMessages = [...messages];
    if (userMessage && userMessage.role === 'user') {
      // Find the last user message
      const lastUserMessageIndex = processedMessages.findIndex(m => m.role === 'user');
      if (lastUserMessageIndex !== -1) {
        let modifiedContent = processedMessages[lastUserMessageIndex].content;

        // Add coinId if present
        if (data?.coinId) {
          modifiedContent = `coinid:${data.coinId} | ${modifiedContent}`;
        }

        // Add timestamp (always included from frontend)
        if (data?.timestamp) {
          modifiedContent = `Current date and time (ISO 8601 format, UTC-based): ${data.timestamp} | ${modifiedContent}`;
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
    let model;

    let providerMetadata = {};
    if (serverProvider === 'anthropic') {
      console.log('Using Anthropic model:', modelId);
      model = anthropic(modelId);
      providerMetadata = {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else if (serverProvider === 'vertex') {
      console.log('Using Vertex model:', vertexModelId);
      model = vertex(vertexModelId);
      providerMetadata = {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else if (serverProvider === 'openrouter') {
      console.log('Using OpenRouter model: anthropic/claude-3.7-sonnet');
      model = openrouter('anthropic/claude-3.7-sonnet')
      providerMetadata = {
        openrouter: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else {
      throw new Error(`Unsupported AI provider: ${serverProvider}`);
    }

    const response = streamText({
      model,
      tools,
      messages: [
        {
          role: "system",
          content: systemPrompt,
          providerMetadata
        },
        ...processedMessages
      ],
      maxSteps: 50,

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
      },

      onError(error) {
        console.error('Stream error:', error);
      }
    });

    console.log('Stream created, converting to response...');
    const streamResponse = response.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('Stream error in response:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });

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