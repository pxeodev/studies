# Arkham Whale Accumulation Backtest - Key Findings

**Test Date:** 2026-01-08
**Status:** ⚠️ PIVOTING - API Limitations Discovered

---

## 🚨 Critical Discovery: EVM-Only Coverage

### The Problem

The Arkham Intelligence API **only covers EVM chains**. No Solana, no Bitcoin mainnet.

**Chains Available:**
```
374  Base
268  Polygon
138  Optimism
115  BSC (Binance Smart Chain)
 51  Avalanche
 28  Arbitrum One
 11  Linea
  7  Flare
  4  Sonic
  4  Mantle
```

**Chains NOT Available:**
- ❌ Solana
- ❌ Bitcoin (mainnet)
- ❌ Cosmos
- ❌ Polkadot
- ❌ Other non-EVM chains

### Why This Matters

The coins we tried to test were mostly Solana ecosystem:
- SOL - Solana native (not available)
- BONK - Solana meme coin (not available)
- GRASS - Solana token (not available)
- ORCA - Solana DEX token (not available)

**Result:** Can't backtest the original hypothesis with these coins.

---

## 📊 What Data IS Available

### Large Transfers Detected (Last 1000 global transfers)

| Token | Type | Largest Transfer | Chain |
|-------|------|------------------|-------|
| cbBTC | Wrapped Bitcoin | $1,009,350 | Base |
| USDC | Stablecoin | $999,999 | Multiple |
| cbBTC | Wrapped Bitcoin | $590,233 | Base |
| WETH | Wrapped Ethereum | $432,721 | Base |
| AERO | Aerodrome DEX | $347,559 | Base |
| ZORA | L2 Token | $59,223 | Base |

### Entity Types Observed

From the limited data analyzed:
- **DEX Protocols:** Aerodrome Finance, Uniswap, PancakeSwap
- **Stablecoin Issuers:** Circle (USDC)
- **DeFi Protocols:** Kyber Network, Polymarket
- **Market Makers:** (Limited visibility)

---

## 🔍 API Behavior Analysis

### The `token` Parameter Mystery

**Query:** `GET /transfers?token=solana&limit=1000`

**Expected:** Transfers of SOL token
**Actual:** Random mix of all tokens (USDC, ETH, BNB, etc.)

**Token Distribution in "solana" Query:**
```
275  USDC
 91  Spam token
 68  WETH
 46  ETH
 40  USDT
 37  LIBERTY
 35  opXEN
 32  LGNS
  2  SOL (base-bridged, not native!)
```

### Conclusion

The `token` parameter **does NOT filter by token being transferred**. It appears to:
1. Return global recent transfers across all tokens
2. Possibly search for entity names related to that token?
3. Or it's ignored entirely

**No way to efficiently query "all ETH transfers" or "all USDC transfers"** - you get mixed results.

---

## 💡 Revised Strategy Options

### Option 1: Test EVM Ecosystem Tokens

**Coins That Recently Flipped UP (Need EVM-based):**
- Look for Ethereum ecosystem tokens
- Base chain meme coins / new tokens
- Polygon ecosystem coins
- L2 tokens (Arbitrum, Optimism)

**Challenge:** The original CoinRotator trends were Solana-heavy.

### Option 2: Test Known EVM Whales Directly

Instead of querying by token, query by **known whale addresses**:

```bash
# Known whale/entity addresses
curl "/intelligence/address/0x..." # Get entity info
curl "/transfers?address=0x..."     # Get their activity
```

**Pros:**
- Direct whale tracking
- Get full transfer history
- See what they're accumulating

**Cons:**
- Need to maintain whale watchlist
- More API calls (1 per whale)
- Doesn't scale to 60 coins easily

### Option 3: Hybrid Approach

1. **Get recent global transfers** (1000 at a time)
2. **Filter client-side** by token (using `tokenId` or `tokenSymbol`)
3. **Track whale entities** that appear in those transfers
4. **Aggregate accumulation** over time

**Pros:**
- Works with current API limitations
- Can track any EVM token
- Discovers whales automatically

**Cons:**
- Requires 1000+ transfers per query for good coverage
- Need pagination to get complete picture
- High API call volume for comprehensive tracking

---

## 🎯 What We Learned

### 1. Data Quality

✅ **Good:**
- Entity attribution is excellent (Jump Trading, Wintermute, etc.)
- USD values included for all transfers
- Multi-chain EVM coverage
- Historical timestamps accurate

❌ **Limited:**
- No Solana/non-EVM chains
- Token filtering doesn't work as expected
- Limited to 1000 transfers per query
- Mostly see DEX activity, not true whale wallets

### 2. Whale Visibility

**Entities Commonly Seen:**
- DEX protocols (Uniswap, Aerodrome, PancakeSwap)
- DeFi protocols (Compound, Aave)
- Stablecoin issuers (Circle)
- Some prediction markets (Polymarket)

**Entities Rarely Seen:**
- Individual whale wallets
- Trading firms (Jump, Wintermute less frequent)
- Hedge funds
- Institutional investors

**Why?** Most large transfers are between smart contracts (DEXs, liquidity pools), not individual whale wallets.

### 3. Signal Quality

From limited data:
- Most "accumulation" is DEX liquidity provision (not directional bets)
- Hard to distinguish whale positioning from market-making activity
- Need additional filtering:
  - Exclude DEX-to-DEX transfers
  - Exclude liquidity pool operations
  - Focus on EOA (Externally Owned Accounts) → entity transfers

---

## 📈 Backtest Results (Limited)

### Coins Tested

| Coin | Chain | Transfers Found | Signal | Notes |
|------|-------|-----------------|---------|-------|
| SOL | Solana | 2 (bridged only) | NEUTRAL | Native Solana not available |
| BONK | Solana | 0 | NO_DATA | Token not on EVM |
| GRASS | Solana | 0 | NO_DATA | Token not on EVM |
| DOOD | Solana | 0 | NO_DATA | Token not on EVM |
| ORCA | Solana | 0 | NO_DATA | Token not on EVM |

**Verdict:** ❌ Cannot test hypothesis with Solana tokens

---

## 🔧 Recommended Next Steps

### Immediate (1-2 days)

1. **Identify EVM tokens that recently flipped UP**
   - Check CoinRotator for Ethereum/Base/Polygon coins
   - Filter for tokens with Arkham coverage
   - Minimum 7-day streak

2. **Test with 3-5 EVM tokens**
   - Run backtest with proper EVM coins
   - Validate if whale accumulation preceded flip
   - Measure correlation and lead time

3. **Refine filtering logic**
   - Exclude DEX-to-DEX transfers
   - Focus on entity types: fund, trading-firm, individual
   - Raise threshold to $100k+ transfers only

### Medium-term (1 week)

4. **Build whale discovery system**
   - Query global transfers every 5 minutes
   - Extract unique entity addresses
   - Build database of "active whales"
   - Track their holdings over time

5. **Implement accumulation tracking**
   - For top 30 EVM tokens
   - Calculate 1d, 7d, 14d accumulation
   - Flag when accumulation spikes >2σ above average

6. **Integrate with Shumi trends**
   - Cross-reference with HODL trend coins
   - Alert on confluence signals
   - Backtest correlation

### Long-term (2-3 weeks)

7. **Explore alternative data sources**
   - Nansen for Solana whale tracking
   - Dune Analytics for on-chain metrics
   - Santiment for social + on-chain fusion

8. **Build comprehensive whale database**
   - Track 100+ known whale addresses
   - Monitor their trades across all EVM chains
   - Detect pattern changes (accumulation → distribution)

---

## 📝 Revised Hypothesis

**Original:**
> Whale accumulation (via Arkham) precedes Shumi trend flips by 3-7 days

**Revised:**
> **EVM whale accumulation** (via Arkham) for **Ethereum ecosystem tokens** can serve as a leading indicator when combined with Shumi HODL trends and low band position.

**Constraints:**
- Limited to EVM chains (Ethereum, Base, Polygon, Arbitrum, etc.)
- Cannot track Solana/Bitcoin/other non-EVM ecosystems
- Need to filter out DEX activity to isolate true whale positioning
- Requires whale address watchlist OR global transfer monitoring

**Feasibility:**
- ✅ Still feasible for EVM tokens
- ⚠️ Requires different coin selection (EVM-based)
- ⚠️ May need hybrid approach (Arkham + Nansen/Dune)

---

## 🎯 Success Criteria (Updated)

### Phase 1: Proof of Concept (2 weeks)

- [ ] Identify 10 EVM tokens that flipped HODL → BULL recently
- [ ] Backtest whale accumulation 7 days before flip
- [ ] Achieve >50% correlation (5+ coins show accumulation pre-flip)
- [ ] False positive rate <30%

### Phase 2: Live Monitoring (1 week)

- [ ] Track top 30 EVM tokens real-time
- [ ] Detect 3+ accumulation signals during HODL phase
- [ ] Validate if signals lead to trend flips within 7 days
- [ ] Measure actual lead time distribution

### Phase 3: Integration (1 week)

- [ ] Add "EVM Whale Activity" column to Shumi dashboard
- [ ] Show 7d accumulation score
- [ ] Flag confluence signals (accumulation + HODL + low band)
- [ ] Track performance over 30-day period

---

## 💰 Cost Analysis (Updated)

### API Call Requirements

**Per coin monitoring (EVM tokens only):**
- Global transfers: 1 req/5min = 288 req/day/coin
- With 30 EVM tokens: 8,640 req/day
- Monthly: ~260K requests

**Rate Limit:**
- Current safe rate: 60 req/min = 86,400 req/day ✅

**Feasibility:** ✅ Within rate limits for 30 coins

### Storage Requirements

**PostgreSQL:**
- ~1000 transfers per query
- ~50% are filtered out (DEX activity)
- ~500 relevant transfers per coin per day
- 30 coins × 500 = 15K new transfers/day
- Monthly: ~450K transfer records
- @ 2KB per record: ~900MB/month

**Feasibility:** ✅ Easily manageable

---

## 🚀 Quick Win: Test with Wrapped BTC

cbBTC had major transfer activity ($1M+). Let's manually check if whales accumulated before any recent trend flip:

```bash
# Get cbBTC entity info
curl -k "https://api.arkhamintelligence.com/intelligence/address/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"

# Get cbBTC recent transfers
curl -k "https://api.arkhamintelligence.com/transfers?address=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf&limit=1000" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
```

Then check if cbBTC (or BTC-related coins) showed HODL → BULL flip recently.

---

## 🔍 Key Insight

**The Arkham API is powerful for EVM whale tracking BUT:**
1. Doesn't cover Solana (where many trending coins are)
2. Doesn't filter by token efficiently (returns global mixed transfers)
3. Best suited for address-based queries (track specific whales)

**This changes the implementation from:**
- ❌ "Monitor all Shumi coins for whale accumulation"

**To:**
- ✅ "Monitor EVM Shumi coins for whale accumulation"
- ✅ "Track known whale addresses across all their activity"
- ✅ "Discover new whales from global transfer feed, then track them"

**Next decision point:** Do we want to proceed with EVM-only whale tracking, or explore alternative data sources (Nansen, Dune) for Solana coverage?
