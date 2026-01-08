#!/bin/bash
# Arkham Whale Accumulation Backtest
# Tests if whale accumulation precedes trend flips

API_KEY="ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
OUTPUT_DIR="./arkham_backtest_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo "============================================="
echo "ARKHAM WHALE ACCUMULATION BACKTEST"
echo "Started: $(date)"
echo "============================================="
echo ""
echo "[STEP 1] Fetching transfer data..."
echo ""

# Fetch transfers for 7 coins that recently flipped UP
echo "Fetching SOL..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=solana&limit=1000" \
  -H "API-Key: $API_KEY" > sol.json && echo "  → $(jq '.transfers | length // 0' sol.json) transfers"

sleep 1

echo "Fetching BONK..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=bonk&limit=1000" \
  -H "API-Key: $API_KEY" > bonk.json && echo "  → $(jq '.transfers | length // 0' bonk.json) transfers"

sleep 1

echo "Fetching DOOD..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=doodles&limit=1000" \
  -H "API-Key: $API_KEY" > dood.json && echo "  → $(jq '.transfers | length // 0' dood.json) transfers"

sleep 1

echo "Fetching GRASS..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=grass&limit=1000" \
  -H "API-Key: $API_KEY" > grass.json && echo "  → $(jq '.transfers | length // 0' grass.json) transfers"

sleep 1

echo "Fetching ORCA..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=orca&limit=1000" \
  -H "API-Key: $API_KEY" > orca.json && echo "  → $(jq '.transfers | length // 0' orca.json) transfers"

sleep 1

echo "Fetching ORDER..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=orderly-network&limit=1000" \
  -H "API-Key: $API_KEY" > order.json && echo "  → $(jq '.transfers | length // 0' order.json) transfers"

sleep 1

echo "Fetching AVICI..."
curl -k -s "https://api.arkhamintelligence.com/transfers?token=avicii&limit=1000" \
  -H "API-Key: $API_KEY" > avici.json && echo "  → $(jq '.transfers | length // 0' avici.json) transfers"

echo ""
echo "[STEP 2] Analyzing accumulation patterns..."
echo ""

# Analyze each coin
for coin in sol bonk dood grass orca order avici; do
  COIN_UPPER=$(echo "$coin" | tr '[:lower:]' '[:upper:]')
  echo "Analyzing $COIN_UPPER..."
  
  jq --arg coin "$COIN_UPPER" '
    if .transfers == null or (.transfers | length) == 0 then
      {coin: $coin, status: "NO_DATA", signal: "NO_DATA", accumulation: {count: 0, total_usd: 0}, distribution: {count: 0, total_usd: 0}}
    else
      (.transfers // []) as $all |
      
      # Accumulation: large transfers TO known entities (NOT exchanges)
      [.transfers[] | select(
        (.historicalUSD != null) and
        (.historicalUSD > 10000) and
        (.toAddress.arkhamEntity != null) and
        ((.toAddress.arkhamEntity.type // "") != "exchange") and
        ((.toAddress.arkhamEntity.type // "") != "cex")
      )] as $acc |
      
      # Distribution: large transfers FROM known entities (NOT exchanges)  
      [.transfers[] | select(
        (.historicalUSD != null) and
        (.historicalUSD > 10000) and
        (.fromAddress.arkhamEntity != null) and
        ((.fromAddress.arkhamEntity.type // "") != "exchange") and
        ((.fromAddress.arkhamEntity.type // "") != "cex")
      )] as $dist |
      
      ($acc | map(.historicalUSD) | add // 0) as $acc_total |
      ($dist | map(.historicalUSD) | add // 0) as $dist_total |
      
      {
        coin: $coin,
        status: "OK",
        signal: (
          if ($acc_total > $dist_total * 1.5) and (($acc | length) >= 3)
          then "ACCUMULATION"
          elif ($dist_total > $acc_total * 1.5)
          then "DISTRIBUTION"
          else "NEUTRAL"
          end
        ),
        accumulation: {
          count: ($acc | length),
          total_usd: ($acc_total | floor),
          top: ($acc | group_by(.toAddress.arkhamEntity.name) | map({name: .[0].toAddress.arkhamEntity.name, usd: (map(.historicalUSD) | add | floor)}) | sort_by(-.usd) | .[0:3])
        },
        distribution: {
          count: ($dist | length),
          total_usd: ($dist_total | floor),
          top: ($dist | group_by(.fromAddress.arkhamEntity.name) | map({name: .[0].fromAddress.arkhamEntity.name, usd: (map(.historicalUSD) | add | floor)}) | sort_by(-.usd) | .[0:3])
        },
        net: (($acc_total - $dist_total) | floor)
      }
    end
  ' "${coin}.json" > "${coin}_analysis.json"
  
  jq -c '{coin, signal, net, acc_count: .accumulation.count, dist_count: .distribution.count}' "${coin}_analysis.json"
done

echo ""
echo "[STEP 3] Generating summary..."
echo ""

# Combine analyses
jq -s '.' *_analysis.json > combined.json

# Generate summary
jq '
  ([.[] | select(.signal == "ACCUMULATION")] | length) as $acc_count |
  ([.[] | select(.status == "OK")] | length) as $ok_count |
  {
    test_date: (now | strftime("%Y-%m-%d %H:%M:%S")),
    coins_tested: length,
    accumulation: ([.[] | select(.signal == "ACCUMULATION") | .coin]),
    distribution: ([.[] | select(.signal == "DISTRIBUTION") | .coin]),
    neutral: ([.[] | select(.signal == "NEUTRAL") | .coin]),
    no_data: ([.[] | select(.status == "NO_DATA") | .coin]),
    success_rate: (if $ok_count > 0 then ($acc_count / $ok_count * 100 | floor) else 0 end),
    verdict: (
      if $acc_count >= 4 then "✅ HYPOTHESIS SUPPORTED"
      elif $acc_count >= 3 then "⚠️  PARTIALLY SUPPORTED"
      else "❌ NOT SUPPORTED"
      end
    ),
    details: .
  }
' combined.json > summary.json

echo "============================================="
echo "BACKTEST RESULTS"
echo "============================================="
jq '.' summary.json

echo ""
echo "============================================="
echo "VERDICT"
echo "============================================="
jq -r '.verdict' summary.json

echo ""
echo "Results saved to: $OUTPUT_DIR/summary.json"
