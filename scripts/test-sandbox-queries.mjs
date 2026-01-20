#!/usr/bin/env node
/**
 * Automated sandbox testing for flat schema migration
 * Runs queries against local server and validates plan structure
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

const testQueries = [
  // Basic Coin Queries (5)
  { query: "What is Bitcoin?", category: "Basic Coin" },
  { query: "Tell me about ETH", category: "Basic Coin" },
  { query: "$SOL price and trend", category: "Basic Coin" },
  { query: "Why is DOGE pumping?", category: "Basic Coin" },
  { query: "LINK price history", category: "Basic Coin" },

  // Multi-Coin Queries (3)
  { query: "Compare BTC and ETH", category: "Multi-Coin" },
  { query: "BTC vs SOL vs AVAX", category: "Multi-Coin" },
  { query: "Show me BTC, ETH, and BNB", category: "Multi-Coin" },

  // Category/Filtered Queries (4)
  { query: "Top 5 DeFi coins", category: "Category" },
  { query: "Best AI narrative coins", category: "Category" },
  { query: "Show me Solana ecosystem tokens", category: "Category" },
  { query: "Show me Layer 2 coins", category: "Category" },

  // Market-Wide Queries (5)
  { query: "What's happening in the market today?", category: "Market" },
  { query: "Current market sentiment", category: "Market" },
  { query: "How's crypto doing right now?", category: "Market" },
  { query: "Top gainers today", category: "Market" },
  { query: "What's trending in crypto?", category: "Market" },

  // Sentiment Queries - Coin (2)
  { query: "What's the sentiment on BTC?", category: "Coin Sentiment" },
  { query: "SOL social buzz", category: "Coin Sentiment" },

  // Sentiment Queries - Category (2)
  { query: "DeFi sentiment today", category: "Category Sentiment" },
  { query: "How's the AI narrative feeling?", category: "Category Sentiment" },

  // Derivatives/Exchange Queries (3)
  { query: "Show me coins on Hyperliquid", category: "Derivatives" },
  { query: "What's available on dYdX?", category: "Derivatives" },
  { query: "Coins trading on Binance", category: "Derivatives" },

  // Funding Rate / Delta-Neutral (3)
  { query: "Best funding rate opportunities", category: "Funding" },
  { query: "Delta neutral suggestions", category: "Funding" },
  { query: "Coins with negative funding on Binance", category: "Funding" },

  // Foreach/Fanout (2)
  { query: "Top 10 DeFi coins with full details", category: "Foreach" },
  { query: "Compare top 5 meme coins", category: "Foreach" },

  // Historical Data (3)
  { query: "BTC price 24 hours ago", category: "Historical" },
  { query: "How is ETH performing vs BTC?", category: "Historical" },
  { query: "SOL performance last week", category: "Historical" },

  // Trend Analysis (3)
  { query: "Coins with aligned trends", category: "Trends" },
  { query: "Extreme movers today", category: "Trends" },
  { query: "What's pumping right now?", category: "Trends" },

  // Narratives (2)
  { query: "What narratives are hot?", category: "Narratives" },
  { query: "Show me all narratives", category: "Narratives" },

  // Market Cap Filters (2)
  { query: "Large cap coins over 10B", category: "Filters" },
  { query: "Microcap gems under 10M", category: "Filters" },

  // Contract/External Lookup (2)
  { query: "What coin is 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984?", category: "Lookup" },
  { query: "Tell me about $NEWMEME", category: "Lookup" },

  // Factual Questions (2)
  { query: "What is DeFi?", category: "Factual" },
  { query: "Explain funding rates", category: "Factual" },

  // Edge Cases (3)
  { query: "What is $PEPE?", category: "Edge" },
  { query: "Monthly market trend", category: "Edge" },
  { query: "Fear and greed index", category: "Edge" },
];

function validatePlanStructure(plan) {
  const errors = [];

  if (!Array.isArray(plan)) {
    return ['Plan is not an array'];
  }

  if (plan.length === 0) {
    return ['Plan is empty'];
  }

  plan.forEach((call, index) => {
    const prefix = `Plan[${index}] (${call.id || 'no-id'})`;

    // Check all 5 required fields
    if (!call.id) errors.push(`${prefix}: missing 'id'`);
    if (!call.tool) errors.push(`${prefix}: missing 'tool'`);
    if (call.params === undefined) errors.push(`${prefix}: missing 'params'`);
    if (typeof call.params !== 'object' || call.params === null) {
      errors.push(`${prefix}: 'params' must be an object, got ${typeof call.params}`);
    }
    if (!('after' in call)) errors.push(`${prefix}: missing 'after'`);
    if (!('foreach' in call)) errors.push(`${prefix}: missing 'foreach'`);

    // Validate after is array or null
    if (call.after !== null && !Array.isArray(call.after)) {
      errors.push(`${prefix}: 'after' must be array or null, got ${typeof call.after}`);
    }

    // Validate foreach is string or null
    if (call.foreach !== null && typeof call.foreach !== 'string') {
      errors.push(`${prefix}: 'foreach' must be string or null, got ${typeof call.foreach}`);
    }
  });

  return errors;
}

function validateToolNames(plan, knownTools) {
  const errors = [];
  const warnings = [];
  plan.forEach((call, index) => {
    if (call.tool && !knownTools.has(call.tool)) {
      errors.push(`Plan[${index}]: unknown tool '${call.tool}'`);
    }
    if (call.tool && deprecatedTools.has(call.tool)) {
      warnings.push(`Plan[${index}]: deprecated tool '${call.tool}' (use getCoinSentiment)`);
    }
  });
  return { errors, warnings };
}

// Known valid tools from Langfuse Tool Definitions (sandbox label)
// Note: getCoinSentiment should be removed - use getCoinSentimentBySymbol instead
const knownTools = new Set([
  'exaSearchWithContents', 'exaAnswer',
  'getCoinByContract', 'getCoinBySymbol', 'getCoinByName', 'getCoinById',
  'getCoinSentiment', // DEPRECATED - should be removed from Tool Definitions
  'getLatestSentiment', 'getMarketSentiment',
  'getCoinSentimentBySymbol', 'getCategorySentiment', 'getNarrativeSentiment',
  'getAllNarratives', 'getSentimentSummary', 'getSentimentHealth',
  'getCoinHistoricalMetaData', 'getAllCategories',
  'getExtremeTrends', 'getAlignedTrends', 'getCoinsByCategory',
  'getMarketHealth', 'getMarketHealthCrossing', // May be deprecated
  'getRecentTweets', 'getFilteredCoins', 'globalMarketData', 'getCategory',
  'getDeltaNeutralSuggestions', 'getCurrentMarketVibe'
]);

// Tools that should NOT be used (deprecated but still in Tool Definitions)
const deprecatedTools = new Set([
  'getCoinSentimentBySymbol' // Use getCoinSentiment instead (shorter name, same function)
]);

// NOTE: After production deploy, also remove getMarketHealth from Tool Definitions

async function runQuery(query, index, total) {
  const startTime = Date.now();

  try {
    // We'll call the API endpoint that returns the classification result
    // For now, we simulate by hitting the actual AI endpoint and checking logs
    // In practice, you'd want an endpoint that returns the plan JSON directly

    const response = await fetch(`${BASE_URL}/api/ai/test-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        query,
        success: false,
        error: `HTTP ${response.status}: ${text.substring(0, 200)}`
      };
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    // Validate plan structure
    const structureErrors = validatePlanStructure(data.plan || []);
    const { errors: toolErrors, warnings: toolWarnings } = validateToolNames(data.plan || [], knownTools);
    const allErrors = [...structureErrors, ...toolErrors];
    const allWarnings = toolWarnings;

    return {
      query,
      success: allErrors.length === 0,
      hasWarnings: allWarnings.length > 0,
      elapsed,
      queryType: data.queryType,
      planLength: data.plan?.length || 0,
      tools: data.plan?.map(c => c.tool) || [],
      plan: data.plan, // Include full plan for debugging
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };

  } catch (error) {
    return {
      query,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Sandbox Query Testing - Flat Schema Validation');
  console.log('='.repeat(70));
  console.log(`Testing ${testQueries.length} queries against ${BASE_URL}\n`);

  // Check if test endpoint exists
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/ai/test-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' })
    });

    if (healthCheck.status === 404) {
      console.log('⚠️  /api/ai/test-classify endpoint not found.');
      console.log('   Create this endpoint to return just the classification plan.\n');
      console.log('   Expected response format:');
      console.log('   { queryType, description, plan, additionalContext }\n');
      console.log('   For now, run queries manually and check terminal logs.');
      process.exit(1);
    }
  } catch (e) {
    console.log(`❌ Cannot connect to ${BASE_URL}`);
    console.log('   Make sure yarn dev is running.\n');
    process.exit(1);
  }

  const results = [];
  const byCategory = {};

  for (let i = 0; i < testQueries.length; i++) {
    const { query, category } = testQueries[i];
    process.stdout.write(`[${i + 1}/${testQueries.length}] ${category}: "${query.substring(0, 40)}..." `);

    const result = await runQuery(query, i, testQueries.length);
    results.push({ ...result, category });

    if (!byCategory[category]) byCategory[category] = { pass: 0, fail: 0 };

    if (result.success) {
      byCategory[category].pass++;
      const warnIcon = result.hasWarnings ? ' ⚠️' : '';
      console.log(`✅ ${result.elapsed}ms (${result.planLength} calls)${warnIcon}`);
      if (result.warnings) {
        result.warnings.forEach(w => console.log(`   ⚠️ ${w}`));
      }
    } else {
      byCategory[category].fail++;
      console.log(`❌`);
      if (result.errors) {
        result.errors.forEach(e => console.log(`   - ${e}`));
      } else if (result.error) {
        console.log(`   - ${result.error}`);
      }
      // Show problematic calls for debugging
      if (result.plan) {
        const badCalls = result.plan.filter(c => !knownTools.has(c.tool) || deprecatedTools.has(c.tool));
        if (badCalls.length > 0) {
          console.log(`   Plan excerpt (bad calls):`);
          badCalls.forEach(c => {
            console.log(`     { id: "${c.id}", tool: "${c.tool}", params: ${JSON.stringify(c.params)} }`);
          });
        }
      }
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nOverall: ${passed}/${results.length} passed (${((passed/results.length)*100).toFixed(1)}%)\n`);

  console.log('By Category:');
  for (const [cat, counts] of Object.entries(byCategory)) {
    const total = counts.pass + counts.fail;
    const pct = ((counts.pass / total) * 100).toFixed(0);
    const icon = counts.fail === 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${cat}: ${counts.pass}/${total} (${pct}%)`);
  }

  if (failed > 0) {
    console.log('\n❌ Failed Queries:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - "${r.query}"`);
      if (r.errors) r.errors.slice(0, 3).forEach(e => console.log(`      ${e}`));
      if (r.error) console.log(`      ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  if (failed === 0) {
    console.log('🎉 All queries passed! Flat schema is working correctly.');
  } else {
    console.log(`⚠️  ${failed} queries need attention.`);
  }
}

main().catch(console.error);
