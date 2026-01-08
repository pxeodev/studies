# Arkham Intelligence API - Whale Analysis Mapping

## API Base URL
```
https://api.arkhamintelligence.com
```

**Note:** Use `curl -k` flag to bypass SSL verification if needed.

## API Key
```
API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j
```

---

## Available Endpoints & Response Structures

### 1. Address Intelligence (`/intelligence/address/{address}`)
**Purpose:** Get entity identification and labels for a specific address

**Example:**
```bash
curl -k -s "https://api.arkhamintelligence.com/intelligence/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
```

**Response Structure:**
```json
{
  "address": "0x...",
  "chain": "arbitrum_one",
  "arkhamEntity": {
    "name": "Vitalik Buterin",
    "id": "vitalik-buterin",
    "type": "individual",
    "twitter": "https://twitter.com/...",
    "crunchbase": "...",
    "linkedin": "..."
  },
  "arkhamLabel": {
    "name": "vitalik.eth",
    "address": "0x...",
    "chainType": "evm"
  },
  "isUserAddress": false,
  "contract": false
}
```

**Use Cases:**
- ✅ Entity attribution ("Vitalik Buterin", "Jump Trading", etc.)
- ✅ Label identification (ENS names, contract labels)
- ✅ Chain detection
- ✅ Contract vs EOA detection

---

### 2. Entity Details (`/intelligence/entity/{entity_id}`)
**Purpose:** Get comprehensive information about a known entity including all tags

**Example:**
```bash
curl -k -s "https://api.arkhamintelligence.com/intelligence/entity/vitalik-buterin" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
```

**Response Structure:**
```json
{
  "name": "Vitalik Buterin",
  "id": "vitalik-buterin",
  "type": "individual",
  "twitter": "...",
  "crunchbase": "...",
  "linkedin": "...",
  "populatedTags": [
    {
      "id": "whale",
      "label": "{\"pricing_id\":\"ethereum\",\"symbol\":\"ETH\"} Whale",
      "rank": 130,
      "tagParams": "{\"pricing_id\":\"ethereum\",\"symbol\":\"ETH\"}"
    },
    {
      "id": "kol",
      "label": "Key Opinion Leader",
      "rank": 40
    },
    {
      "id": "high-transacting",
      "label": "High Transacting",
      "rank": 160
    }
    // ... many more tags
  ]
}
```

**Use Cases:**
- ✅ Whale classification tags
- ✅ Social profiles and verification
- ✅ Behavioral tags (high-transacting, validator, etc.)
- ✅ Related entities (multisig signers, etc.)

---

### 3. Transfer History (`/transfers`)
**Purpose:** Get detailed transaction/transfer history with full entity context

**Example:**
```bash
curl -k -s "https://api.arkhamintelligence.com/transfers?address=0x...&limit=50" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j"
```

**Response Structure:**
```json
{
  "transfers": [
    {
      "id": "...",
      "transactionHash": "0x...",
      "fromAddress": {
        "address": "0x...",
        "chain": "polygon",
        "arkhamEntity": {
          "name": "Uniswap",
          "id": "uniswap",
          "type": "dex",
          "website": "...",
          "twitter": "..."
        },
        "arkhamLabel": {
          "name": "V3 Pool",
          "address": "0x...",
          "chainType": "evm"
        },
        "contract": true
      },
      "toAddress": { /* same structure */ },
      "tokenAddress": "0x...",
      "blockTimestamp": "2026-01-08T03:26:27Z",
      "tokenName": "USD Coin",
      "tokenSymbol": "USDC",
      "tokenDecimals": 6,
      "unitValue": 1000.5,        // Amount in tokens
      "historicalUSD": 1000.50,   // USD value at time of tx
      "chain": "polygon"
    }
  ],
  "count": 10000
}
```

**Use Cases:**
- ✅ Activity timeline/history
- ✅ Transfer amounts with USD values
- ✅ Counterparty identification (who they're trading with)
- ✅ Token tracking (what assets they move)
- ✅ Multi-chain activity
- ✅ Volume calculation
- ⚠️ **PnL Calculation:** Can be derived by tracking buys/sells with historicalUSD

---

### 4. Portfolio/Holdings (`/portfolio/address/{address}`)
**Status:** ⚠️ Requires additional parameters

**Error Response:**
```json
{
  "message": "invalid unix millisecond time"
}
```

**Required Parameters (to investigate):**
- Likely needs timestamp parameters
- May need chain specification
- Possibly requires pagination

**Expected Use Cases (when working):**
- Current holdings breakdown
- Portfolio value calculation
- Position sizes ($645M ETH long)
- Asset distribution

---

## Mapping to Whale Analysis Features

Based on typical whale tracking dashboards, here's how to build each feature:

### 📊 **Entity Profile**
- **Name & Type:** `/intelligence/entity/{id}` → `name`, `type`
- **Social Links:** `/intelligence/entity/{id}` → `twitter`, `linkedin`, etc.
- **Tags:** `/intelligence/entity/{id}` → `populatedTags`
- **Whale Classification:** Check for `"id": "whale"` tag

### 💰 **Position Tracking** (e.g., "$645M ETH Long")
- **Current Holdings:** `/portfolio/address/{address}` (needs parameter investigation)
- **Alternative:** Calculate from `/transfers` history:
  - Sum all incoming transfers (buys/receives)
  - Subtract all outgoing transfers (sells/sends)
  - Multiply by current price

### 📈 **PnL Calculation**
- **Data Source:** `/transfers` endpoint
- **Method:**
  1. Track all buys: sum `historicalUSD` for incoming token transfers
  2. Track all sells: sum `historicalUSD` for outgoing token transfers
  3. Get current holdings value (current price × balance)
  4. PnL = (Current Value + Total Sells) - Total Buys

### 🔄 **Activity Timeline**
- **Data Source:** `/transfers?address={address}&limit=N`
- **Display:**
  - `blockTimestamp` for timing
  - `fromAddress.arkhamEntity.name` → `toAddress.arkhamEntity.name`
  - `unitValue` `tokenSymbol` @ `historicalUSD` USD

### 🏷️ **Attribution & Links** (e.g., "possibly linked to Garrett Jin")
- **Entity Links:** `/intelligence/entity/{id}` → check `populatedTags`
- **Related Addresses:** Look for `gnosis-safe-signer-of-safe` tags
- **Social Graph:** Track counterparties in `/transfers` data

### 📊 **Accumulation Tracking**
- **Method:** Analyze `/transfers` over time
  - Filter for specific token (`tokenAddress`)
  - Identify net accumulation periods
  - Track entry prices via `historicalUSD`

---

## Example Queries for Common Whale Operations

### Find All ETH Whale Entities
```bash
# First, search for entities with whale tag
# (May need entity search endpoint - to explore)
```

### Track Specific Whale Activity (Last 100 Transfers)
```bash
curl -k -s "https://api.arkhamintelligence.com/transfers?address=WHALE_ADDRESS&limit=100" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j" | jq .
```

### Get Whale Profile & Verification
```bash
# Step 1: Identify entity from address
curl -k -s "https://api.arkhamintelligence.com/intelligence/address/WHALE_ADDRESS" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j" | jq '.arkhamEntity.id'

# Step 2: Get full entity profile
curl -k -s "https://api.arkhamintelligence.com/intelligence/entity/ENTITY_ID" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j" | jq .
```

### Calculate Total USD Volume
```bash
curl -k -s "https://api.arkhamintelligence.com/transfers?address=WHALE_ADDRESS&limit=1000" \
  -H "API-Key: ot1dMSFxhYxA6gOL1L9fMzGCkRB2rg0j" | \
  jq '[.transfers[].historicalUSD] | add'
```

---

## Data Limitations & Considerations

### ✅ **What We Can Build:**
1. Entity identification and tagging
2. Transfer history and activity timelines
3. Counterparty analysis (who whales trade with)
4. Historical USD values for all transfers
5. Token-specific tracking
6. Multi-chain monitoring
7. Whale classification via tags

### ⚠️ **What Needs More Investigation:**
1. **Portfolio endpoint parameters** - needs timestamp/chain params
2. **Current balances** - may need to calculate from transfer history
3. **Real-time price data** - not in API, need external source
4. **Search functionality** - finding whales by criteria
5. **Pagination** - handling large datasets beyond limits

### 🔨 **How to Calculate Missing Data:**
- **Current Balance:** Sum incoming - outgoing transfers for each token
- **Unrealized PnL:** (Current Price - Avg Entry Price) × Balance
- **Realized PnL:** Sum of (Sell Price - Cost Basis) for all sells

---

## Next Steps for Implementation

1. **Test Portfolio Endpoint:**
   - Experiment with timestamp parameters
   - Try different date ranges
   - Check pagination

2. **Build Transfer Aggregation:**
   - Create function to fetch all transfers (handle pagination)
   - Parse and aggregate by token
   - Calculate balances and PnL

3. **External Price Integration:**
   - Use CoinGecko/CoinMarketCap for current prices
   - Calculate unrealized PnL with current prices

4. **Entity Search:**
   - Explore if there's a search endpoint
   - Build local cache of whale entities
   - Track high-value addresses

5. **Real-time Monitoring:**
   - Set up polling for new transfers
   - Alert on significant whale movements
   - Track accumulation/distribution patterns
