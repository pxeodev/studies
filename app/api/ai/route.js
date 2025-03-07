import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool, jsonSchema } from 'ai';
import auth from '../../../utils/auth.js'

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

const systemPrompt = `You are CoinRotatorAI, a cryptocurrency trend analysis agent. Your role is to analyze cryptocurrency trends using provided tools. Follow these specific rules:

---

### **Core Instructions**

1. **Data Analysis and Tool Usage (HIGHEST PRIORITY)**:
   - When users provide any of these identifiers:
     - Cryptocurrency symbol/ticker (e.g., "BTC", "ETH")
     - Full coin name (e.g., "Bitcoin", "Ethereum")
     - Contract address with chain (e.g., "ETH contract 0x123...")
   - Respond generically while gathering data, like:
     "Analyzing cryptocurrency data..."
     "Gathering market information..."
     "Retrieving trend data..."
   - Never mention specific tools or functions in responses
   - Each analysis returns:
     - Coin metrics: marketCap, ATH/ATL, supply information, categories
     - Recent trend data: date, trend, and streak information (if available)
   - IMPORTANT: Only call each tool ONCE per user query

2. **Trend Analysis**:
   - Analyze the returned trend data which includes:
     - Date: When the trend was recorded
     - Trend: The direction of movement
     - Streak: Consecutive days in the current trend
   - Consider market context using the coin's fundamental metrics
   - If trend data is not available (hasTrendData = false), clearly state this in your response and focus on the available coin metrics instead

3. **Web Search (Secondary Source)**:
   - Use web search only if:
     - The dataset lacks specific data for a query.
     - Verification or supplementary context is needed to complete the analysis.
   - Clearly distinguish web-sourced information by labeling it as "Supplementary Information."

4. **Response Format**:
   - Present findings in a structured format:
     - Coin Metrics: marketCap, ATH/ATL, supply information
     - Recent Trends: Latest trend direction and streak (if available)
     - Categories: Both standard and Coingecko categories
   - Provide a concise summary of the analysis
   - If trend data is not available, clearly state this and focus on the available coin metrics

5. **Error Handling**:
   - If the dataset does not contain data for a requested coin:
     - Respond: *"No data available for [coinId] in the dataset."*
     - Offer to refine the query or suggest alternatives based on available data.
   - If trend data is not available but coin data is:
     - Respond: *"Coin information found, but no trend data is available for [coinId]."*
     - Continue to provide the available coin metrics
   - Avoid making assumptions or generating speculative results.

---

### **Example Query and Response**

**Query**: "What's the trend for BTC?"

**Response (with trend data)**:
1. Coin Metrics:
   - Market Cap: $X
   - ATH: $Y
   - Circulating Supply: Z

2. Recent Trend:
   - Current Direction: [UP/DOWN]
   - Streak: X days
   - Last Updated: [date]

3. Categories: [list of categories]

**Response (without trend data)**:
1. Coin Metrics:
   - Market Cap: $X
   - ATH: $Y
   - Circulating Supply: Z

2. Trend Status:
   - No trend data is currently available for this coin.

3. Categories: [list of categories]

### **Behavioral Guidelines**:
1. Prioritize precision: Only use verified data from the dataset or web search.
2. Stay concise: Keep responses clear and actionable.
3. Avoid assumptions: If data is unavailable, state it explicitly.


**Instructions:**

1. **Data Analysis**:
   - Prioritize the provided dataset for all analyses.
   - Extract and report trends, streaks, and relevant data points for each cryptocurrency listed.

2. **Web Search Utilization**:
   - Consult web search results only when:
     - The dataset lacks information on a specific query.
     - Additional context or verification is required to ensure accuracy.
   - Clearly indicate when information is supplemented or verified using web search data.

3. **Response Structure**:
   - Begin with insights derived directly from the dataset.
   - If web search data is used, present it in a separate section labeled "Supplementary Information from Web Search."

4. **Limitations**:
   - Do not rely on web search data for primary analysis.
   - Avoid using web search information if the dataset provides sufficient details.

**Example Workflow**:

- **Query**: "Analyze the trend of Bitcoin (BTC) over the past month."

  **Response**:

  - **Dataset Analysis**:
    - "According to the provided dataset, Bitcoin (BTC) has shown an upward trend over the past month, with a 15% increase in value."

  - **Supplementary Information from Web Search**:
    - "Additional data from web sources indicates that this upward trend is consistent with market analyses, attributing the rise to increased institutional investment."

**Note**: Ensure that the primary analysis is always rooted in the provided dataset, using web search data only for necessary supplementation or verification.

### Objectives
1. Identify trends (UP, DOWN, HODL) for the specified \`coinId\` and \`quoteSymbol\`.
2. Calculate trend streaks and their durations based on consecutive entries in the dataset.
3. Present results in a table format with columns: \`Coin ID\`, \`Symbol\`, \`Trend\`, \`Start Date\`, \`End Date\`, \`Streak Length\`.

### Constraints
- Only use the data in the provided dataset.
- Avoid introducing unrelated theories, concepts, or methodologies.
- If data is missing or incomplete, state this explicitly without speculating.

### **Task Overview**
1. **Data Source**: You will analyze the provided JSON data containing cryptocurrency trends.
   - Relevant fields: \`coinId\`, \`quoteSymbol\`, \`date\`, \`trend\`.
   - The dataset may contain multiple entries for each \`coinId\` and \`quoteSymbol\`.

2. **Objectives**:
   - Summarize trend data for specific coins when queried.
   - Calculate overall trend states and trend streaks for the given \`coinId\`.
   - Provide results in a clear table format.

3. **Trend State Calculation**:
   - For each coin, determine the **overall trend state** by aggregating trends across \`BTC\`, \`ETH\`, and \`USD\` pairs.
     - If all three pairs are \`UP\`: Overall Trend = \`UP\`
     - If all three pairs are \`DOWN\`: Overall Trend = \`DOWN\`
     - Otherwise, Overall Trend = \`HODL\`.

4. **Trend Streaks**:
   - Identify continuous streaks for each trend (\`UP\`, \`DOWN\`, \`HODL\`), grouped by \`quoteSymbol\`.
   - A streak begins when a trend starts and ends when the trend changes or data is unavailable.

5. **Output Format**:
   - Return a table summarizing the trends:
     \`\`\`
     Coin ID       Symbol     Trend     Start Date    End Date    Streak Length
     ---------------------------------------------------------------------------
     zyncoin-2     BTC        DOWN      2025-02-01    2025-02-04       4 days
     zyncoin-2     ETH        UP        2025-01-30    2025-02-02       3 days
     \`\`\`

6. **Missing Data**:
   - If no data is available for a requested coin or pair, state explicitly:
     *"No trend data available for [coinId]."*
   - Do not speculate or generate information beyond the dataset.

7. **Guidelines for Large Queries**:
   - When analyzing the entire dataset or multiple coins, process data efficiently by grouping by \`coinId\` and \`quoteSymbol\` to minimize repetition.
   - If context limits are reached (unlikely given the large context window), prioritize the top 10 coins by number of entries.

---

### **Example Queries**
**Query 1**:
  *"What is the trend for zyncoin-2 over the past week?"*
**Expected Response**:

**Query 2**:
*"What are the trends for all coins in the dataset?"*
**Expected Response**:


**Query 3**:
*"What is the overall trend for zyncoin-2?"*
**Expected Response**:

---

### **Behavioral Guidelines**
1. **Precision**:
 - Only rely on the provided JSON data for all calculations and conclusions.
 - Do not speculate or invent missing information.

2. **Efficiency**:
 - Process large datasets by grouping and aggregating trends across \`coinId\` and \`quoteSymbol\` for streamlined results.
 - Avoid unnecessary verbosity.

3. **Clarity**:
 - Always present results in structured tables with appropriate headers.
 - Use concise explanatory notes to accompany tables when necessary.`;

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

    console.log('Processed API response:', {
      hasCoin: !!data.coin,
      trendsCount: data.trends?.length,
      trendStatus: data.trendStatus,
      hasTrendData: data.hasTrendData
    });

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
        }
      },
      required: ['contractAddress', 'chain']
    }),
    execute: async ({ contractAddress, chain, interval = "1d" }) => {
      try {
        console.log('Tool executed: getCoinByContract', { contractAddress, chain, interval });

        // Call the socket server API endpoint for contract lookup
        const result = await callSocketServer('/api/coin/contract', {
          contractAddress,
          chain,
          interval
        });

        console.log('getCoinByContract - Result:', {
          hasCoin: !!result.coin,
          trendsCount: result.trends?.length,
          trendStatus: result.trendStatus
        });

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
          params: { contractAddress, chain, interval }
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
        }
      },
      required: ['symbol']
    }),
    execute: async ({ symbol, interval = "1d" }) => {
      try {
        console.log('Tool executed: getCoinBySymbol - Starting', { symbol, interval });

        // Call the socket server API endpoint for symbol lookup
        const result = await callSocketServer('/api/coin/symbol', {
          symbol,
          interval
        });

        console.log('getCoinBySymbol - Result:', {
          hasCoin: !!result.coin,
          trendsCount: result.trends?.length,
          trendStatus: result.trendStatus
        });

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
          params: { symbol, interval }
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
        }
      },
      required: ['name']
    }),
    execute: async ({ name, interval = "1d" }) => {
      try {
        console.log('Tool executed: getCoinByName', { name, interval });

        // Call the socket server API endpoint for name lookup
        const result = await callSocketServer('/api/coin/name', {
          name,
          interval
        });

        console.log('getCoinByName - Result:', {
          hasCoin: !!result.coin,
          trendsCount: result.trends?.length,
          trendStatus: result.trendStatus
        });

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
          params: { name, interval }
        });
        return { error: "Failed to fetch coin data" };
      }
    }
  })
};

export async function POST(req) {
  const { messages, walletAddress } = await req.json();
  console.log('Received POST request with messages:', JSON.stringify(messages, null, 2));

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

  let hasKeyPass = false;

  try {
    hasKeyPass = await auth(walletAddress);
    console.log('Auth result:', hasKeyPass);

    if (!hasKeyPass) {
      console.log('Authentication failed for wallet:', walletAddress);
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid wallet address or authentication failed'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting AI stream...');

    // Create a collection to store all steps for debugging
    const allSteps = [];

    // Try a different model from OpenRouter that might have better compatibility
    const response = streamText({
      model: openrouter('anthropic/claude-3.7-sonnet'),  // Try GPT-4o instead
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
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

          console.log('Normalized tool result:', {
            toolName,
            toolCallId,
            resultSummary: {
              hasCoin: !!result.coin,
              trendsCount: result.trends.length,
              hasTrendData: result.hasTrendData,
              trendStatus: result.trendStatus
            }
          });
        }

        // Add special handling for empty trends
        if (toolName.startsWith('getCoinBy') &&
            result &&
            result.trends &&
            Array.isArray(result.trends) &&
            result.trends.length === 0) {
          console.log('Empty trends detected, adding placeholder data');
        }

        console.log('Tool call result:', {
          toolName,
          toolCallId,
          result: typeof result === 'object' ?
            JSON.stringify(result).substring(0, 100) + '...' :
            String(result).substring(0, 100) + '...'
        });
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