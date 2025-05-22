import { anthropic } from '@ai-sdk/anthropic';
import { vertex } from '@ai-sdk/google-vertex/edge';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, jsonSchema, generateObject } from 'ai';
import Exa from "exa-js"
import { SUPPORTED_INTERVALS } from 'coinrotator-utils/variables.mjs'
import { z } from 'zod';

// Hardcoded because of ENV newline issue
process.env.GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC7reXGCX4qCHvG\n6Z9RDOvOE/ip5wHCCa/eRTNvtwtQ9hdJDzP4nD3qMo4Ybgq/4NQBAXwo9DVX9zSk\nLl3Kme5XZvXEh26Xhz657nDiqT6JVJ4oPemNQrWuk7oZ4xbs2gM0ygx+jh3hQLW0\ni1dz1aS+vrF+LvNbdStnde/5TRSZV16dc8Imla34j/DpIn5osb+I/7hYJF314S4B\nZbwN5Dt5vzW0fBEhF4L9atntPNFQlPlvSYyv2RY7Gr0M5TTca3U0d/intZ1GiJps\nDewjxaoSjcQ3gAmBlMfPdKr7CHQu/buOdGohrs/uUhEFxBCcFA71EtuFJiQf+v/I\n3XgLjNgNAgMBAAECgf9CxjG6WXufTjq7yuNO3bSy3ZLbixVVCZ1JDStVKWByrcbF\nzQ2bUVELbRv2v9rolKrZW23mzvyBD7NAYZQn7Byg0ZZ1Fg/YWduMy7PeRoO5g3cX\nWkUpEqhm31NCDUoFezZ+Jw/K90V/n0ZcYOH8lJweQZAPv89V+u+LyqpW84B2DcMq\nxttBmYiaqaWd8/ZZN/kxcdM5gWOWOgJPBo5zhSSkU3/+hJ+vNSGPPpCW3tFsIi8E\ngHf8DS5i5gtxllLt8Ypt4DgFtjrfHNl3A5wf5CxBa5/WupI6ZhdLvRvM+FfpNAss\ngILf+rmN2PXMVB77CDE4g/BEmHFJE+yvvlatRgECgYEA8T2e1aNDMnw+TnODN93x\nREGnZlLBfaqKogGVQ6dUtjTeDPEoaP/Zt7LQoIebj42r0T8dOkQxbXPeWH6fuTSW\n5zvkNKAtxWTTAQL94TV1OtD2TxPxV14JaSQWW9QwGhe98r8TueWHyGkqU38+v5FO\naK9WnUCuuz1XjAqm9fETjgECgYEAxyliF0gwLK8PlQaObFcvEH02EsZjulNx6koy\nwJrPblQwoPP+Tdr7U47gI9kMFhOeJLf3bWTOTsd643n9/z02Tp8bMinr2Q17XEuz\nUQpqxJEynO4ZmxKH5YAMXgfxAiAEp6mKU9SnkZ1PhG91Yfk+fQrU21V3/T7c8qYV\npbGyog0CgYEAgMLHGHh/0V6HUxBMpXEM6cWxN+hL5ms0e6wko2uYx3gIXRgK3aBR\n8L68pDI9Ua3oW1M4onTrfOQvdUSAtDXhpaJN99jXFVjvVsbmA2KpI6+NCEA4vM0w\ncLIWTQVAd2zcschTGxHsG4gmU1LDhzRjiXSs4lo36TCgndrBqtv1+AECgYAsewyi\nYIgJ4stbIEy827fyOdTS2qY5XhuqFQpCxBCh9oGp4PSiFM9e+SEMQJSXdagzUTcc\nopAFPj4vAfb9g4FWi+h6CqzXHFC561pQNkBkSH2CWRc08C2Tz0Zz1dg4/ker3oy7\nblpChlzVGkOgLxeKu9mQZwVWdSzJsNhS2l4oHQKBgD4DjX/9alefFH4nGJ+lGl8s\n4i8Gw9lhMuhHpl1y1dCu5oPO5luVUTtcLnlsjOfd6YVAvb2Un7XN9Cl+fYgiBgW0\nJh95SMU8ryhQaa3109KqQAlI2eu6z3ubq93/BaKy5oRS18AJ+fKfhgUGKX1YOydu\nEz33m6tbTHD/abdmZPNE\n-----END PRIVATE KEY-----\n`;

export const runtime = 'edge';
export const preferredRegion = ['sfo1', 'fra1', 'sin1'];

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

// Function to report errors to the API server for Bugsnag tracking
const reportErrorToServer = async (error, context = {}) => {
  try {
    console.log('Reporting error to API server:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause ? {
          name: error.cause.name,
          message: error.cause.message,
          stack: error.cause.stack
        } : undefined
      },
      context,
      timestamp: new Date().toISOString()
    };

    // Use the same base URL as other API calls
    const url = new URL('/api/errors/report', process.env.AI_SERVER_URL);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(errorData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error reporting API returned ${response.status}: ${errorText}`);
    } else {
      console.log('Error successfully reported to API server');
    }
  } catch (reportingError) {
    // Don't throw here, just log - we don't want error reporting to cause more errors
    console.error('Failed to report error to API server:', reportingError);
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

// Define tools first
const tools = {
  getCurrentMarketVibe: tool({
    description: "Get the current market vibe. Returns the latest summary message.",
    parameters: jsonSchema({
      type: 'object',
      properties: {},
      required: []
    }),
    execute: async () => {
      try {
        console.log('Tool executed: getCurrentMarketVibe');
        const url = new URL('/api/alpha/messages', process.env.AI_SERVER_URL);
        url.searchParams.append('channelName', 'summary');
        url.searchParams.append('limit', '1');
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`AI server returned ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].message) {
          return data[0].message;
        } else {
          return 'No market vibe message available.';
        }
      } catch (error) {
        throw(error)
      }
    }
  }),
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

        return { query, results: formattedResults };
      } catch (error) {
        throw(error)
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

        return { query, results: formattedResults };
      } catch (error) {
        throw(error)
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

        return formattedResult;
      } catch (error) {
        throw(error)
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

        return { sourceUrl: url, similarResults: formattedResults };
      } catch (error) {
        throw(error)
      }
    }
  }),

  getCoinByContract: tool({
    description: "Use this when a user asks about a specific blockchain contract address. Returns coin metadata (including futures data as open Interest, futures volume of the last 24 hours and funding rate), trend history with streaks, and band-based support/resistance zones.",
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
          throw(error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getCoinBySymbol: tool({
    description: "Use this when a user mentions a crypto symbol/ticker. Example: 'What's the trend for BTC?' or 'Show ETH analysis'. Returns coin metadata (including futures data as open Interest, futures volume of the last 24 hours and funding rate), trend history with streaks, and band-based support/resistance zones.",
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
          throw(error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getCoinByName: tool({
    description: "Use this when a user mentions a cryptocurrency's full name. Example: 'Show me Bitcoin trends' or 'What's the analysis for Ethereum?'. Returns coin metadata (including futures data as open Interest, futures volume of the last 24 hours and funding rate), trend history with streaks, and band-based support/resistance zones.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "The cryptocurrency's full name (Bitcoin, Ethereum, etc)"
        },
        interval: {
          type: 'string',
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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
          throw(error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getAllCategories: tool({
    description: "Use this when a user asks for all categories. Or before you call getCategoryTrends to cross-reference the list of available categories. Returns a list of all unique cryptocurrency categories across all coins in the database. This means that a user query might contain a category that is not an exact match to the list of available categories, so you need to make sure that you use the correct category name. For example the user asking about the 'RWA' category actually means our 'RWA (Real World Assets)' category from the getAllCategories tool.",
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

        return categories;
      } catch (error) {
        throw(error)
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
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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

        return trends;
      } catch (error) {
        throw(error)
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

        return alignedTrends;
      } catch (error) {
        throw(error)
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

        // Extract coin IDs for fanout operations
        const coinIds = coins.map(coin => coin.id || coin.coinId || coin.symbol);

        return coinIds;
      } catch (error) {
        throw(error)
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
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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
          throw(error)
        }

        const data = {
          date: result.date,
          trends: result.trends,
          extremes: result.extremes
        };

        return data;
      } catch (error) {
        throw(error)
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
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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
          throw(error)
        }

        const data = {
          date: result.date,
          overtaking: result.overtaking,
          overtaken: result.overtaken,
          message: result.message
        };

        return data;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getCoinById: tool({
    description: "Use this when you have a specific coinId to look up. Returns coin metadata (including futures data as open Interest, futures volume of the last 24 hours and funding rate), trend history with streaks, and band-based support/resistance zones.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        coinId: {
          type: 'string',
          description: 'The unique identifier of the coin to look up'
        },
        interval: {
          type: 'string',
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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
          throw(error)
        }

        return result;
      } catch (error) {
        throw(error)
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

        return tweets;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getFilteredCoins: tool({
    description: "Use this when a user wants to filter coins by criteria like trend direction, market cap, categories, etc. Example: 'Show me uptrend coins in the DeFi category' or 'Find coins with market cap under 100M with strong uptrends'. Returns a list of coin names, in order to get more information about a coin use the getCoinByName tool with this coin name as a parameter.",
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
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
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
        },
        sortBy: {
          type: 'string',
          enum: ['marketCap'],
          description: 'Sort results by this field',
          default: 'marketCap'
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order for results',
          default: 'desc'
        },
        withPerps: {
          type: 'boolean',
          description: 'Only include coins that are traded in futures/perpetual markets (perps)'
        }
      }
    }),
    execute: async ({ trend, categories, marketCapMin, marketCapMax, streakMin, streakMax,
                     exchanges, cexOnly, dexOnly, interval = "1d", flavor = "CoinRotator", limit = 10, sortBy = 'marketCap', sortOrder = 'desc', withPerps }) => {
      try {
        console.log('Tool executed: getFilteredCoins', {
          trend, categories, marketCapMin, marketCapMax, streakMin, streakMax,
          exchanges, cexOnly, dexOnly, interval, flavor, limit, sortBy, sortOrder, withPerps
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
          limit,
          sortBy,
          sortOrder,
          withPerps
        });

        console.log('getFilteredCoins - Result:', coinIds);

        // If no coins found, return a helpful message
        if (!Array.isArray(coinIds) || coinIds.length === 0) {
          return [];
        }

        // Return the coin IDs with filter details and explicitly include items field
        return coinIds;
      } catch (error) {
        throw(error)
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
          throw(error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  }),

  getCategoryTrends: tool({
    description: "Use this when a user asks about trend distribution within a specific category. Returns the trend breakdown (UP, HODL, DOWN counts) for the specified category. Make sure that before you call this tool, you cross-referenced the list of available categories using the getAllCategories tool. This means that a user query might contain a category that is not an exact match to the list of available categories, so you need to make sure that you use the correct category name. For example the user asking about the 'RWA' category actually means our 'RWA (Real World Assets)' category from the getAllCategories tool.",
    parameters: jsonSchema({
      type: 'object',
      properties: {
        categoryName: {
          type: 'string',
          description: 'The name of the category to get trend data for'
        },
        interval: {
          type: 'string',
          description: `Trend data interval (${SUPPORTED_INTERVALS.join(', ')})`,
          default: '1d'
        }
      },
      required: ['categoryName']
    }),
    execute: async ({ categoryName, interval = "1d" }) => {
      try {
        console.log('Tool executed: getCategoryTrends', { categoryName, interval });

        // Call the socket server API endpoint for category trends
        const result = await callSocketServer('/api/category/trends', {
          categoryName,
          interval
        });

        console.log('getCategoryTrends - Result:', result);

        if (result.error) {
          throw(error)
        }

        // Format the result, ensuring trends object is present
        const data = {
          categoryName,
          interval,
          trends: result.trends || { UP: 0, HODL: 0, DOWN: 0 },
          coinCount: result.coinCount || 0
        };

        return data;
      } catch (error) {
        throw(error)
      }
    }
  })
};

// Function to fetch AI configuration from the API server
const getAiConfiguration = async () => {
  try {
    console.log('Fetching AI configuration from API server...');
    const url = new URL('/api/toady/config', process.env.AI_SERVER_URL);
    url.searchParams.append('playground', 'true');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Log the fetched configuration
    console.log('Fetched AI Configuration from API server:', {
      serverProvider: data.serverProvider,
      systemPromptLength: data.systemPromptContent?.length || 0,
      classificationPromptLength: data.classificationPromptContent?.length || 0,
    });

    return {
      systemPromptContent: data.systemPromptContent,
      classificationPromptContent: data.classificationPromptContent,
      serverProvider: data.serverProvider,
      modelId: data.anthropicModelId,
      vertexModelId: data.vertexModelId,
      openRouterModelId: data.openRouterModelId,
      openAiModelId: data.openAiModelId
    };
  } catch (error) {
    console.error('API server configuration fetch error:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to fetch AI configuration from API server: ${error.message}`);
  }
};

// Query classification schema for GPT-4.1 Mini
const queryPlanSchema = z.object({
  queryType: z.enum([
    'coinInfo',
    'marketHealth',
    'categoryInfo',
    'trendAnalysis',
    'multipleCoins',
    'factualQuestion',
    'other'
  ]).describe('The type of information the user is requesting'),
  description: z.string().describe('Brief description of what the user is asking for'),
  executionPlan: z.array(
    z.object({
      stepId: z.string().describe('Unique identifier for this step'),
      description: z.string().describe('What this step accomplishes'),
      dependsOn: z.array(z.string()).optional().describe('IDs of steps that must complete before this one can run'),
      parallelizable: z.boolean().describe('Whether this step can run in parallel with other non-dependent steps'),
      dynamicFanout: z.boolean().optional().describe('Whether this step should be dynamically applied to each item in a list from a source step'),
      sourceStep: z.string().optional().describe('ID of the step containing the list to fan out over (required when dynamicFanout is true)'),
      tools: z.array(
        z.object({
          toolName: z.string().describe('Name of the tool to be called'),
          parameters: z.record(z.any()).describe('Parameters to pass to the tool. Use an empty object {} if no parameters are needed.'),
          usesResultFrom: z.string().optional().describe('If this tool uses the result from another tool, specify the step ID')
        })
      ).describe('Tools to execute in this step')
    })
  ).describe('Ordered plan for executing tools, with dependencies and parallel execution information'),
  additionalContext: z.string().optional().describe('Any additional information that might help in answering the query')
});

// Function to classify the query using GPT-4.1 Mini
const classifyQuery = async (query, classificationPromptContent) => {
  try {
    console.log('Classifying query using GPT-4.1 Mini:', query);

    // Fetch available categories to provide to the classifier
    let availableCategories;
    let categoriesStringForPrompt;

    try {
      console.log('Fetching categories for classifier prompt...');
      const fetchedCategories = await callSocketServer('/api/categories');

      if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
        availableCategories = fetchedCategories; // Store for potential other uses if needed
        categoriesStringForPrompt = "System-Recognized Categories (use these exact names for 'getCategoryTrends'):\n" + fetchedCategories.map(cat => `- "${cat}"`).join('\n');
        console.log('Successfully fetched categories for classifier prompt:', availableCategories);
      } else {
        // This case handles if the API returns an empty array or an unexpected non-error response.
        console.error('API server returned no categories or an invalid category list format. Count:', fetchedCategories?.length);
        throw new Error('Failed to fetch a valid, non-empty list of categories from the API server.');
      }
    } catch (catError) {
      console.error('Critical error fetching categories for classifier prompt:', catError);
      // Re-throw to ensure the main process stops if categories are not available.
      throw new Error(`Critical failure: Unable to fetch categories required for query classification. Original error: ${catError.message}`);
    }

    // Prepare tool definitions for the prompt by extracting relevant parts
    const serializableTools = {};
    for (const toolName in tools) {
        if (Object.hasOwnProperty.call(tools, toolName)) {
            const toolDefinition = tools[toolName];
            serializableTools[toolName] = {
                description: toolDefinition.description,
                parameters: toolDefinition.parameters // This is the JSON schema object
            };
        }
    }
    const toolDefinitionsJson = JSON.stringify(serializableTools, null, 2);

        // Use the API-provided classification prompt content
    const classifierSystemPrompt = classificationPromptContent
      .replace('${query}', query)
      .replace('${categoriesStringForPrompt}', categoriesStringForPrompt)
      .replace('${toolDefinitionsJson}', toolDefinitionsJson);

    console.log('Using classification prompt from API server');

    console.log('Classifier System Prompt:\n');
    console.dir(classifierSystemPrompt, { depth: null });

    // Use GPT-4.1 Mini for classification
    const { object } = await generateObject({
      model: openrouter('openai/gpt-4.1-mini'),
      schema: queryPlanSchema,
      prompt: classifierSystemPrompt
    });

    console.log('Query classification result:', object);
    return object;
  } catch (error) {
    console.error('Error classifying query:', error);
    throw error; // Let it fail instead of providing a fallback
  }
};

// Function to execute tools based on the query plan
const executeToolsFromPlan = async (plan) => {
  console.log('Executing tools from plan:', plan);
  const results = {}; // This will store the final output for each step's execution.
  const stepResults = {}; // This is used to store results during execution and for cross-step parameter passing.

  try {
    // Group steps by their dependencies to determine execution order
    const stepsByDependencyLevel = {};
    let currentLevel = 0;
    let remainingSteps = [...plan.executionPlan];
    const completedStepIdsForGrouping = new Set(); // New: Tracks completed step IDs for grouping/planning

    // Process steps level by level until all are processed for grouping
    while (remainingSteps.length > 0) {
      // Find steps at the current level (those with all dependencies already "conceptually" processed)
      const stepsAtCurrentLevel = remainingSteps.filter(step => {
        if (!step.dependsOn || step.dependsOn.length === 0) {
          return true;
        }
        // Check if all dependencies have been "conceptually" processed for grouping
        return step.dependsOn.every(depId =>
          completedStepIdsForGrouping.has(depId) // Use the new Set for planning
        );
      });

      if (stepsAtCurrentLevel.length === 0) {
        // If no steps can be scheduled at this level, but there are remaining steps, it's a circular dependency or missing dependency
        console.error('Circular dependency detected or unresolvable dependency in plan during grouping:', {
          remainingSteps: remainingSteps.map(s => s.stepId),
          completedInGrouping: Array.from(completedStepIdsForGrouping)
        });
        throw new Error('Circular dependency detected or unresolvable dependency in execution plan');
      }

      // Add these steps to the current level
      stepsByDependencyLevel[currentLevel] = stepsAtCurrentLevel;

      // Mark these steps as "conceptually" completed for the next iteration of grouping
      stepsAtCurrentLevel.forEach(step => completedStepIdsForGrouping.add(step.stepId));

      // Remove processed steps from the remaining list
      remainingSteps = remainingSteps.filter(step =>
        !stepsAtCurrentLevel.some(s => s.stepId === step.stepId)
      );

      currentLevel++;
    }

    // Execute steps level by level using the organized stepsByDependencyLevel
    for (let level = 0; level < currentLevel; level++) {
      console.log(`Executing steps at dependency level ${level}`);
      const stepsToExecute = stepsByDependencyLevel[level];

      // Process each step at this level
      for (const step of stepsToExecute) {
        // Handle dynamic fanout steps
        if (step.dynamicFanout === true && step.sourceStep) {
          await processDynamicFanoutStep(step, stepResults, results);
          continue;
        }

        // Process regular steps
        const stepPromise = processRegularStep(step, stepResults);
        const completedStep = await stepPromise;
        results[completedStep.stepId] = completedStep;
      }
    }

    return Object.values(results);
  } catch (error) {
    console.error('Error executing tools from plan:', error);
    throw error;
  }
};

// Helper function to process a dynamic fanout step
const processDynamicFanoutStep = async (step, stepResults, results) => {
  console.log(`Processing dynamic fanout step: ${step.stepId}, source: ${step.sourceStep}`);

  // Ensure we have a source step and it's been processed
  if (!step.sourceStep || !stepResults[step.sourceStep]) {
    console.error(`Source step ${step.sourceStep} not found for dynamic fanout step ${step.stepId}`);
    throw new Error(`Source step not found for dynamic fanout`);
  }

  // Ensure the step has exactly one tool template
  if (!step.tools || step.tools.length !== 1) {
    console.error(`Dynamic fanout step must have exactly one tool template`);
    throw new Error(`Dynamic fanout step must have exactly one tool template`);
  }

  const sourceStep = stepResults[step.sourceStep];
  const toolTemplate = step.tools[0];

  // Directly use the array of coin names from the source step's tool result
  let fanoutItems = [];
  if (Array.isArray(sourceStep.tools) && sourceStep.tools.length > 0) {
    // The tool result is expected to be an array of strings (coin names)
    const toolResult = sourceStep.tools[0].result;
    if (Array.isArray(toolResult)) {
      fanoutItems = toolResult;
    }
  }

  if (!fanoutItems || fanoutItems.length === 0) {
    console.error('No items found for dynamic fanout step:', step.stepId);
    return;
  }

  console.log(`Fanning out to ${fanoutItems.length} items: ${fanoutItems.join(', ')}`);

  // Create and execute a tool for each item
  const toolPromises = fanoutItems.map(async (item) => {
    // Clone the tool template and replace {item} placeholder in parameters
    const toolConfig = { ...toolTemplate };
    toolConfig.parameters = { ...toolTemplate.parameters };

    // Replace {item} placeholder in all parameter values
    Object.keys(toolConfig.parameters).forEach(paramKey => {
      const paramValue = toolConfig.parameters[paramKey];
      if (typeof paramValue === 'string' && paramValue.includes('{item}')) {
        toolConfig.parameters[paramKey] = paramValue.replace('{item}', item);
      }
    });

    // Execute the tool
    const { toolName, parameters } = toolConfig;

    if (!tools[toolName]) {
      console.error(`Tool not found: ${toolName}`);
      return {
        toolName,
        parameters,
        error: `Tool "${toolName}" not found`
      };
    }

    try {
      console.log(`Executing fanout tool: ${toolName} with parameters:`, parameters);
      const result = await tools[toolName].execute(parameters);
      return {
        toolName,
        parameters,
        result
      };
    } catch (toolError) {
      console.error(`Error executing tool processDynamicFanoutStep ${toolName}:`, toolError);
      return {
        toolName,
        parameters,
        error: toolError.message
      };
    }
  });

  // Execute all tools for this fanout step
  const toolResults = await Promise.all(toolPromises);

  // Store the results
  stepResults[step.stepId] = {
    stepId: step.stepId,
    description: step.description,
    fanoutSource: step.sourceStep,
    fanoutItems: fanoutItems,
    tools: toolResults
  };

  results[step.stepId] = stepResults[step.stepId];
  return stepResults[step.stepId];
};

// Helper function to process a regular step
const processRegularStep = async (step, stepResults) => {
  console.log(`Processing regular step: ${step.stepId}`);

  // For each step, process the tools
  const toolPromises = step.tools.map(async (toolConfig) => {
    const { toolName, parameters, usesResultFrom } = toolConfig;

    // Prepare the actual parameters to use
    let finalParameters = { ...parameters };

    // Apply parameter updates based on dependencies if specified
    if (usesResultFrom && stepResults[usesResultFrom]) {
      // Simply pass the dependency information to the GPT model in the next phase
      // The complex model will interpret this raw data appropriately
      console.log(`Tool ${toolName} using results from step ${usesResultFrom}`);
    }

    if (!tools[toolName]) {
      console.error(`Tool not found: ${toolName}`);
      return {
        toolName,
        error: `Tool "${toolName}" not found`
      };
    }

    try {
      console.log(`Executing tool: ${toolName} with parameters:`, finalParameters);
      const result = await tools[toolName].execute(finalParameters);
      return {
        toolName,
        parameters: finalParameters,
        result
      };
    } catch (toolError) {
      console.error(`Error executing tool processRegularStep ${toolName}:`, toolError);
      return {
        toolName,
        parameters: finalParameters,
        error: toolError.message
      };
    }
  });

  // Execute all tools in this step
  const toolResults = await Promise.all(toolPromises);

  // Store the results from this step
  stepResults[step.stepId] = {
    stepId: step.stepId,
    description: step.description,
    tools: toolResults
  };

  return stepResults[step.stepId];
};

export async function POST(req) {
  const { messages, walletAddress, data } = await req.json();
  console.log('Received POST request with messages:', JSON.stringify(messages, null, 2));
  console.log('Request data:', data);

  // Get the user message (last message in the array)
  const userMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!userMessage || userMessage.role !== 'user') {
    return new Response(JSON.stringify({
      error: 'Invalid request',
      message: 'No user message found in the request'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  // Track the AI prompt in Mixpanel
  // if (userMessage) {
  //   trackMixpanelEvent('AI Prompt', {
  //     distinct_id: walletAddress || 'anonymous',
  //     prompt: userMessage.content,
  //     messageCount: messages.length,
  //     time: Math.floor(Date.now() / 1000)
  //   }).catch(err => console.error('Mixpanel tracking error:', err));
  // }

  try {
    // First, get all the AI configuration we'll need throughout the process
    console.log('Getting AI configuration from API server...');
    const aiConfig = await getAiConfiguration();
    const {
      systemPromptContent,
      classificationPromptContent,
      serverProvider,
      modelId: anthropicModelIdFromStrapi,
      vertexModelId,
      openRouterModelId,
      openAiModelId
    } = aiConfig;

    // STEP 1: Classify query and create a data retrieval plan using GPT-4.1 Mini
    console.log('Step 1: Classifying query...');
    const queryPlan = await classifyQuery(userMessage.content, classificationPromptContent);
    console.log('Query plan generated:', queryPlan);

    // STEP 2: Execute the tools specified in the plan to retrieve data
    console.log('Step 2: Executing tools based on the plan...');
    const executionResults = await executeToolsFromPlan(queryPlan);
    console.log('Plan execution completed with results from steps:',
      executionResults.map(step => step.stepId));

    // Log the specific model IDs after fetching
    console.log('Server Provider:', serverProvider);
    console.log('Anthropic Model ID from API server:', anthropicModelIdFromStrapi);
    console.log('Vertex Model ID from API server:', vertexModelId);
    console.log('OpenRouter Model ID from API server:', openRouterModelId);
    console.log('OpenAI Model ID from API server:', openAiModelId);

    // Construct context string from data
    let contextInformation = "";
    if (data?.browserDateTimeWithTimezone) {
      contextInformation += `Current date and time: ${data.browserDateTimeWithTimezone}\n`;
    }
    if (data?.coinId) {
      contextInformation += `Current relevant coin ID for context: ${data.coinId}\n`;
    }

    // Add each step's results to the context
    for (const step of executionResults) {
      contextInformation += `## Step: ${step.description} (${step.stepId}) ##\n`;

      // Add each tool result from this step
      for (const toolResult of step.tools) {
        contextInformation += `### Information from ${toolResult.toolName}: ###\n`;
        if (toolResult.error) {
          contextInformation += `Error: ${toolResult.error}\n\n`;
        } else if (typeof toolResult.result === 'object') {
          contextInformation += `${JSON.stringify(toolResult.result, null, 2)}\n\n`;
        } else {
          contextInformation += `${toolResult.result}\n\n`;
        }
      }
    }

    contextInformation = contextInformation.trim();

    // Prepend context to the system prompt
    const finalSystemPrompt = contextInformation
      ? `${contextInformation}\n\n${systemPromptContent}`
      : systemPromptContent;

    console.log('Final system prompt');
    console.dir(finalSystemPrompt, { depth: null });
    console.log('Starting AI stream with pre-retrieved data...');

    // Create a collection to store all steps for debugging
    const allSteps = [];
    let model;

    // Select the appropriate model based on the server provider
    let providerMetadata = {};
    if (serverProvider === 'anthropic') {
      console.log('Using Anthropic model:', anthropicModelIdFromStrapi);
      model = anthropic(anthropicModelIdFromStrapi);
      providerMetadata = {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else if (serverProvider === 'vertex') {
      console.log('Using Vertex model:', vertexModelId);
      model = vertex(vertexModelId);
      providerMetadata = {
        vertex: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else if (serverProvider === 'openrouter') {
      console.log('Using OpenRouter model:', openRouterModelId);
      model = openrouter(openRouterModelId)
      providerMetadata = {
        openrouter: {
          cacheControl: { type: 'ephemeral' },
        }
      };
    } else if (serverProvider === 'openai') {
      console.log('Using OpenAI model:', openAiModelId);
      model = openai(openAiModelId);
    } else {
      throw new Error(`Unsupported AI provider: ${serverProvider}`);
    }

    // Use the complex model to generate the final response based on the retrieved data
    // The complex model doesn't need to call tools itself, as all necessary data is provided in advance
    const response = streamText({
      model,
      messages: [
        {
          role: "system",
          content: finalSystemPrompt,
          providerMetadata
        },
        ...messages // Include all previous messages for context
      ],
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          userId: walletAddress
        }
      },
      maxSteps: 10, // Reduced since we shouldn't need many steps with pre-retrieved data

      onFinish(result) {
        console.log('Stream finished:', {
          finishReason: result.finishReason,
          usage: result.usage,
          messageCount: result.messages?.length || 0
        });

        // Log any errors
        if (result.finishReason === 'error') {
          console.error('Stream error:', result.error);

          // Report finish errors to Bugsnag
          reportErrorToServer(result.error || new Error('Unknown stream finish error'), {
            errorType: 'StreamFinishError',
            finishReason: result.finishReason,
            walletAddress,
            userMessage: userMessage?.content,
            messageCount: messages.length,
            timestamp: new Date().toISOString()
          }).catch(reportError => {
            console.error('Failed to report stream finish error:', reportError);
          });
        }
      },

      onStepFinish({ text, finishReason, usage }) {
        const stepInfo = {
          text,
          finishReason,
          usage
        };

        allSteps.push(stepInfo);
        console.log('Step finished:', JSON.stringify(stepInfo, null, 2));
      },

      onError(error) {
        console.error('Stream error:', error);
        // Report stream errors to Bugsnag
        reportErrorToServer(error, {
          errorType: 'StreamError',
          walletAddress,
          userMessage: userMessage?.content,
          messageCount: messages.length,
          timestamp: new Date().toISOString()
        }).catch(reportError => {
          console.error('Failed to report stream error:', reportError);
        });
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

        // Report response conversion errors to Bugsnag
        reportErrorToServer(error, {
          errorType: 'StreamResponseError',
          walletAddress,
          userMessage: userMessage?.content,
          messageCount: messages.length,
          timestamp: new Date().toISOString()
        }).catch(reportError => {
          console.error('Failed to report stream response error:', reportError);
        });

        // Return a user-friendly error message based on error type
        return "An error occurred while processing your request. Please try again later.";
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

    // Report the error to the API server for Bugsnag tracking
    await reportErrorToServer(e, {
      walletAddress,
      userMessage: userMessage?.content,
      messageCount: messages.length,
      url: req.url,
      timestamp: new Date().toISOString()
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