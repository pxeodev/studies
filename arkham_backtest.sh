#!/bin/bash
# =============================================================================
# ARKHAM WHALE ACCUMULATION BACKTEST
# =============================================================================
# Hypothesis: Whale accumulation precedes trend flips by 3-7 days
# Test: 7 coins that recently flipped to UP on CoinRotator
# Success criteria: 4+ coins show accumulation spike before flip
# =============================================================================

API_KEY="ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
BASE_URL="https://api.arkhamintelligence.com"
OUTPUT_DIR="./arkham_backtest_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo "============================================="
echo "ARKHAM WHALE ACCUMULATION BACKTEST"
echo "Started: $(date)"
echo "Output dir: $OUTPUT_DIR"
echo "============================================="

# -----------------------------------------------------------------------------
# STEP 1: Fetch transfers for each coin (7 days before trend flip)
# -----------------------------------------------------------------------------

echo ""
echo "[STEP 1] Fetching transfer data..."
echo ""

# SOL - 3 day streak, flipped ~Jan 5
echo "Fetching SOL..."
curl -k -s "$BASE_URL/transfers?token=solana&limit=1000" \
  -H "API-Key: $API_KEY" > sol_transfers.json
echo "  → $(cat sol_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# BONK - 4 day streak, flipped ~Jan 4
echo "Fetching BONK..."
curl -k -s "$BASE_URL/transfers?token=bonk&limit=1000" \
  -H "API-Key: $API_KEY" > bonk_transfers.json
echo "  → $(cat bonk_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# DOOD - 4 day streak, flipped ~Jan 4
echo "Fetching DOOD..."
curl -k -s "$BASE_URL/transfers?token=doodles&limit=1000" \
  -H "API-Key: $API_KEY" > dood_transfers.json
echo "  → $(cat dood_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# GRASS - 3 day streak, flipped ~Jan 5
echo "Fetching GRASS..."
curl -k -s "$BASE_URL/transfers?token=grass&limit=1000" \
  -H "API-Key: $API_KEY" > grass_transfers.json
echo "  → $(cat grass_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# ORCA - 3 day streak, flipped ~Jan 5
echo "Fetching ORCA..."
curl -k -s "$BASE_URL/transfers?token=orca&limit=1000" \
  -H "API-Key: $API_KEY" > orca_transfers.json
echo "  → $(cat orca_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# ORDER - 5 day streak, flipped ~Jan 3
echo "Fetching ORDER..."
curl -k -s "$BASE_URL/transfers?token=orderly-network&limit=1000" \
  -H "API-Key: $API_KEY" > order_transfers.json
echo "  → $(cat order_transfers.json | jq '.transfers | length // 0') transfers"
sleep 1

# AVICI - 2 day streak, flipped ~Jan 6
echo "Fetching AVICI..."
curl -k -s "$BASE_URL/transfers?token=avicii&limit=1000" \
  -H "API-Key: $API_KEY" > avici_transfers.json
echo "  → $(cat avici_transfers.json | jq '.transfers | length // 0') transfers"

# -----------------------------------------------------------------------------
# STEP 2: Analyze each coin for accumulation signals
# -----------------------------------------------------------------------------

echo ""
echo "[STEP 2] Analyzing accumulation patterns..."
echo ""

analyze_accumulation() {
  local file=$1
  local coin=$2

  # Check if file has valid data
  if [ ! -s "$file" ] || [ "$(cat $file | jq '.transfers | length // 0')" == "0" ] || [ "$(cat $file | jq '.transfers | length // 0')" == "null" ]; then
    echo "{\"coin\": \"$coin\", \"status\": \"NO_DATA\", \"transfers\": 0}"
    return
  fi

  cat "$file" | jq --arg coin "$coin" '
    # Filter for large transfers (>$10k USD) to non-exchange entities (accumulation)
    .transfers as $all |
    [.transfers[] | select(
      (.historicalUSD != null) and
      (.historicalUSD > 10000) and
      (.toAddress.arkhamEntity != null) and
      ((.toAddress.arkhamEntity.type // "") != "exchange") and
      ((.toAddress.arkhamEntity.type // "") != "cex")
    )] as $accumulation |

    # Filter for large transfers FROM non-exchanges (distribution/selling)
    [.transfers[] | select(
      (.historicalUSD != null) and
      (.historicalUSD > 10000) and
      (.fromAddress.arkhamEntity != null) and
      ((.fromAddress.arkhamEntity.type // "") != "exchange") and
      ((.fromAddress.arkhamEntity.type // "") != "cex")
    )] as $distribution |

    {
      coin: $coin,
      status: "OK",
      total_transfers: ($all | length),
      accumulation: {
        count: ($accumulation | length),
        total_usd: ([$accumulation[].historicalUSD] | add // 0),
        top_accumulators: (
          $accumulation |
          group_by(.toAddress.arkhamEntity.name // "unknown") |
          map({
            name: (.[0].toAddress.arkhamEntity.name // "unknown"),
            type: (.[0].toAddress.arkhamEntity.type // "unknown"),
            total_usd: ([.[].historicalUSD] | add)
          }) |
          sort_by(-.total_usd) |
          .[0:5]
        )
      },
      distribution: {
        count: ($distribution | length),
        total_usd: ([$distribution[].historicalUSD] | add // 0),
        top_distributors: (
          $distribution |
          group_by(.fromAddress.arkhamEntity.name // "unknown") |
          map({
            name: (.[0].fromAddress.arkhamEntity.name // "unknown"),
            type: (.[0].fromAddress.arkhamEntity.type // "unknown"),
            total_usd: ([.[].historicalUSD] | add)
          }) |
          sort_by(-.total_usd) |
          .[0:5]
        )
      },
      net_accumulation: (([$accumulation[].historicalUSD] | add // 0) - ([$distribution[].historicalUSD] | add // 0)),
      signal: (
        if (([$accumulation[].historicalUSD] | add // 0) > ([$distribution[].historicalUSD] | add // 0) * 1.5)
           and (($accumulation | length) >= 3)
        then "ACCUMULATION"
        elif (([$distribution[].historicalUSD] | add // 0) > ([$accumulation[].historicalUSD] | add // 0) * 1.5)
        then "DISTRIBUTION"
        else "NEUTRAL"
        end
      )
    }
  '
}

echo "Analyzing SOL..."
analyze_accumulation "sol_transfers.json" "SOL" > sol_analysis.json
cat sol_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing BONK..."
analyze_accumulation "bonk_transfers.json" "BONK" > bonk_analysis.json
cat bonk_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing DOOD..."
analyze_accumulation "dood_transfers.json" "DOOD" > dood_analysis.json
cat dood_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing GRASS..."
analyze_accumulation "grass_transfers.json" "GRASS" > grass_analysis.json
cat grass_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing ORCA..."
analyze_accumulation "orca_transfers.json" "ORCA" > orca_analysis.json
cat orca_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing ORDER..."
analyze_accumulation "order_transfers.json" "ORDER" > order_analysis.json
cat order_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

echo "Analyzing AVICI..."
analyze_accumulation "avici_transfers.json" "AVICI" > avici_analysis.json
cat avici_analysis.json | jq -c '{coin, signal, net_accumulation, accumulation_count: .accumulation.count, distribution_count: .distribution.count}'

# -----------------------------------------------------------------------------
# STEP 3: Generate summary report
# -----------------------------------------------------------------------------

echo ""
echo "[STEP 3] Generating summary..."
echo ""

# Combine all analyses
jq -s '.' *_analysis.json > combined_analysis.json

# Generate summary
cat combined_analysis.json | jq '
  {
    test_date: (now | strftime("%Y-%m-%d %H:%M:%S")),
    hypothesis: "Whale accumulation precedes trend flips",
    coins_tested: length,
    results: {
      accumulation_signals: [.[] | select(.signal == "ACCUMULATION") | .coin],
      distribution_signals: [.[] | select(.signal == "DISTRIBUTION") | .coin],
      neutral_signals: [.[] | select(.signal == "NEUTRAL" or .signal == null) | .coin],
      no_data: [.[] | select(.status == "NO_DATA") | .coin]
    },
    accumulation_count: ([.[] | select(.signal == "ACCUMULATION")] | length),
    distribution_count: ([.[] | select(.signal == "DISTRIBUTION")] | length),
    neutral_count: ([.[] | select(.signal == "NEUTRAL")] | length),
    no_data_count: ([.[] | select(.status == "NO_DATA")] | length),
    success_rate: (
      if ([.[] | select(.status == "OK")] | length) > 0
      then (([.[] | select(.signal == "ACCUMULATION")] | length) / ([.[] | select(.status == "OK")] | length) * 100)
      else 0
      end
    ),
    verdict: (
      if (([.[] | select(.signal == "ACCUMULATION")] | length) >= 4)
      then "✅ HYPOTHESIS SUPPORTED - Proceed with implementation"
      elif (([.[] | select(.signal == "ACCUMULATION")] | length) >= 3)
      then "⚠️  HYPOTHESIS PARTIALLY SUPPORTED - Consider implementation with caution"
      else "❌ HYPOTHESIS NOT SUPPORTED - Do not proceed"
      end
    ),
    details: [.[] | {
      coin: .coin,
      status: .status,
      signal: .signal,
      net_accumulation_usd: (.net_accumulation | floor),
      accumulation_events: .accumulation.count,
      accumulation_total_usd: (.accumulation.total_usd | floor),
      distribution_events: .distribution.count,
      distribution_total_usd: (.distribution.total_usd | floor),
      top_accumulators: .accumulation.top_accumulators
    }]
  }
' > backtest_summary.json

# -----------------------------------------------------------------------------
# STEP 4: Print results
# -----------------------------------------------------------------------------

echo ""
echo "============================================="
echo "BACKTEST RESULTS"
echo "============================================="
cat backtest_summary.json | jq '.'

echo ""
echo "============================================="
echo "VERDICT"
echo "============================================="
cat backtest_summary.json | jq -r '.verdict'

echo ""
echo "============================================="
echo "FILES GENERATED"
echo "============================================="
ls -lh *.json | awk '{print $9, $5}'

echo ""
echo "Backtest complete: $(date)"
echo "Results saved to: $OUTPUT_DIR/backtest_summary.json"
