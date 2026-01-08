# Perp DEX Tracking via Arkham - Assessment

## ✅ What's Available

### GMX (Confirmed)
- **Type:** derivatives
- **Chain:** Arbitrum One
- **Entity ID:** gmx
- **Visible:** Collateral deposits/withdrawals (USDC, USDT, WETH)

### Transfer Activity Sample
```
GMX → GMX | USDC | $0 | arbitrum_one
Unknown → GMX | USDC | $100 | arbitrum_one
GMX → Unknown | WETH | $0 | arbitrum_one
```

---

## ❌ What's NOT Available

### Position Data
Arkham transfers API shows **token movements**, not **position state**:

| What We Need | What We Get |
|--------------|-------------|
| Long ETH 10x leverage | ❌ Can't see |
| Short BTC $100K position | ❌ Can't see |
| Position opened at $50K | ❌ Can't see |
| ✅ User deposits $10K USDC | ✅ Visible |
| ✅ User withdraws $15K USDC | ✅ Visible |

**Why?** Position data is in:
- Contract state (not transfer events)
- Event logs (PositionOpened, PositionClosed)
- Internal accounting (leverage, liquidation prices)

Arkham's `/transfers` endpoint only captures `Transfer(from, to, amount)` ERC20 events.

---

## 🔍 What We Can Infer (Limited)

### Net Deposits = Bullish Signal?
Track net collateral flow into GMX:
- Big whale deposits $5M USDC → opening positions
- If price pumps after → they were long
- If price dumps after → they were short
- **Problem:** We don't know which until AFTER price moves

### Withdrawal Spikes = Taking Profit?
- Whale withdraws $10M → closed position with profit?
- **Problem:** Could be:
  - Taking profit on long
  - Taking profit on short
  - Just moving funds
  - Liquidated (forced exit)

---

## 🎯 Perp DEXs Status

### Tested
| DEX | Arkham Entity | Chain | Transfer Visibility |
|-----|---------------|-------|---------------------|
| GMX | ✅ Yes | Arbitrum | ✅ Deposits/withdrawals |
| Hyperliquid | ✅ Yes (entity exists) | **Native L1** | ❌ Not EVM, no data |
| dYdX v4 | ❓ | Native Cosmos | ❌ Not EVM |
| dYdX v3 | ❓ | StarkEx L2 | ❌ Not standard EVM |

### Untested (Likely Available)
| DEX | Expected Chain | Likely Status |
|-----|----------------|---------------|
| Gains Network | Polygon/Arbitrum | ✅ Probable |
| Kwenta | Optimism | ✅ Probable |
| Vertex Protocol | Arbitrum | ✅ Probable |
| Aevo | Ethereum L2 | ⚠️ Custom L2, unclear |

---

## 💡 Alternative: Track GMX Whale Deposits

### Strategy
Even without position direction, we can:

1. **Track large deposits to GMX**
   ```
   Whale → GMX: $5M USDC
   ```

2. **Assume directional bias based on market context**
   - If ETH is in HODL trend + low band position
   - AND whale deposits $5M to GMX
   - Likely opening LONG (betting on reversal)

3. **Validate with withdrawals**
   - If ETH pumps 20% and whale withdraws $6M
   - Confirms they were long
   - Use this to build whale credibility score

### SQL Query
```sql
-- Track GMX whale deposits during HODL trends
SELECT
  c.symbol,
  t.trend,
  a.to_entity,
  SUM(a.usd_value) as total_deposits,
  COUNT(*) as deposit_count
FROM arkham_transfers a
JOIN shumi_trends t ON t.coin_id = a.coin_id
JOIN coins c ON c.id = a.coin_id
WHERE
  a.to_entity_name = 'GMX'
  AND a.usd_value > 50000
  AND t.trend = 'HODL'
  AND t.band_position < 0.3
  AND a.timestamp > NOW() - INTERVAL '7 days'
GROUP BY c.symbol, t.trend, a.to_entity
HAVING SUM(a.usd_value) > 500000
ORDER BY total_deposits DESC;
```

---

## 🚀 Better Approach: GMX Subgraph

For actual position data, use **The Graph**:

### GMX Subgraph (Arbitrum)
```graphql
{
  trades(
    first: 100
    orderBy: timestamp
    orderDirection: desc
    where: {
      sizeDelta_gt: "1000000000000000000000000"  # $1M+ positions
    }
  ) {
    id
    account
    isLong
    sizeDelta
    price
    timestamp
    indexToken {
      symbol
    }
  }
}
```

**Returns:**
- ✅ Position direction (long/short)
- ✅ Position size ($)
- ✅ Entry price
- ✅ Token (ETH, BTC, etc.)
- ✅ Timestamp

### Cost
- **Free** (The Graph decentralized network)
- Rate limits: ~1000 queries/day

---

## 🎯 Recommendation

### Option 1: Arkham Deposits Only (Limited Signal)
**Pros:**
- Already have API access
- Can track whale deposits/withdrawals
- Works for GMX on Arbitrum

**Cons:**
- No position direction (long/short)
- Can't distinguish between bullish/bearish bets
- Signal quality: ⚠️ Medium at best

**Verdict:** Not worth it. Too noisy without position direction.

---

### Option 2: GMX Subgraph (Full Position Data)
**Pros:**
- ✅ Position direction (long/short)
- ✅ Position size and leverage
- ✅ Entry/exit prices
- ✅ Real directional conviction signal
- Free tier available

**Cons:**
- Only covers GMX (not Hyperliquid, dYdX)
- Need to integrate separate API
- Limited to Arbitrum chain

**Verdict:** ✅ **Worth exploring** - gives us true whale positioning data

---

### Option 3: Hyperliquid API
Hyperliquid has its own API with full position data:
```bash
# Get leaderboard (top traders)
curl https://api.hyperliquid.xyz/info -X POST \
  -H "Content-Type: application/json" \
  -d '{"type": "leaderboard"}'

# Get user positions
curl https://api.hyperliquid.xyz/info -X POST \
  -H "Content-Type: application/json" \
  -d '{"type": "clearinghouseState", "user": "0x..."}'
```

**Pros:**
- ✅ Full position data (long/short, size, PnL)
- ✅ Leaderboard of top traders
- ✅ Real-time data
- Native L1 (faster than Arbitrum)

**Cons:**
- Separate API integration
- Need to track specific traders (no global "whale" filter)
- Rate limits unknown

**Verdict:** ⚠️ **Promising but requires research**

---

## 📊 Comparison: Spot vs Perps

| Data Source | Signal Quality | Position Direction | Coverage | Cost |
|-------------|----------------|-------------------|----------|------|
| Arkham Spot Transfers | ⚠️ Medium | ❌ No | EVM-wide | Free |
| Arkham GMX Deposits | ⚠️ Low | ❌ No | GMX only | Free |
| GMX Subgraph | ✅ High | ✅ Yes | GMX only | Free |
| Hyperliquid API | ✅ High | ✅ Yes | Hyperliquid | Free? |

---

## 🎯 Final Recommendation

**For whale positioning signals:**

1. **Use GMX Subgraph** for Arbitrum perpetuals
   - Track large positions (>$500K)
   - Filter for longs during HODL trends
   - Measure if they precede trend flips

2. **Test with 1 week backtest:**
   - Find 5 tokens that flipped HODL → BULL
   - Check if GMX saw large long positions 3-7 days before
   - If >3/5 show correlation → implement

3. **If successful, expand:**
   - Add Hyperliquid API
   - Add Gains Network (Polygon perps)
   - Build "Perp Whale Signal" separate from spot tracking

**Skip Arkham for perp data** - it only shows deposits, not positions.

---

## 🔧 Next Steps

1. **Test GMX Subgraph** (1 hour)
   - Query last 7 days of large positions
   - Filter for ETH/BTC longs >$1M
   - Check if any correlated with recent pumps

2. **Research Hyperliquid API** (30 min)
   - Read docs
   - Test leaderboard endpoint
   - Check if we can filter by token

3. **Decision point:**
   - If GMX subgraph shows promise → build pipeline
   - If not → abandon perp tracking entirely

**Estimated time to MVP:** 2-3 days if signal validates.
