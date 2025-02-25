import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool, jsonSchema } from 'ai';
import auth from '../../../utils/auth.js'
import { createClient } from '@vercel/postgres';

export const runtime = 'edge';

const client = createClient({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const systemPrompt = `You are CoinRotatorAi, a cryptocurrency trend analysis agent. Your role is to analyze cryptocurrency trends using provided tools. Follow these specific rules:

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
     - Recent trend data: date, trend, and streak information
   - IMPORTANT: Only call each tool ONCE per user query

2. **Trend Analysis**:
   - Analyze the returned trend data which includes:
     - Date: When the trend was recorded
     - Trend: The direction of movement
     - Streak: Consecutive days in the current trend
   - Consider market context using the coin's fundamental metrics

3. **Web Search (Secondary Source)**:
   - Use web search only if:
     - The dataset lacks specific data for a query.
     - Verification or supplementary context is needed to complete the analysis.
   - Clearly distinguish web-sourced information by labeling it as "Supplementary Information."

4. **Response Format**:
   - Present findings in a structured format:
     - Coin Metrics: marketCap, ATH/ATL, supply information
     - Recent Trends: Latest trend direction and streak
     - Categories: Both standard and Coingecko categories
   - Provide a concise summary of the analysis

5. **Error Handling**:
   - If the dataset does not contain data for a requested coin or time frame:
     - Respond: *"No data available for [coinId] in the dataset."*
     - Offer to refine the query or suggest alternatives based on available data.
   - Avoid making assumptions or generating speculative results.

---

### **Example Query and Response**

**Query**: "What's the trend for BTC?"

**Response**:
1. Coin Metrics:
   - Market Cap: $X
   - ATH: $Y
   - Circulating Supply: Z

2. Recent Trend:
   - Current Direction: [UP/DOWN]
   - Streak: X days
   - Last Updated: [date]

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

// Add a helper function for database operations
const withDb = async (operation) => {
  const client = createClient({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    options: {
      connectionTimeoutMillis: 5000, // 5 second connection timeout
      query_timeout: 10000, // 10 second query timeout
      statement_timeout: 10000 // 10 second statement timeout
    }
  });

  try {
    await client.connect();
    return await operation(client);
  } catch (error) {
    console.error('Database operation failed:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await client.end();
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

        return await withDb(async (client) => {
          const coinQuery = await client.sql`
            SELECT id, "marketCap", categories, "coingeckoCategories", ath, atl,
                   "circulatingSupply", "fullyDilutedValuation", "totalSupply"
            FROM "Coin"
            WHERE platforms->>${chain} = ${contractAddress}
          `;
          console.log('getCoinByContract - Coin query results:', { rowCount: coinQuery.rows.length });

          if (coinQuery.rows.length === 0) {
            console.log('getCoinByContract: No coin found');
            return { error: "Coin not found" };
          }

          const trendsQuery = await client.sql`
            SELECT "coinId", date, trend, streak
            FROM "SuperTrend"
            WHERE "coinId" = ${coinQuery.rows[0].id}
              AND "quoteSymbol" IS NULL
              AND flavor = 'CoinRotator'
              AND interval = ${interval}
            ORDER BY date DESC
            LIMIT 10
          `;
          console.log('getCoinByContract - Trends query results:', { trendsCount: trendsQuery.rows.length });

          return { coin: coinQuery.rows[0], trends: trendsQuery.rows };
        });
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

        return await withDb(async (client) => {
          const coinQuery = await client.sql`
            SELECT id, "marketCap", categories, "coingeckoCategories", ath, atl,
                   "circulatingSupply", "fullyDilutedValuation", "totalSupply"
            FROM "Coin"
            WHERE UPPER(symbol) = UPPER(${symbol})
          `;
          console.log('getCoinBySymbol - Coin query results:', { rowCount: coinQuery.rows.length });

          if (coinQuery.rows.length === 0) {
            console.log('getCoinBySymbol: No coin found for symbol:', symbol);
            return { error: "Coin not found" };
          }

          const trendsQuery = await client.sql`
            SELECT "coinId", date, trend, streak
            FROM "SuperTrend"
            WHERE "coinId" = ${coinQuery.rows[0].id}
              AND "quoteSymbol" IS NULL
              AND flavor = 'CoinRotator'
              AND interval = ${interval}
            ORDER BY date DESC
            LIMIT 10
          `;
          console.log('getCoinBySymbol - Trends query results:', { trendsCount: trendsQuery.rows.length });

          return { coin: coinQuery.rows[0], trends: trendsQuery.rows };
        });
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

        return await withDb(async (client) => {
          const coinQuery = await client.sql`
            SELECT id, "marketCap", categories, "coingeckoCategories", ath, atl,
                   "circulatingSupply", "fullyDilutedValuation", "totalSupply"
            FROM "Coin"
            WHERE name = ${name.toLowerCase()}
          `;
          console.log('getCoinByName - Coin query results:', { rowCount: coinQuery.rows.length });

          if (coinQuery.rows.length === 0) {
            console.log('getCoinByName: No coin found');
            return { error: "Coin not found" };
          }

          const trendsQuery = await client.sql`
            SELECT "coinId", date, trend, streak
            FROM "SuperTrend"
            WHERE "coinId" = ${coinQuery.rows[0].id}
              AND "quoteSymbol" IS NULL
              AND flavor = 'CoinRotator'
              AND interval = ${interval}
            ORDER BY date DESC
            LIMIT 10
          `;
          console.log('getCoinByName - Trends query results:', { trendsCount: trendsQuery.rows.length });

          return { coin: coinQuery.rows[0], trends: trendsQuery.rows };
        });
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
    const response = streamText({
      model: openrouter('qwen/qwen-max:online'),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
      tools,
      maxSteps: 3
    });

    console.log('Stream created, converting to response...');
    const streamResponse = response.toDataStreamResponse();
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