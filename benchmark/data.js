// Competitor Evaluation Study v2 — Scoring Data
// Generated: 2026-03-11
// Methodology: 5-dimension weighted rubric (Comprehension 20%, Actionability 25%, Originality 15%, Accuracy 25%, Risk Awareness 15%)
// Scale: 1-10 per dimension, weighted composite per question

const STUDY_DATA = {
  meta: {
    title: "AI Crypto Analyst Benchmark v2",
    subtitle: "6 Platforms · 9 Questions · 270 Individual Scores",
    date: "2026-03-11",
    token: "HYPE (Hyperliquid)",
    btcPrice: "$69,800",
    methodology: "Identical prompts submitted to each platform over about 26 hours. Responses scored on 5 weighted dimensions. Anti-bias rule: competitors scored fairly even if they outperform the baseline."
  },

  dimensions: [
    { key: "comprehension", label: "Comprehension", weight: 0.20, description: "Understanding of the question, depth of context, market awareness" },
    { key: "actionability", label: "Actionability", weight: 0.25, description: "Specific, executable recommendations with levels, sizing, and timing" },
    { key: "originality", label: "Originality", weight: 0.15, description: "Novel insights beyond generic responses, unique frameworks" },
    { key: "accuracy", label: "Accuracy", weight: 0.25, description: "Factual correctness, use of current data, verifiable claims" },
    { key: "riskAwareness", label: "Risk Awareness", weight: 0.15, description: "Identification and management of risks, honest limitations" }
  ],

  questions: [
    { id: "q1", label: "Q1", title: "HYPE Token Outlook", description: "Full current outlook on Hyperliquid (HYPE) — price action, on-chain activity, ecosystem developments" },
    { id: "q2", label: "Q2", title: "BTC 7-Day Plan", description: "Bitcoin outlook for next 7 days with specific entry/exit levels, stop losses, and position sizing" },
    { id: "q3", label: "Q3", title: "Hidden Risks", description: "Hidden or under-the-radar risks in crypto markets right now" },
    { id: "q4", label: "Q4", title: "Funding Rates", description: "Funding rate environment across major crypto perpetual futures and positioning implications" },
    { id: "q5", label: "Q5", title: "48h Monitoring Plan", description: "48-hour tactical monitoring plan with specific triggers and actions" },
    { id: "q6", label: "Q6", title: "BTC -20% Cascade", description: "If BTC drops 20% from here, walk through the cascade — what breaks first, contagion path, where it stops" },
    { id: "q7", label: "Q7", title: "Backtested Evidence", description: "Backtested evidence for top trade idea — win rate, max drawdown, specific parameters" },
    { id: "q8", label: "Q8", title: "Market Regime", description: "Current market regime analysis — mean reversion or trend-following, and strategy implications" },
    { id: "q9", label: "Q9", title: "ONE Metric", description: "If you could give only ONE metric or signal for your next trading decision" }
  ],

  platforms: {
    grok: {
      name: "Grok",
      color: "#000000",
      accent: "#1DA1F2",
      tagline: "xAI's real-time research engine",
      avgScore: 8.67,
      rank: 1,
      strengths: [
        "Actually ran a real backtest with Polygon data for Q7",
        "Quantitative regime detection with Kaufman's Efficiency Ratio",
        "51 sources cited for funding rates alone",
        "Honest about negative backtest results (31.2% WR, -15% cumulative)"
      ],
      weaknesses: [
        "Verbose — long disclaimer sections",
        "Funding rate as ONE metric is a common choice (Q9)"
      ],
      standoutResponse: "Q7 — The only platform that actually ran a mechanical backtest with real price data"
    },
    gemini: {
      name: "Gemini",
      color: "#4285F4",
      accent: "#34A853",
      tagline: "Google's multimodal AI",
      avgScore: 8.28,
      rank: 2,
      strengths: [
        "CVD Absorption as ONE metric — most original answer across all platforms",
        "Context-aware (references Pine Script, order flow coding)",
        "Devil's Advocate section in Q7 backtest response",
        "Delta-neutral yield pivot recommendation in Q8"
      ],
      weaknesses: [
        "Slightly less data-dense than Grok",
        "Some responses lean theoretical"
      ],
      standoutResponse: "Q9 — CVD Absorption with sweep→aggression→absorption pattern detection"
    },
    deepseek: {
      name: "DeepSeek",
      color: "#5B6AFF",
      accent: "#7B8AFF",
      tagline: "Chinese AI with web search",
      avgScore: 7.89,
      rank: 3,
      strengths: [
        "MicroStrategy STRC stress test (Q6) — most dangerous contagion vector identified",
        "Correct BTC price ($69,800) with 10 web citations per response",
        "Three strategy tiers by timeframe in Q8",
        "200-week EMA binary framework in Q9"
      ],
      weaknesses: [
        "Q7 claims '100% historical win rate' — dubious and unverified",
        "Occasional Chinese characters in output",
        "Some responses feel web-aggregated rather than synthesized"
      ],
      standoutResponse: "Q6 — MicroStrategy STRC preferred shares forced liquidation analysis"
    },
    chatgpt: {
      name: "ChatGPT",
      color: "#10A37F",
      accent: "#1A7F64",
      tagline: "OpenAI's flagship model",
      avgScore: 7.66,
      rank: 4,
      strengths: [
        "OI Delta × Price 2×2 matrix for Q9 — elegant and practical",
        "References actual academic papers (Quantpedia/SSRN) for Q7",
        "Clean, well-structured prose",
        "Honest about discretionary vs systematic gap in Q7"
      ],
      weaknesses: [
        "Less data-dense than web-enabled competitors",
        "Some responses feel safe rather than insightful",
        "No real-time data integration"
      ],
      standoutResponse: "Q9 — OI × Price 2×2 matrix is immediately usable by any trader"
    },
    perplexity: {
      name: "Perplexity",
      color: "#20808D",
      accent: "#2BA0AD",
      tagline: "AI-powered search engine",
      avgScore: 5.28,
      rank: 5,
      strengths: [
        "Q2 is competitive — specific levels with Fear & Greed context",
        "Q5 has good account-level risk framework (drawdown limits)",
        "Q3 compliance pools / liquidity splintering is a unique insight"
      ],
      weaknesses: [
        "Q7 pivoted to GOLD (XAUUSD) instead of crypto — completely off-topic",
        "Q8 answered about traditional markets (energy, metals, VIX) — not crypto",
        "Q9 gave generic trading concept (R-multiple) instead of a market signal",
        "Free tier truncated Q3 response mid-sentence"
      ],
      standoutResponse: "Q2 — The only competitive response; most others were poor quality"
    },
    chaingpt: {
      name: "ChainGPT",
      color: "#2B5CE7",
      accent: "#4B7CF7",
      tagline: "Crypto-native AI assistant",
      avgScore: 4.10,
      rank: 6,
      strengths: [
        "Crypto-native focus — at least stays on topic",
        "Basic risk framework in Q3"
      ],
      weaknesses: [
        "Wrong BTC price ($60,000 assumed vs actual $69,800)",
        "Explicitly admitted no backtested data for Q7",
        "Fear & Greed Index as ONE metric — most generic answer possible",
        "Generic textbook-level responses throughout"
      ],
      standoutResponse: "None — consistently the weakest performer"
    }
  },

  // Per-question, per-platform scores
  // Format: [comprehension, actionability, originality, accuracy, riskAwareness, weightedTotal]
  scores: {
    grok: {
      q1: [9, 7, 9, 9, 8, 8.35],
      q2: [9, 10, 7, 8, 9, 8.70],
      q3: [9, 7, 9, 9, 10, 8.65],
      q4: [9, 8, 8, 9, 8, 8.45],
      q5: [9, 10, 8, 8, 9, 8.85],
      q6: [9, 7, 8, 9, 9, 8.35],
      q7: [10, 9, 10, 9, 9, 9.35],
      q8: [10, 9, 9, 9, 8, 9.05],
      q9: [9, 9, 7, 8, 8, 8.30]
    },
    gemini: {
      q1: [9, 7, 9, 9, 7, 8.20],
      q2: [8, 8, 7, 8, 8, 7.85],
      q3: [9, 7, 8, 8, 9, 8.10],
      q4: [8, 8, 7, 8, 7, 7.70],
      q5: [9, 9, 9, 8, 8, 8.60],
      q6: [9, 7, 8, 8, 9, 8.10],
      q7: [9, 9, 9, 8, 9, 8.75],
      q8: [9, 9, 9, 8, 8, 8.60],
      q9: [9, 9, 10, 8, 7, 8.60]
    },
    deepseek: {
      q1: [9, 7, 8, 9, 7, 8.05],
      q2: [8, 9, 7, 9, 8, 8.35],
      q3: [9, 7, 8, 8, 9, 8.10],
      q4: [8, 7, 7, 8, 7, 7.45],
      q5: [8, 9, 8, 8, 7, 8.10],
      q6: [9, 7, 9, 9, 9, 8.50],
      q7: [7, 7, 7, 5, 5, 6.20],
      q8: [9, 9, 8, 8, 8, 8.45],
      q9: [8, 9, 6, 8, 7, 7.80]
    },
    chatgpt: {
      q1: [8, 7, 7, 7, 7, 7.20],
      q2: [8, 9, 7, 7, 8, 7.85],
      q3: [9, 6, 8, 8, 9, 7.85],
      q4: [8, 8, 7, 7, 7, 7.45],
      q5: [8, 9, 6, 7, 7, 7.55],
      q6: [8, 6, 7, 7, 8, 7.10],
      q7: [9, 8, 8, 8, 8, 8.20],
      q8: [8, 8, 7, 7, 7, 7.45],
      q9: [9, 9, 8, 8, 7, 8.30]
    },
    perplexity: {
      q1: [6, 5, 4, 6, 5, 5.30],
      q2: [7, 8, 6, 7, 7, 7.10],
      q3: [8, 5, 7, 7, 8, 6.85],
      q4: [6, 5, 4, 6, 5, 5.30],
      q5: [7, 8, 6, 6, 8, 7.00],
      q6: [6, 4, 4, 5, 5, 4.80],
      q7: [3, 3, 2, 2, 3, 2.60],
      q8: [4, 4, 3, 3, 4, 3.60],
      q9: [5, 5, 4, 5, 6, 5.00]
    },
    chaingpt: {
      q1: [5, 4, 3, 4, 5, 4.20],
      q2: [4, 5, 3, 3, 5, 4.00],
      q3: [6, 4, 4, 5, 6, 4.95],
      q4: [5, 4, 3, 5, 4, 4.30],
      q5: [5, 5, 3, 4, 5, 4.45],
      q6: [5, 4, 3, 4, 5, 4.20],
      q7: [3, 2, 2, 2, 3, 2.35],
      q8: [5, 4, 3, 4, 4, 4.05],
      q9: [5, 5, 2, 5, 4, 4.40]
    }
  },

  // Notable per-question highlights
  questionHighlights: {
    q1: {
      bestPlatform: "grok",
      bestScore: 8.35,
      worstPlatform: "chaingpt",
      worstScore: 4.20,
      insight: "Grok cited $10.08B in 24h perps volume, $1.72B TVL with protocol-level breakdown. ChainGPT gave a generic overview without specific metrics."
    },
    q2: {
      bestPlatform: "grok",
      bestScore: 8.70,
      worstPlatform: "chaingpt",
      worstScore: 4.00,
      insight: "Grok provided position sizing formula, isolated margin recommendation, and 30 sources. ChainGPT used wrong BTC price ($60K vs actual $69.8K)."
    },
    q3: {
      bestPlatform: "grok",
      bestScore: 8.65,
      worstPlatform: "chaingpt",
      worstScore: 4.95,
      insight: "Grok identified 694% surge in state-sponsored sanctions evasion (Chainalysis 2026 report), quantum infrastructure threats, and 2026 tax liquidation trap."
    },
    q4: {
      bestPlatform: "grok",
      bestScore: 8.45,
      worstPlatform: "chaingpt",
      worstScore: 4.30,
      insight: "Grok provided exchange-by-exchange rates with 51 sources. Noted BTC negative for 3 consecutive weeks — first since Nov 2022."
    },
    q5: {
      bestPlatform: "grok",
      bestScore: 8.85,
      worstPlatform: "chaingpt",
      worstScore: 4.45,
      insight: "Grok built a complete monitoring system: 4h/8h/daily cadence, TradingView alert setup, Coinglass dashboard pins, and a color-coded decision matrix."
    },
    q6: {
      bestPlatform: "deepseek",
      bestScore: 8.50,
      worstPlatform: "chaingpt",
      worstScore: 4.20,
      insight: "DeepSeek's MicroStrategy STRC preferred shares stress test was the most specific contagion vector identified across all platforms."
    },
    q7: {
      bestPlatform: "grok",
      bestScore: 9.35,
      worstPlatform: "chaingpt",
      worstScore: 2.35,
      insight: "Grok actually ran a mechanical backtest: 16 trades, 31.2% WR, -15% cumulative, with honest assessment. Perplexity pivoted to gold. ChainGPT admitted no data."
    },
    q8: {
      bestPlatform: "grok",
      bestScore: 9.05,
      worstPlatform: "perplexity",
      worstScore: 3.60,
      insight: "Grok computed Kaufman's Efficiency Ratio (0.107) and return autocorrelation (-0.115). Perplexity answered about energy/metals markets instead of crypto."
    },
    q9: {
      bestPlatform: "gemini",
      bestScore: 8.60,
      worstPlatform: "chaingpt",
      worstScore: 4.40,
      insight: "Gemini's CVD Absorption was the most original answer. ChatGPT's OI×Price matrix was the most practical. ChainGPT defaulted to Fear & Greed Index."
    }
  },

  // Senior Engineer Critique
  critique: {
    title: "Methodology Critique: How to Properly Benchmark AI Trading Analysts",
    author: "Senior Engineer Review",
    grade: "B-",
    gradeExplanation: "Solid first attempt with good question design, but significant methodological gaps that would not pass peer review in a rigorous evaluation.",

    whatWorked: [
      {
        point: "Question Design Covers the Full Stack",
        detail: "The 9 questions test fundamentally different capabilities: real-time data retrieval (Q1, Q4), tactical planning (Q2, Q5), systemic thinking (Q3, Q6), quantitative rigor (Q7, Q8), and signal distillation (Q9). This is better than most AI benchmarks that test a single dimension."
      },
      {
        point: "Anti-Bias Rule is Credible",
        detail: "The explicit instruction to 'score competitors fairly even if they outperform Shumi' — and the fact that Shumi wasn't even tested in this round — adds credibility. Most vendor benchmarks wouldn't leave their own product out."
      },
      {
        point: "Weighted Scoring Reflects Real Trader Needs",
        detail: "Actionability (25%) and Accuracy (25%) getting the highest weights is correct. A beautiful analysis that's factually wrong or can't be traded is worthless. The 50% combined weight on these two dimensions is a defensible design choice."
      }
    ],

    whatNeedsWork: [
      {
        severity: "critical",
        point: "Single Evaluator Bias",
        detail: "All 270 scores were assigned by one evaluator (the AI conducting the study). This is the single biggest methodological flaw. Best practice: minimum 3 independent raters with inter-rater reliability measured (Krippendorff's alpha ≥ 0.67). Without this, the scores reflect one perspective, not ground truth.",
        fix: "Use 3+ human domain experts. Compute inter-rater agreement. Publish disagreements."
      },
      {
        severity: "critical",
        point: "No Ground Truth Verification",
        detail: "Accuracy scored 25% of the total, but no systematic fact-checking was performed. Example: DeepSeek claimed '100% historical win rate' for its power-law strategy — this received Accuracy: 5, but should have been cross-verified against actual BTC price history. Grok's backtest numbers (31.2% WR) were accepted at face value.",
        fix: "For accuracy-critical claims, verify against independent data sources. Create a fact-check ledger alongside scoring."
      },
      {
        severity: "high",
        point: "Temporal Contamination",
        detail: "Responses were collected over multiple sessions (not all in the same hour). Market conditions change. A platform queried at 9am may give different answers than one queried at 9pm. This is especially problematic for Q4 (funding rates) and Q5 (48h plan) where real-time data matters.",
        fix: "Submit all queries within a 30-minute window. Record exact timestamps. Note market conditions at time of each submission."
      },
      {
        severity: "high",
        point: "No Blind Scoring",
        detail: "The evaluator knew which platform produced each response during scoring. This introduces unconscious anchoring — if Grok's Q1 was excellent, the evaluator may subconsciously give Grok's Q2 a boost. Halo effects are well-documented in evaluation research.",
        fix: "Strip platform identifiers. Randomize response order. Score each Q×dimension independently without seeing other scores."
      },
      {
        severity: "medium",
        point: "Free vs Paid Tier Inconsistency",
        detail: "Perplexity's Q3 was truncated by the free tier. ChainGPT may have premium capabilities not tested. Comparing free-tier Perplexity against full-access Grok is apples-to-oranges.",
        fix: "Use equivalent tiers across all platforms. Document tier level. If free-only, note that paid versions may perform differently."
      },
      {
        severity: "medium",
        point: "Prompt Sensitivity Not Tested",
        detail: "Each question was submitted once per platform. But AI responses can vary dramatically with minor prompt changes or even re-submission of the identical prompt. A single sample per question gives no measure of response variance.",
        fix: "Submit each question 3 times per platform. Report mean and standard deviation. This reveals which platforms are consistent vs. lucky."
      },
      {
        severity: "medium",
        point: "Missing Forward-Test Validation",
        detail: "The study evaluates quality of analysis but never checks if the predictions were correct. Did BTC actually follow the paths described? Did the 48h plans produce profitable signals? This is the ultimate test of a trading analyst.",
        fix: "Record all specific predictions with timestamps. Check outcomes 7/30/90 days later. Publish a 'prediction accuracy' leaderboard alongside the quality scores."
      },
      {
        severity: "low",
        point: "Sample Size is Small",
        detail: "9 questions × 6 platforms = 54 data points. Statistical significance is limited. The difference between Grok (8.67) and Gemini (8.28) could easily be within noise.",
        fix: "Add more questions (20+), more asset classes, more market conditions (bull/bear/range). Report confidence intervals."
      }
    ],

    bestPracticesForBenchmarks: [
      "Blind evaluation: Strip all platform identifiers before scoring",
      "Multiple raters: Minimum 3 independent evaluators with published agreement metrics",
      "Temporal control: All submissions within the same market session",
      "Repeated sampling: 3+ submissions per question to measure variance",
      "Ground truth: Fact-check all specific claims against independent data",
      "Forward testing: Track predictions and report accuracy after the fact",
      "Tier parity: Compare equivalent product tiers across platforms",
      "Open data: Publish raw responses so others can re-score independently",
      "Confidence intervals: Report statistical uncertainty alongside point estimates",
      "Adversarial questions: Include questions with known correct answers to calibrate scoring"
    ],

    finalVerdict: "This study produces a useful directional ranking — the tier structure (Grok/Gemini >> DeepSeek/ChatGPT >> Perplexity/ChainGPT) is likely robust even under different methodology. But the specific scores should be treated as estimates with wide error bars, not as precise measurements. The biggest value isn't the rankings — it's the qualitative insight into what each platform does well and poorly, which is harder to fake with methodology."
  }
};

if (typeof module !== 'undefined') module.exports = STUDY_DATA;
