import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import auth from '../../../utils/auth.js'
import { sql } from '@vercel/postgres';

export const runtime = 'edge';

const systemPrompt = `You are CoinRotatorAi, a cryptocurrency trend analysis agent. Your role is to analyze a provided dataset containing cryptocurrency trends and provide actionable insights. Use web search only when necessary to supplement or verify the information in the dataset. Follow these specific rules:

---

### **Core Instructions**

1. **Dataset as Primary Source**:
   - Always prioritize the provided dataset for analysis.
   - Extract trends, streaks, and relevant metrics for each cryptocurrency based on the dataset fields:
     - \`coinId\` (e.g., HBAR, BTC)
     - \`quoteSymbol\` (e.g., BTC, ETH, USD)
     - \`trend\` (e.g., UP, DOWN, HODL)
     - \`date\`

2. **Trend Analysis**:
   - Determine the overall trend by evaluating all trading pairs (\`BTC\`, \`ETH\`, \`USD\`):
     - If all pairs are **UP** → Overall Trend = **UP**
     - If all pairs are **DOWN** → Overall Trend = **DOWN**
     - If mixed → Overall Trend = **HODL**
   - Calculate streaks for trends (\`UP\`, \`DOWN\`, \`HODL\`) by grouping consecutive entries with the same trend. Record start and end dates for each streak.

3. **Web Search (Secondary Source)**:
   - Use web search only if:
     - The dataset lacks specific data for a query.
     - Verification or supplementary context is needed to complete the analysis.
   - Clearly distinguish web-sourced information by labeling it as "Supplementary Information."

4. **Response Format**:
   - Present findings in a structured table format where applicable:
     \`\`\`
     Coin ID       Pair       Trend     Start Date    End Date    Streak Length
     ---------------------------------------------------------------------------
     HBAR          BTC        DOWN      2025-02-01    2025-02-04       4 days
     \`\`\`
   - Provide a concise summary of the analysis:
     - "HBAR is in a **DOWN** trend across all pairs, with a streak of 4 days ending on 2025-02-04."
   - If web search is used, include a section labeled "Supplementary Information" for additional insights.

5. **Error Handling**:
   - If the dataset does not contain data for a requested coin or time frame:
     - Respond: *"No data available for [coinId] in the dataset."*
     - Offer to refine the query or suggest alternatives based on available data.
   - Avoid making assumptions or generating speculative results.

---

### **Example Query and Response**

**Query**: "What is the trend for HBAR on 2025-02-04?"

**Response**:

---

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

const functions = [{
  type: "function",
  function: {
    name: "getCoinByContract",
    description: "Retrieve coin and trend data using Coingecko-indexed contract address and chain.",
    parameters: {
      type: "object",
      properties: {
        contractAddress: {
          type: "string",
          description: "The contract address as indexed by Coingecko"
        },
        chain: {
          type: "string",
          description: "The blockchain network as indexed by Coingecko (e.g., 'ethereum', 'binance-smart-chain')"
        },
        interval: {
          type: "string",
          description: "The interval for trend data (e.g., '1d', '4h')",
          default: "1d"
        }
      },
      required: ["contractAddress", "chain"]
    },
    implementation: async ({ contractAddress, chain, interval = "1d" }) => {
      const { rows: coin } = await sql`
        SELECT
          id,
          "marketCap",
          categories,
          "coingeckoCategories",
          ath,
          atl,
          "circulatingSupply",
          "fullyDilutedValuation",
          "totalSupply"
        FROM "Coin"
        WHERE platforms->>${chain} = ${contractAddress}
      `;

      if (coin.length === 0) {
        return { error: "Coin not found" };
      }

      const { rows: trends } = await sql`
        SELECT
          "coinId",
          date,
          trend,
          streak
        FROM "SuperTrend"
        WHERE "coinId" = ${coin[0].id}
          AND "quoteSymbol" IS NULL
          AND flavor = 'CoinRotator'
          AND interval = ${interval}
        ORDER BY date DESC
        LIMIT 10
      `;

      return { coin: coin[0], trends };
    }
  }
}, {
  type: "function",
  function: {
    name: "getCoinBySymbol",
    description: "Retrieve coin and trend data using Coingecko coin symbol.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The trading symbol as indexed by Coingecko (e.g., 'BTC', 'ETH')"
        },
        interval: {
          type: "string",
          description: "The interval for trend data (e.g., '1d', '4h')",
          default: "1d"
        }
      },
      required: ["symbol"]
    },
    implementation: async ({ symbol, interval = "1d" }) => {
      const { rows: coin } = await sql`
        SELECT
          id,
          "marketCap",
          categories,
          "coingeckoCategories",
          ath,
          atl,
          "circulatingSupply",
          "fullyDilutedValuation",
          "totalSupply"
        FROM "Coin"
        WHERE UPPER(symbol) = UPPER(${symbol})
      `;

      if (coin.length === 0) {
        return { error: "Coin not found" };
      }

      const { rows: trends } = await sql`
        SELECT
          "coinId",
          date,
          trend,
          streak
        FROM "SuperTrend"
        WHERE "coinId" = ${coin[0].id}
          AND "quoteSymbol" IS NULL
          AND flavor = 'CoinRotator'
          AND interval = ${interval}
        ORDER BY date DESC
        LIMIT 10
      `;

      return { coin: coin[0], trends };
    }
  }
}, {
  type: "function",
  function: {
    name: "getCoinByName",
    description: "Retrieve coin and trend data using Coingecko coin name.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The coin name as indexed by Coingecko (e.g., 'Bitcoin', 'Ethereum')"
        },
        interval: {
          type: "string",
          description: "The interval for trend data (e.g., '1d', '4h')",
          default: "1d"
        }
      },
      required: ["name"]
    },
    implementation: async ({ name, interval = "1d" }) => {
      const { rows: coin } = await sql`
        SELECT
          id,
          "marketCap",
          categories,
          "coingeckoCategories",
          ath,
          atl,
          "circulatingSupply",
          "fullyDilutedValuation",
          "totalSupply"
        FROM "Coin"
        WHERE name ILIKE ${`%${name}%`}
      `;

      if (coin.length === 0) {
        return { error: "Coin not found" };
      }

      const { rows: trends } = await sql`
        SELECT
          "coinId",
          date,
          trend,
          streak
        FROM "SuperTrend"
        WHERE "coinId" = ${coin[0].id}
          AND "quoteSymbol" IS NULL
          AND flavor = 'CoinRotator'
          AND interval = ${interval}
        ORDER BY date DESC
        LIMIT 10
      `;

      return { coin: coin[0], trends };
    }
  }
}];

export async function POST(req) {
  const { messages, walletAddress } = await req.json();
  let hasKeyPass = false;

  try {
    hasKeyPass = await auth(walletAddress);
    if (!hasKeyPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const result = streamText({
      model: openrouter('qwen/qwen-max:online'),
      tools: functions,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
      functions: functions.reduce((acc, f) => ({
        ...acc,
        [f.function.name]: f.function.implementation
      }), {})
    });

    return result.toDataStreamResponse();
  } catch(e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}