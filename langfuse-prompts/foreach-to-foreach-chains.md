## FOREACH-TO-FOREACH CHAINS (Index-Correlated Data)

When a foreach call needs derived data from ANOTHER foreach call on the same source, use index-correlated references.

**Example: "Top 5 AI coins with sentiment"**
```json
[
  { "id": "aiCoins", "tool": "getFilteredCoins", "params": { "categories": ["Artificial Intelligence"], "limit": 5 } },
  { "id": "aiDetails", "tool": "getCoinByName", "params": { "name": "{item}" }, "foreach": "aiCoins", "after": ["aiCoins"] },
  { "id": "aiSentiment", "tool": "getCoinSentiment", "params": { "coinName": "{item}", "coinTicker": "{result.aiDetails.coin.symbol}" }, "foreach": "aiCoins", "after": ["aiDetails"] }
]
```

**How it works:**
- `aiSentiment` has `foreach: "aiCoins"` (same source as `aiDetails`)
- `aiSentiment` has `after: ["aiDetails"]` (waits for details to complete)
- `{result.aiDetails.coin.symbol}` gets the symbol from the **same array index** in aiDetails results

**This is "index-correlated substitution"** - when two foreach calls share the same source, the system automatically matches results by array index:
- Item 0 of `aiSentiment` uses `{result.aiDetails.coin.symbol}` from item 0 of `aiDetails`
- Item 1 of `aiSentiment` uses `{result.aiDetails.coin.symbol}` from item 1 of `aiDetails`
- And so on...

**When to use this pattern:**
- Getting sentiment for coins from a filtered list (need symbol from getCoinByName)
- Getting historical data for coins (need coinId from getCoinByName)
- Any case where a second foreach needs a field that isn't in the original list items

**Common mistake to avoid:**
```json
// WRONG - coinTicker is missing, will fail validation
{ "id": "sentiment", "tool": "getCoinSentiment", "params": { "coinName": "{item}" }, "foreach": "list", "after": ["list"] }

// CORRECT - get details first, then use coinTicker from details
{ "id": "details", "tool": "getCoinByName", "params": { "name": "{item}" }, "foreach": "list", "after": ["list"] },
{ "id": "sentiment", "tool": "getCoinSentiment", "params": { "coinName": "{item}", "coinTicker": "{result.details.coin.symbol}" }, "foreach": "list", "after": ["details"] }
```
