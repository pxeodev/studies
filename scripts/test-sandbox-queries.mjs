#!/usr/bin/env node
/**
 * Automated sandbox testing for flat schema migration
 * Runs queries against local server and validates plan structure
 *
 * Outputs full execution plans for AI evaluation of semantic correctness
 * Tracks retry counts and auto-fixes for prompt/model refinement
 *
 * SEMANTIC QA MODE (--semantic):
 * Generates a markdown report optimized for AI agent review.
 * The agent can analyze plans from a senior crypto trader perspective
 * and identify issues like wasteful API calls, missing data, wrong tools, etc.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const VERBOSE = process.env.VERBOSE === 'true' || process.argv.includes('--verbose');
const SEMANTIC_QA = process.argv.includes('--semantic');

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

// Semantic analysis: What tools SHOULD be called for each category
const expectedToolPatterns = {
  'Basic Coin': {
    required: ['getCoinBySymbol', 'getCoinByName'],  // At least one
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories', 'getFilteredCoins'],
    notes: 'Single coin queries should fetch coin data directly, not filter lists'
  },
  'Multi-Coin': {
    required: ['getCoinBySymbol', 'getCoinByName'],
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Multiple explicit coins should be fetched directly, not via filters'
  },
  'Category': {
    required: ['getFilteredCoins'],
    recommended: ['getCurrentMarketVibe', 'getCategory'],
    wasteful: ['getAllCategories'],  // Categories should be known from prompt
    notes: 'Category queries should use getFilteredCoins with categories param, NOT getAllCategories first'
  },
  'Market': {
    required: ['getLatestSentiment', 'getCurrentMarketVibe'],
    recommended: ['getAllNarratives'],
    wasteful: ['getCoinBySymbol', 'getCoinByName'],  // Unless BTC/ETH reference
    notes: 'Market queries need sentiment data. BTC/ETH fetch is OK for reference but not required'
  },
  'Coin Sentiment': {
    required: ['getCoinSentiment'],
    recommended: ['getCoinBySymbol', 'getCurrentMarketVibe'],
    wasteful: ['getAllCategories', 'getFilteredCoins'],
    notes: 'Coin sentiment should use getCoinSentiment with the specific symbol'
  },
  'Category Sentiment': {
    required: ['getCategorySentiment', 'getAllNarratives'],  // At least one
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Category sentiment should use getCategorySentiment or getAllNarratives'
  },
  'Derivatives': {
    required: ['getFilteredCoins'],
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Derivatives queries must use getFilteredCoins with exchanges param'
  },
  'Funding': {
    required: ['getDeltaNeutralSuggestions'],
    recommended: ['getLatestSentiment', 'getCurrentMarketVibe'],
    wasteful: ['getAllCategories', 'getCoinBySymbol'],
    notes: 'Funding queries should use getDeltaNeutralSuggestions, not manual coin lookups'
  },
  'Foreach': {
    required: ['getFilteredCoins'],
    recommended: ['getCoinByName', 'getCoinSentiment'],
    wasteful: ['getAllCategories'],
    notes: 'Foreach queries should fetch list then fan out for details'
  },
  'Historical': {
    required: ['getCoinHistoricalMetaData'],
    recommended: ['getCoinBySymbol', 'getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Historical queries MUST include getCoinHistoricalMetaData with proper coinId'
  },
  'Trends': {
    required: ['getExtremeTrends', 'getAlignedTrends', 'getFilteredCoins'],  // At least one
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Trend queries should use trend-specific tools or filtered coins with trend params'
  },
  'Narratives': {
    required: ['getAllNarratives'],
    recommended: ['getCurrentMarketVibe', 'getLatestSentiment'],
    wasteful: ['getAllCategories', 'getFilteredCoins'],
    notes: 'Narrative queries should use getAllNarratives directly'
  },
  'Filters': {
    required: ['getFilteredCoins'],
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories'],
    notes: 'Filter queries should use getFilteredCoins with appropriate params'
  },
  'Lookup': {
    required: ['getCoinByContract', 'getCoinBySymbol', 'getCoinByName', 'exaAnswer', 'exaSearchWithContents'],
    recommended: ['getCurrentMarketVibe'],
    wasteful: ['getAllCategories', 'getFilteredCoins'],
    notes: 'Unknown coin lookups should try direct lookup, then external search'
  },
  'Factual': {
    required: ['exaAnswer', 'exaSearchWithContents'],  // At least one for factual
    recommended: [],
    wasteful: ['getCoinBySymbol', 'getFilteredCoins', 'getAllCategories'],
    notes: 'Factual questions should use exa tools for web lookup, not coin tools'
  },
  'Edge': {
    required: [],
    recommended: ['getCurrentMarketVibe'],
    wasteful: [],
    notes: 'Edge cases vary - evaluate based on query intent'
  }
};

function analyzeSemantics(result) {
  const analysis = {
    issues: [],
    warnings: [],
    goodPractices: []
  };

  const pattern = expectedToolPatterns[result.category];
  if (!pattern) return analysis;

  const tools = result.tools || [];
  const toolSet = new Set(tools);

  // Check for wasteful calls
  pattern.wasteful.forEach(wastefulTool => {
    if (toolSet.has(wastefulTool)) {
      analysis.issues.push(`WASTEFUL: Uses ${wastefulTool} - ${pattern.notes}`);
    }
  });

  // Check for missing required tools (at least one)
  const hasRequired = pattern.required.some(t => toolSet.has(t));
  if (pattern.required.length > 0 && !hasRequired) {
    analysis.warnings.push(`MISSING: Should use one of [${pattern.required.join(', ')}]`);
  }

  // Check for recommended tools
  pattern.recommended.forEach(recTool => {
    if (toolSet.has(recTool)) {
      analysis.goodPractices.push(`Good: Uses ${recTool}`);
    }
  });

  // Check for getCurrentMarketVibe (should be in most queries)
  if (!toolSet.has('getCurrentMarketVibe') && result.category !== 'Factual') {
    analysis.warnings.push('MISSING: getCurrentMarketVibe for market context');
  }

  // Check for BTC/ETH fetch (required per prompt rules)
  const hasBtcEth = tools.some(t =>
    (t === 'getCoinBySymbol' || t === 'getCoinByName') &&
    result.plan?.some(p => p.tool === t && (p.params?.symbol === 'BTC' || p.params?.symbol === 'ETH' || p.params?.name === 'Bitcoin' || p.params?.name === 'Ethereum'))
  );
  if (!hasBtcEth && result.category !== 'Factual' && result.category !== 'Lookup') {
    // Check plan for BTC/ETH
    const planHasBtcEth = result.plan?.some(p =>
      p.params?.symbol === 'BTC' || p.params?.symbol === 'ETH' ||
      p.params?.name?.toLowerCase()?.includes('bitcoin') || p.params?.name?.toLowerCase()?.includes('ethereum')
    );
    if (!planHasBtcEth) {
      analysis.warnings.push('MISSING: BTC/ETH reference fetch (required by prompt rules)');
    }
  }

  // Check foreach patterns
  const foreachCalls = result.plan?.filter(p => p.foreach) || [];
  foreachCalls.forEach(call => {
    // Check if foreach source exists
    const sourceExists = result.plan?.some(p => p.id === call.foreach);
    if (!sourceExists) {
      analysis.issues.push(`BROKEN FOREACH: "${call.id}" references non-existent source "${call.foreach}"`);
    }
    // Check if foreach is in after
    if (call.after && !call.after.includes(call.foreach)) {
      analysis.issues.push(`FOREACH ORDER: "${call.id}" has foreach="${call.foreach}" but it's not in after array`);
    }
  });

  // Check for unresolved placeholders
  result.plan?.forEach(call => {
    const paramsStr = JSON.stringify(call.params || {});
    if (paramsStr.includes('{result.') && !call.foreach && !call.after?.length) {
      analysis.issues.push(`UNRESOLVED: "${call.id}" has {result.*} placeholder but no dependencies`);
    }
  });

  return analysis;
}

function generateSemanticReport(results) {
  let report = `# Semantic QA Report - Classification Prompt Analysis

Generated: ${new Date().toISOString()}

## Executive Summary

This report analyzes execution plans from a **senior crypto trader perspective**.
Each plan is evaluated for:
- **Trading Alpha**: Does it fetch the right data to answer the query?
- **Efficiency**: Are there wasteful API calls?
- **Completeness**: Is any critical data missing?

---

## Issues by Severity

`;

  const allIssues = [];
  const allWarnings = [];
  const allGood = [];

  results.forEach(r => {
    const analysis = analyzeSemantics(r);
    analysis.issues.forEach(i => allIssues.push({ query: r.query, category: r.category, issue: i }));
    analysis.warnings.forEach(w => allWarnings.push({ query: r.query, category: r.category, warning: w }));
    analysis.goodPractices.forEach(g => allGood.push({ query: r.query, category: r.category, good: g }));
  });

  report += `### 🔴 Critical Issues (${allIssues.length})\n\n`;
  if (allIssues.length === 0) {
    report += `None found.\n\n`;
  } else {
    allIssues.forEach(({ query, category, issue }) => {
      report += `- **[${category}]** "${query}"\n  - ${issue}\n`;
    });
    report += '\n';
  }

  report += `### 🟡 Warnings (${allWarnings.length})\n\n`;
  if (allWarnings.length === 0) {
    report += `None found.\n\n`;
  } else {
    allWarnings.forEach(({ query, category, warning }) => {
      report += `- **[${category}]** "${query}"\n  - ${warning}\n`;
    });
    report += '\n';
  }

  report += `### 🟢 Good Practices (${allGood.length})\n\n`;
  if (allGood.length > 0) {
    const grouped = {};
    allGood.forEach(({ good }) => {
      grouped[good] = (grouped[good] || 0) + 1;
    });
    Object.entries(grouped).forEach(([practice, count]) => {
      report += `- ${practice}: ${count} queries\n`;
    });
  }
  report += '\n';

  report += `---

## Detailed Plan Analysis

Below are all execution plans for manual review. Look for:
1. **Wasteful getAllCategories calls** - categories should be resolved from prompt
2. **Missing sentiment data** - market queries need getLatestSentiment
3. **Missing historical data** - comparison queries need getCoinHistoricalMetaData
4. **Broken foreach chains** - ensure source exists and is in after array
5. **Unresolved placeholders** - {result.*} with no dependencies

`;

  // Group by category
  const byCategory = {};
  results.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  });

  Object.entries(byCategory).forEach(([category, categoryResults]) => {
    const pattern = expectedToolPatterns[category];
    report += `### ${category}\n\n`;
    report += `**Expected pattern**: ${pattern?.notes || 'N/A'}\n\n`;

    categoryResults.forEach(r => {
      const analysis = analyzeSemantics(r);
      const statusIcon = r.success ? (analysis.issues.length > 0 ? '🟡' : '✅') : '❌';

      report += `#### ${statusIcon} "${r.query}"\n\n`;
      report += `- **QueryType**: ${r.queryType}\n`;
      report += `- **Description**: ${r.description}\n`;
      report += `- **Tools**: ${r.tools?.join(', ') || 'none'}\n`;
      report += `- **Attempts**: ${r.attempts || 1}`;
      if (r.autoFixes?.length > 0) {
        report += ` (${r.autoFixes.length} auto-fixes)`;
      }
      report += '\n';

      if (analysis.issues.length > 0) {
        report += `- **Issues**: \n`;
        analysis.issues.forEach(i => report += `  - 🔴 ${i}\n`);
      }
      if (analysis.warnings.length > 0) {
        report += `- **Warnings**: \n`;
        analysis.warnings.forEach(w => report += `  - 🟡 ${w}\n`);
      }

      report += `\n<details>\n<summary>View Plan (${r.plan?.length || 0} calls)</summary>\n\n`;
      report += '```json\n' + JSON.stringify(r.plan, null, 2) + '\n```\n';
      report += '</details>\n\n';
    });
  });

  report += `---

## Recommendations for Prompt Improvement

Based on the analysis above, consider these prompt refinements:

1. **If getAllCategories is called frequently**: Add the categories list inline via \`all-categories-list\` prompt reference
2. **If BTC/ETH fetches are missing**: Reinforce the "always fetch BTC/ETH" rule in the prompt
3. **If historical data is missing for comparisons**: Add explicit rule about getCoinHistoricalMetaData for delta calculations
4. **If sentiment is missing for market queries**: Emphasize getLatestSentiment requirement

---

*Report generated by test-sandbox-queries.mjs --semantic*
`;

  return report;
}

async function runQuery(query) {
  const startTime = Date.now();

  try {
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

    // Extract metadata (retries, auto-fixes)
    const metadata = data._metadata || { attempts: 1, errors: [], autoFixes: [], finalSuccess: true };

    // Validate plan structure
    const structureErrors = validatePlanStructure(data.plan || []);
    const { errors: toolErrors, warnings: toolWarnings } = validateToolNames(data.plan || [], knownTools);
    const allErrors = [...structureErrors, ...toolErrors];
    const allWarnings = toolWarnings;

    return {
      query,
      success: allErrors.length === 0 && metadata.finalSuccess,
      hasWarnings: allWarnings.length > 0,
      elapsed,
      queryType: data.queryType,
      description: data.description,
      planLength: data.plan?.length || 0,
      tools: data.plan?.map(c => c.tool) || [],
      plan: data.plan, // Full plan for AI evaluation
      additionalContext: data.additionalContext,
      // Retry/auto-fix metadata
      attempts: metadata.attempts,
      retryErrors: metadata.errors,
      autoFixes: metadata.autoFixes,
      // Validation results
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
  let totalRetries = 0;
  let totalAutoFixes = 0;
  const queriesWithRetries = [];
  const queriesWithAutoFixes = [];

  for (let i = 0; i < testQueries.length; i++) {
    const { query, category } = testQueries[i];
    process.stdout.write(`[${i + 1}/${testQueries.length}] ${category}: "${query.substring(0, 40)}..." `);

    const result = await runQuery(query, i, testQueries.length);
    results.push({ ...result, category });

    if (!byCategory[category]) byCategory[category] = { pass: 0, fail: 0 };

    // Track retries and auto-fixes
    if (result.attempts > 1) {
      totalRetries += (result.attempts - 1);
      queriesWithRetries.push({ query, attempts: result.attempts, errors: result.retryErrors });
    }
    if (result.autoFixes && result.autoFixes.length > 0) {
      totalAutoFixes += result.autoFixes.length;
      queriesWithAutoFixes.push({ query, fixes: result.autoFixes });
    }

    if (result.success) {
      byCategory[category].pass++;
      const retryIcon = result.attempts > 1 ? ` 🔄${result.attempts}` : '';
      const fixIcon = result.autoFixes?.length > 0 ? ` 🔧${result.autoFixes.length}` : '';
      const warnIcon = result.hasWarnings ? ' ⚠️' : '';
      console.log(`✅ ${result.elapsed}ms (${result.planLength} calls)${retryIcon}${fixIcon}${warnIcon}`);
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

  console.log(`\nOverall: ${passed}/${results.length} passed (${((passed/results.length)*100).toFixed(1)}%)`);
  console.log(`Retries: ${totalRetries} (${queriesWithRetries.length} queries needed retries)`);
  console.log(`Auto-fixes: ${totalAutoFixes} (${queriesWithAutoFixes.length} queries had auto-fixes)\n`);

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

  // Show queries that needed retries
  if (queriesWithRetries.length > 0) {
    console.log('\n🔄 Queries that needed retries:');
    queriesWithRetries.forEach(({ query, attempts, errors }) => {
      console.log(`  - "${query}" (${attempts} attempts)`);
      errors?.forEach(e => console.log(`      Attempt ${e.attempt}: ${e.message}`));
    });
  }

  // Show queries that had auto-fixes
  if (queriesWithAutoFixes.length > 0) {
    console.log('\n🔧 Queries with auto-fixes applied:');
    queriesWithAutoFixes.forEach(({ query, fixes }) => {
      console.log(`  - "${query}"`);
      fixes.forEach(f => console.log(`      ${f}`));
    });
  }

  console.log('\n' + '='.repeat(70));
  if (failed === 0) {
    console.log('🎉 All queries passed! Flat schema is working correctly.');
  } else {
    console.log(`⚠️  ${failed} queries need attention.`);
  }

  // Always write results to JSON file for AI evaluation
  const fs = await import('fs');
  const outputPath = './scripts/test-results.json';
  const outputData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      passRate: ((passed/results.length)*100).toFixed(1) + '%',
      totalRetries,
      queriesWithRetries: queriesWithRetries.length,
      totalAutoFixes,
      queriesWithAutoFixes: queriesWithAutoFixes.length
    },
    retryDetails: queriesWithRetries,
    autoFixDetails: queriesWithAutoFixes,
    results: results.map(r => ({
      query: r.query,
      category: r.category,
      success: r.success,
      queryType: r.queryType,
      description: r.description,
      attempts: r.attempts || 1,
      autoFixes: r.autoFixes || [],
      plan: r.plan,
      additionalContext: r.additionalContext,
      errors: r.errors,
      warnings: r.warnings
    }))
  };
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n📄 Full results written to: ${outputPath}`);

  // Generate semantic QA report if requested
  if (SEMANTIC_QA) {
    const semanticReportPath = './scripts/semantic-qa-report.md';
    const semanticReport = generateSemanticReport(results);
    fs.writeFileSync(semanticReportPath, semanticReport);
    console.log(`📊 Semantic QA report written to: ${semanticReportPath}`);
    console.log('\n💡 TIP: Read the report with Claude to get AI-powered analysis of plan quality');
  }

  // Output full results for AI evaluation (in verbose mode or to file)
  if (VERBOSE) {
    console.log('\n' + '='.repeat(70));
    console.log('DETAILED RESULTS FOR AI EVALUATION');
    console.log('='.repeat(70));
    results.forEach((r, i) => {
      console.log(`\n--- Query ${i + 1}: "${r.query}" ---`);
      console.log(`Category: ${r.category}`);
      console.log(`Status: ${r.success ? 'PASS' : 'FAIL'}`);
      console.log(`QueryType: ${r.queryType}`);
      console.log(`Description: ${r.description}`);
      console.log(`Attempts: ${r.attempts || 1}`);
      if (r.autoFixes?.length > 0) {
        console.log(`Auto-fixes: ${r.autoFixes.join('; ')}`);
      }
      console.log(`Plan (${r.planLength} calls):`);
      console.log(JSON.stringify(r.plan, null, 2));
      if (r.additionalContext) {
        console.log(`AdditionalContext: ${r.additionalContext}`);
      }
    });
  }
}

main().catch(console.error);
