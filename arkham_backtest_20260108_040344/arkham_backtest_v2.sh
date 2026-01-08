#!/bin/bash
# Proper whale accumulation backtest - filters transfers by actual token

echo "=========================================="
echo "WHALE ACCUMULATION BACKTEST V2"
echo "=========================================="
echo ""

# Analyze each coin's transfers (already fetched)
for coin in sol bonk grass; do
  COIN_UPPER=$(echo "$coin" | tr '[:lower:]' '[:upper:]')
  
  # Map coin to CoinGecko token ID  
  case $coin in
    sol) TOKEN_ID="solana"; TOKEN_SYM="SOL";;
    bonk) TOKEN_ID="bonk"; TOKEN_SYM="BONK";;
    grass) TOKEN_ID="grass"; TOKEN_SYM="GRASS";;
  esac
  
  echo "Analyzing $COIN_UPPER ($TOKEN_ID)..."
  
  # Filter transfers to ONLY this token, then analyze accumulation
  jq --arg coin "$COIN_UPPER" --arg tid "$TOKEN_ID" --arg tsym "$TOKEN_SYM" '
    # Filter to only transfers of THIS token
    [.transfers[] | select(.tokenId == $tid or .tokenSymbol == $tsym)] as $token_transfers |
    
    if ($token_transfers | length) == 0 then
      {coin: $coin, status: "NO_DATA", signal: "NO_DATA"}
    else
      # Accumulation: large transfers TO known entities (NOT exchanges)
      [$token_transfers[] | select(
        (.historicalUSD != null) and
        (.historicalUSD > 5000) and
        (.toAddress.arkhamEntity != null) and
        ((.toAddress.arkhamEntity.type // "") != "exchange") and
        ((.toAddress.arkhamEntity.type // "") != "cex")
      )] as $acc |
      
      # Distribution: large transfers FROM known entities (NOT exchanges)  
      [$token_transfers[] | select(
        (.historicalUSD != null) and
        (.historicalUSD > 5000) and
        (.fromAddress.arkhamEntity != null) and
        ((.fromAddress.arkhamEntity.type // "") != "exchange") and
        ((.fromAddress.arkhamEntity.type // "") != "cex")
      )] as $dist |
      
      ($acc | map(.historicalUSD) | add // 0) as $acc_total |
      ($dist | map(.historicalUSD) | add // 0) as $dist_total |
      
      {
        coin: $coin,
        status: "OK",
        token_transfers: ($token_transfers | length),
        signal: (
          if ($acc_total > $dist_total * 1.2) and (($acc | length) >= 2)
          then "ACCUMULATION"
          elif ($dist_total > $acc_total * 1.2)
          then "DISTRIBUTION"
          else "NEUTRAL"
          end
        ),
        accumulation: {
          count: ($acc | length),
          total_usd: ($acc_total | floor),
          top: ($acc | group_by(.toAddress.arkhamEntity.name) | map({
            name: .[0].toAddress.arkhamEntity.name,
            type: .[0].toAddress.arkhamEntity.type,
            usd: (map(.historicalUSD) | add | floor)
          }) | sort_by(-.usd) | .[0:5])
        },
        distribution: {
          count: ($dist | length),
          total_usd: ($dist_total | floor),
          top: ($dist | group_by(.fromAddress.arkhamEntity.name) | map({
            name: .[0].fromAddress.arkhamEntity.name,
            type: .[0].fromAddress.arkhamEntity.type,
            usd: (map(.historicalUSD) | add | floor)
          }) | sort_by(-.usd) | .[0:5])
        },
        net_accumulation_usd: (($acc_total - $dist_total) | floor)
      }
    end
  ' "${coin}.json" > "${coin}_v2.json"
  
  # Show summary
  jq -c '{coin, signal, token_transfers, net: .net_accumulation_usd, acc: .accumulation.count, dist: .distribution.count, top_acc: .accumulation.top[0].name}' "${coin}_v2.json"
done

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="

jq -s '
  {
    accumulation_signals: [.[] | select(.signal == "ACCUMULATION") | .coin],
    distribution_signals: [.[] | select(.signal == "DISTRIBUTION") | .coin],
    neutral_signals: [.[] | select(.signal == "NEUTRAL") | .coin],
    verdict: (
      if ([.[] | select(.signal == "ACCUMULATION")] | length) >= 2
      then "✅ ACCUMULATION DETECTED in " + ([.[] | select(.signal == "ACCUMULATION")] | length | tostring) + " coins"
      else "⚠️  No clear accumulation pattern"
      end
    ),
    details: .
  }
' *_v2.json | jq '.'

