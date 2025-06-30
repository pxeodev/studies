import { anthropic } from '@ai-sdk/anthropic';
import { vertex } from '@ai-sdk/google-vertex/edge';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { streamText, jsonSchema, generateObject } from 'ai';
import Exa from "exa-js"
import { Converter } from '@memochou1993/json2markdown';
import { Langfuse } from "langfuse";

// Hardcoded because of ENV newline issue
process.env.GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC7reXGCX4qCHvG\n6Z9RDOvOE/ip5wHCCa/eRTNvtwtQ9hdJDzP4nD3qMo4Ybgq/4NQBAXwo9DVX9zSk\nLl3Kme5XZvXEh26Xhz657nDiqT6JVJ4oPemNQrWuk7oZ4xbs2gM0ygx+jh3hQLW0\ni1dz1aS+vrF+LvNbdStnde/5TRSZV16dc8Imla34j/DpIn5osb+I/7hYJF314S4B\nZbwN5Dt5vzW0fBEhF4L9atntPNFQlPlvSYyv2RY7Gr0M5TTca3U0d/intZ1GiJps\nDewjxaoSjcQ3gAmBlMfPdKr7CHQu/buOdGohrs/uUhEFxBCcFA71EtuFJiQf+v/I\n3XgLjNgNAgMBAAECgf9CxjG6WXufTjq7yuNO3bSy3ZLbixVVCZ1JDStVKWByrcbF\nzQ2bUVELbRv2v9rolKrZW23mzvyBD7NAYZQn7Byg0ZZ1Fg/YWduMy7PeRoO5g3cX\nWkUpEqhm31NCDUoFezZ+Jw/K90V/n0ZcYOH8lJweQZAPv89V+u+LyqpW84B2DcMq\nxttBmYiaqaWd8/ZZN/kxcdM5gWOWOgJPBo5zhSSkU3/+hJ+vNSGPPpCW3tFsIi8E\ngHf8DS5i5gtxllLt8Ypt4DgFtjrfHNl3A5wf5CxBa5/WupI6ZhdLvRvM+FfpNAss\ngILf+rmN2PXMVB77CDE4g/BEmHFJE+yvvlatRgECgYEA8T2e1aNDMnw+TnODN93x\nREGnZlLBfaqKogGVQ6dUtjTeDPEoaP/Zt7LQoIebj42r0T8dOkQxbXPeWH6fuTSW\n5zvkNKAtxWTTAQL94TV1OtD2TxPxV14JaSQWW9QwGhe98r8TueWHyGkqU38+v5FO\naK9WnUCuuz1XjAqm9fETjgECgYEAxyliF0gwLK8PlQaObFcvEH02EsZjulNx6koy\nwJrPblQwoPP+Tdr7U47gI9kMFhOeJLf3bWTOTsd643n9/z02Tp8bMinr2Q17XEuz\nUQpqxJEynO4ZmxKH5YAMXgfxAiAEp6mKU9SnkZ1PhG91Yfk+fQrU21V3/T7c8qYV\npbGyog0CgYEAgMLHGHh/0V6HUxBMpXEM6cWxN+hL5ms0e6wko2uYx3gIXRgK3aBR\n8L68pDI9Ua3oW1M4onTrfOQvdUSAtDXhpaJN99jXFVjvVsbmA2KpI6+NCEA4vM0w\ncLIWTQVAd2zcschTGxHsG4gmU1LDhzRjiXSs4lo36TCgndrBqtv1+AECgYAsewyi\nYIgJ4stbIEy827fyOdTS2qY5XhuqFQpCxBCh9oGp4PSiFM9e+SEMQJSXdagzUTcc\nopAFPj4vAfb9g4FWi+h6CqzXHFC561pQNkBkSH2CWRc08C2Tz0Zz1dg4/ker3oy7\nblpChlzVGkOgLxeKu9mQZwVWdSzJsNhS2l4oHQKBgD4DjX/9alefFH4nGJ+lGl8s\n4i8Gw9lhMuhHpl1y1dCu5oPO5luVUTtcLnlsjOfd6YVAvb2Un7XN9Cl+fYgiBgW0\nJh95SMU8ryhQaa3109KqQAlI2eu6z3ubq93/BaKy5oRS18AJ+fKfhgUGKX1YOydu\nEz33m6tbTHD/abdmZPNE\n-----END PRIVATE KEY-----\n`;

export const runtime = 'edge';
export const preferredRegion = ['sfo1', 'fra1', 'sin1'];

const langfuse = new Langfuse();

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url, options = {}, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

// Helper function to add timeout to any promise (for external API calls)
const withTimeout = async (promise, timeoutMs = 60000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

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
    const response = await fetchWithTimeout('https://api.mixpanel.com/track', {
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

    const response = await fetchWithTimeout(url.toString(), {
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
    const response = await fetchWithTimeout(url.toString(), {
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

const toolImplementations = {
  getCurrentMarketVibe: {
    execute: async () => {
      console.log('Tool executed: getCurrentMarketVibe');
      const url = new URL('/api/alpha/messages', process.env.AI_SERVER_URL);
      url.searchParams.append('channelName', 'summary');
      url.searchParams.append('limit', '1');
      const response = await fetchWithTimeout(url.toString(), {
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
    }
  },
  exaSearch: {
    execute: async ({ query, useAutoprompt = false, numResults = 5, startPublishedDate, endPublishedDate, includeDomains, excludeDomains }) => {
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
      const searchResult = await withTimeout(exa.search(query, searchOptions));
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
    }
  },

  exaSearchWithContents: {
    execute: async ({ query, useAutoprompt = false, numResults = 3, includeDomains, retrieveText = true, retrieveHighlights = false, maxCharacters = 5000 }) => {
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
        const result = await withTimeout(exa.searchAndContents(query, {
          ...searchOptions,
          ...contentsOptions
        }));

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
    }
  },

  exaAnswer: {
    execute: async ({ question, model = 'exa', retrieveText = false }) => {
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
      const answerResult = await withTimeout(exa.answer(question, options));
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
    }
  },

  exaFindSimilar: {
    execute: async ({ url, numResults = 5, excludeSourceDomain = true, retrieveText = false }) => {
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
          result = await withTimeout(exa.findSimilarAndContents(url, {
            ...options,
            text: true
          }));
        } else {
          result = await withTimeout(exa.findSimilar(url, options));
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
    }
  },

  getCoinByContract: {
    execute: async ({ contractAddress, chain, interval = "1d", trendLimit = 5 }) => {
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
        throw(result.error)
      }

      return result;
    }
  },

  getCoinBySymbol: {
    execute: async ({ symbol, interval = "1d", trendLimit = 5 }) => {
      console.log('Tool executed: getCoinBySymbol - Starting', { symbol, interval, trendLimit });

      // Call the socket server API endpoint for symbol lookup
      const result = await callSocketServer('/api/coin/symbol', {
        symbol,
        interval,
        trendLimit
      });

      console.log('getCoinBySymbol - Result:', result);

      if (result.error) {
        throw(result.error)
      }

      return result;
    }
  },

  getCoinByName: {
    execute: async ({ name, interval = "1d", trendLimit = 5 }) => {
      console.log('Tool executed: getCoinByName', { name, interval, trendLimit });

      // Call the socket server API endpoint for name lookup
      const result = await callSocketServer('/api/coin/name', {
        name,
        interval,
        trendLimit
      });

      console.log('getCoinByName - Result:', result);

      if (result.error) {
        throw(result.error)
      }

      return result;
    }
  },

  getAllCategories: {
    execute: async ({ limit } = {}) => {
      console.log('Tool executed: getAllCategories', { limit });

      // Call the socket server API endpoint for categories, with optional limit
      const params = {};
      if (typeof limit !== 'undefined') params.limit = limit;
      const result = await callSocketServer('/api/categories', params);

      console.log('getAllCategories - Result:', result);

      const categories = Array.isArray(result) ? result : [];

      return categories;
    }
  },

  getExtremeTrends: {
    execute: async ({ interval = "1d", type = "fresh", limit = 10, coinNames }) => {
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
    }
  },

  getAlignedTrends: {
    execute: async ({ flavor = "CoinRotator", intervals, limit = 10, coinNames }) => {
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
    }
  },

  getCoinsByCategory: {
    execute: async ({ category }) => {
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
    }
  },

  getMarketHealth: {
    execute: async ({ interval = "1d" }) => {
      console.log('Tool executed: getMarketHealth', { interval });

      // Call the socket server API endpoint for market health
      const result = await callSocketServer('/api/market/health', {
        interval
      });

      console.log('getMarketHealth - Result:', result);

      if (result.error) {
        throw(result.error)
      }

      const data = {
        date: result.date,
        trends: result.trends,
        extremes: result.extremes
      };

      return data;
    }
  },

  getMarketHealthCrossing: {
    execute: async ({ interval = "1d" }) => {
      try {
        console.log('Tool executed: getMarketHealthCrossing', { interval });

        // Call the socket server API endpoint for market health crossing
        const result = await callSocketServer('/api/market/crossing', {
          interval
        });

        console.log('getMarketHealthCrossing - Result:', result);

        if (result.error) {
          throw(result.error)
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
  },

  getCoinById: {
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
          throw(result.error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  },

  getRecentTweets: {
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
  },

  getFilteredCoins: {
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
  },

  globalMarketData: {
    execute: async () => {
      try {
        console.log('Tool executed: globalMarketData');

        // Call the socket server API endpoint for global market data
        const result = await callSocketServer('/api/global/market');

        console.log('globalMarketData - Result:', result);

        if (result.error) {
          throw(result.error)
        }

        return result;
      } catch (error) {
        throw(error)
      }
    }
  },

  getCategory: {
    execute: async ({ categoryName, interval = "1d" }) => {
      try {
        console.log('Tool executed: getCategory', { categoryName, interval });

        // Call the socket server API endpoint for category trends
        const result = await callSocketServer('/api/category', {
          categoryName,
          interval
        });

        console.log('getCategoryData - Result:', result);

        if (result.error) {
          throw(result.error)
        }

        const data = {
          ...result,
          categoryName,
          interval,
        };

        return data;
      } catch (error) {
        throw(error)
      }
    }
  }
};

// Function to fetch AI configuration and Langfuse prompts in parallel
const getAiConfigurationAndPrompts = async (sessionId = null) => {
  try {
    console.log('Fetching AI configuration from API server and prompts from Langfuse in parallel...');

    // Create the API URL
    const url = new URL('/api/toady/config', process.env.AI_SERVER_URL);
    if (sessionId) {
      url.searchParams.append('sessionId', sessionId);
    }
    url.searchParams.append('playground', 'false');

    // Fetch API configuration, system prompt, and classifier prompt in parallel
    const [apiResponse, langfuseSystemPrompt, langfuseClassifierPrompt] = await Promise.all([
      fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }),
      langfuse.getPrompt("System prompt", undefined, { label: 'beta' }),
      langfuse.getPrompt("Classification Prompt", undefined, { label: 'beta' })
    ]);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API server returned ${apiResponse.status}: ${errorText}`);
    }

    const data = await apiResponse.json();

    const configData = {
      systemPromptContent: langfuseSystemPrompt.prompt, // Use Langfuse system prompt
      classificationPromptContent: langfuseClassifierPrompt.prompt, // Use Langfuse classifier prompt
      serverProvider: data.serverProvider,
      modelId: data.anthropicModelId,
      vertexModelId: data.vertexModelId,
      openRouterModelId: data.openRouterModelId,
      openAiModelId: data.openAiModelId,
      sessionHistory: data.sessionHistory
    };

    // Log the fetched configuration
    console.log('Fetched AI Configuration and Langfuse Prompts:', {
      serverProvider: data.serverProvider,
      systemPromptLength: langfuseSystemPrompt.prompt?.length || 0,
      classificationPromptLength: langfuseClassifierPrompt.prompt?.length || 0,
      sessionHistoryCount: Array.isArray(data.sessionHistory) ? data.sessionHistory.length : 0,
      langfuseSystemPromptVersion: langfuseSystemPrompt.version || 'unknown',
      langfuseClassifierPromptVersion: langfuseClassifierPrompt.version || 'unknown'
    });

    return configData;
  } catch (error) {
    console.error('Error fetching AI configuration or Langfuse prompts:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to fetch AI configuration or Langfuse prompts: ${error.message}`);
  }
};

// Function to save session data for debugging and analysis
const saveSessionData = async (sessionId, walletAddress, userMessage, classifierQueryResult, finalPromptResult) => {
  if (!sessionId || !userMessage) {
    return;
  }

  try {
    console.log('Saving session data for session:', sessionId);
    const url = new URL('/api/sessions/tools', process.env.AI_SERVER_URL);

    await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        classifierQueryResult,
        finalPromptResult: finalPromptResult,
        sessionId: sessionId,
        walletAddress: walletAddress || 'anonymous'
      })
    });

    console.log('Successfully saved session data');
  } catch (error) {
    console.error('Failed to save session data:', error);
    // Don't throw - this is not critical
  }
};

// Query classification schema for GPT-4.1 Mini
const queryPlanSchema = jsonSchema({
  type: 'object',
  properties: {
    queryType: {
      type: 'string',
      description: 'The type of information the user is requesting',
      enum: [
        'coinInfo',
        'marketHealth',
        'categoryInfo',
        'trendAnalysis',
        'multipleCoins',
        'factualQuestion',
        'other'
      ]
    },
    description: {
      type: 'string',
      description: 'Brief description of what the user is asking for'
    },
    executionPlan: {
      type: 'array',
      description: 'Ordered plan for executing tools, with dependencies and parallel execution information',
      items: {
        type: 'object',
        properties: {
          stepId: {
            type: 'string',
            description: 'Unique identifier for this step'
          },
          description: {
            type: 'string',
            description: 'What this step accomplishes'
          },
          dependsOn: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of steps that must complete before this one can run'
          },
          parallelizable: {
            type: 'boolean',
            description: 'Whether this step can run in parallel with other non-dependent steps'
          },
          dynamicFanout: {
            type: 'boolean',
            description: 'Whether this step should be dynamically applied to each item in a list from a source step'
          },
          sourceStep: {
            type: 'string',
            description: 'ID of the step containing the list to fan out over (required when dynamicFanout is true)'
          },
          tools: {
            type: 'array',
            description: 'Tools to execute in this step',
            items: {
              type: 'object',
              properties: {
                toolName: {
                  type: 'string',
                  description: 'Name of the tool to be called'
                },
                parameters: {
                  type: 'object',
                  description: 'Parameters to pass to the tool. Use an empty object {} if no parameters are needed.'
                },
                usesResultFrom: {
                  type: 'string',
                  description: 'If this tool uses the result from another tool, specify the step ID'
                }
              },
              required: ['toolName', 'parameters']
            }
          }
        },
        required: ['stepId', 'description', 'parallelizable', 'tools']
      }
    },
    additionalContext: {
      type: 'string',
      description: 'Any additional information that might help in answering the query'
    }
  },
  required: ['queryType', 'description', 'executionPlan']
});

// Function to classify the query using GPT-4.1 Mini
const classifyQuery = async (query, sessionId, classificationPromptContent, sessionHistory = []) => {
  try {
    console.log('Classifying query using GPT-4.1 Mini:', query);
    console.log('Session history available:', Array.isArray(sessionHistory) ? sessionHistory.length : 0);

    // Prepare session history info for the classifier
    let sessionHistoryInfo = '';
    if (Array.isArray(sessionHistory) && sessionHistory.length > 0) {
      sessionHistoryInfo = '\n\nSESSION HISTORY:\n';
      sessionHistory.forEach((record, index) => {
        sessionHistoryInfo += `\n--- Previous Interaction ${index + 1} ---\n`;
        sessionHistoryInfo += `User Message: ${record.message}\n`;

        if (Array.isArray(record.classifierQueryResult) && record.classifierQueryResult.length > 0) {
          sessionHistoryInfo += `Execution Steps Performed:\n`;
          record.classifierQueryResult.forEach((step, stepIndex) => {
            sessionHistoryInfo += `  Step ${stepIndex + 1}: ${step.description || step.stepId}\n`;
            step.tools.forEach((tool, toolIndex) => {
              sessionHistoryInfo += `    Tool ${toolIndex + 1}: ${tool.toolName}`;
              if (tool.parameters) {
                sessionHistoryInfo += ` with params: ${JSON.stringify(tool.parameters)}\n`;
              } else {
                sessionHistoryInfo += `\n`;
              }
              if (tool.error) {
                sessionHistoryInfo += `      Result: Error - ${tool.error}\n`;
              } else if (tool.result) {
                sessionHistoryInfo += `      Result: ${JSON.stringify(tool.result)}\n`;
              }
            });
          });
        }

        if (record.finalPromptResult) {
          sessionHistoryInfo += `Final Prompt: ${record.finalPromptResult.substring(0, 200)}${record.finalPromptResult.length > 200 ? '...' : ''}\n`;
        }

        sessionHistoryInfo += '\n';
      });
      sessionHistoryInfo += 'Consider the session history when creating your query plan. Look for patterns, similar queries, or opportunities to build upon previous interactions.\n';
    }

    // Use the API-provided classification prompt content
    const classifierSystemPrompt = classificationPromptContent
      .replace('${query}', query)
      + sessionHistoryInfo; // Append session history info

    console.log('Using classification prompt from API server with session history');

    console.log('Classifier System Prompt:\n');
    console.dir(classifierSystemPrompt, { depth: null });

    // Use GPT-4.1 Mini for classification
    const { object } = await generateObject({
      model: openrouter('openai/gpt-4.1-mini'),
      schema: queryPlanSchema,
      prompt: classifierSystemPrompt,
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          sessionId
        }
      },
    });

    return object;
  } catch (error) {
    console.error('Error classifying query:', error);
    throw error; // Let it fail instead of providing a fallback
  }
};

// Function to execute tools based on the query plan
const executeToolsFromPlan = async (plan, tools) => {
  console.log('Executing tools from plan:', plan);

  // Sort the execution plan topologically before executing
  const sortedPlan = sortPlanTopologically(plan.executionPlan);
  console.log('Sorted execution plan:', sortedPlan.map(step => step.stepId));

  const results = {}; // This will store the final output for each step's execution.
  const stepResults = {}; // This is used to store results during execution and for cross-step parameter passing.

  try {
    // Execute steps in the topologically sorted order
    for (const step of sortedPlan) {
      console.log(`Executing step: ${step.stepId}`);

      // Handle dynamic fanout steps
      if (step.dynamicFanout === true && step.sourceStep) {
        await processDynamicFanoutStep(step, stepResults, results, tools);
        continue;
      }

      // Process regular steps
      const stepPromise = processRegularStep(step, stepResults, tools);
      const completedStep = await stepPromise;
      results[completedStep.stepId] = completedStep;
    }

    return Object.values(results);
  } catch (error) {
    console.error('Error executing tools from plan:', error);
    throw error;
  }
};

// Simplified function to sort plan steps topologically
const sortPlanTopologically = (executionPlan) => {
  // Create a copy of the plan with normalized dependencies
  const steps = executionPlan.map(step => ({
    ...step,
    dependencies: [...(step.dependsOn || [])],
    // Add sourceStep as dependency for dynamic fanout steps
    ...(step.dynamicFanout && step.sourceStep && { dependencies: [...(step.dependsOn || []), step.sourceStep] })
  }));

  // Build a map of steps by ID for quick lookup
  const stepsById = Object.fromEntries(steps.map(step => [step.stepId, step]));

  // Result array for sorted steps
  const sorted = [];
  // Set to track visited nodes (for cycle detection)
  const visited = new Set();
  // Set to track nodes in current recursion stack (for cycle detection)
  const recursionStack = new Set();

  // Depth-first search function to topologically sort
  const visit = (stepId) => {
    // If already in final sorted list, skip
    if (visited.has(stepId)) return true;

    // Check for cycle
    if (recursionStack.has(stepId)) {
      console.error(`Circular dependency detected involving step: ${stepId}`);
      return false;
    }

    // Add to recursion stack
    recursionStack.add(stepId);

    // Visit all dependencies first
    const step = stepsById[stepId];
    const dependencies = step.dependencies || [];

    // Process all dependencies recursively
    for (const depId of dependencies) {
      if (!stepsById[depId]) {
        console.warn(`Warning: Dependency ${depId} referenced but not defined in plan`);
        continue;
      }
      if (!visit(depId)) return false;
    }

    // Remove from recursion stack and mark as visited
    recursionStack.delete(stepId);
    visited.add(stepId);

    // Add to sorted result
    sorted.push(step);
    return true;
  };

  // Process all steps
  for (const step of steps) {
    if (!visited.has(step.stepId)) {
      visit(step.stepId);
    }
  }

  // If we found a cycle, include any remaining unvisited nodes
  if (sorted.length < steps.length) {
    const remainingSteps = steps.filter(step => !visited.has(step.stepId));
    console.warn(`Some steps couldn't be properly sorted due to circular dependencies. Adding ${remainingSteps.length} remaining steps.`);
    sorted.push(...remainingSteps);
  }

  return sorted;
};

// Helper function to process a dynamic fanout step
const processDynamicFanoutStep = async (step, stepResults, results, tools) => {
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
const processRegularStep = async (step, stepResults, tools) => {
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
  const userMessages = messages.filter(message => message.role === 'user');
  console.log('Received POST request with user messages:', JSON.stringify(userMessages, null, 2));
  console.log('Request data:', data);

  // AUTHENTICATION GATING: Require wallet address for Shumi AI access
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    console.log('Shumi AI access denied: No valid wallet address provided');
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'Wallet connection required to access Shumi AI'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

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

  // Extract session ID from request data
  const sessionId = data?.sessionId;
  console.log('Session ID:', sessionId);

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
    // First, get all the AI configuration and session history
    console.log('Getting AI configuration from API server and prompts from Langfuse...');
    const aiConfig = await getAiConfigurationAndPrompts(sessionId);
    const {
      systemPromptContent,
      classificationPromptContent,
      serverProvider,
      modelId: anthropicModelIdFromStrapi,
      vertexModelId,
      openRouterModelId,
      openAiModelId,
      sessionHistory
    } = aiConfig;

    // STEP 1: Classify query and create a data retrieval plan using GPT-4.1 Mini
    console.log('Step 1: Classifying query...');
    const queryPlan = await classifyQuery(userMessage.content, sessionId, classificationPromptContent, sessionHistory);
    console.log('Query plan generated:', queryPlan);

    // STEP 2: Execute the tools specified in the plan to retrieve data
    console.log('Step 2: Executing tools based on the plan...');
    const newExecutionResults = await executeToolsFromPlan(queryPlan, toolImplementations);
    console.log('Plan execution completed with results from steps:',
      newExecutionResults.map(step => step.stepId));

    // Use the new execution results for context generation
    const allExecutionResults = newExecutionResults;
    console.log('Total execution results available:', allExecutionResults.length);

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

    // Add each step's results to the context (using all execution results)
    for (const step of allExecutionResults) {
      contextInformation += `## Step: ${step.description} (${step.stepId}) ##\n`;

      // Add each tool result from this step
      for (const toolResult of step.tools) {
        contextInformation += `### Information from ${toolResult.toolName}: ###\n`;
        if (toolResult.error) {
          contextInformation += `Error: ${toolResult.error}\n\n`;
        } else if (typeof toolResult.result === 'object') {
          contextInformation += Converter.toMarkdown(toolResult.result);
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

    // Save session data for debugging and analysis (async, don't wait)
    if (sessionId) {
      saveSessionData(sessionId, walletAddress, userMessage.content, newExecutionResults, finalSystemPrompt).catch(error => {
        console.error('Failed to save session data (non-blocking):', error);
      });
    }

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
          userId: walletAddress,
          sessionId
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
            queryPlan,
            messageCount: messages.length,
            sessionId,
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
          queryPlan,
          messageCount: messages.length,
          sessionId,
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
          queryPlan,
          messageCount: messages.length,
          sessionId,
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
      queryPlan,
      messageCount: messages.length,
      sessionId,
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