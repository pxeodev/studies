# FALSIFY-013 / 014 — intraday and day-of-week structure in BTC, ETH, SOL

The scripts behind *The Clock Moves The Tape*. Two pre-registered studies on the same
78,384 hourly bars per asset (Binance spot, BTC and ETH from 2017-08, SOL from 2020-08).

- **FALSIFY-013** asked whether day-of-week x hour-of-day predicts **direction**. It does not.
  0 of 504 cells survive correction. Split-half sign agreement 47.6 / 51.2 / 50.6 % against a 50 % null.
- **FALSIFY-014** asked whether the same grid predicts **range and volume**. It does.
  21 to 24 of 24 hours survive, minimum q about 6e-5, peak to trough about 1.5x. The activity peak
  moves exactly one hour with US daylight saving in 6 of 6 asset-measure combinations.

Neither study supports any directional or tradability claim. FALSIFY-013 settles direction as a null
and FALSIFY-014 does not revisit it.

## Run it

Node 18 or later. No dependencies.

```sh
node fetch_1h.mjs        # pulls BTC/ETH/SOL 1h klines from Binance -> {SYM}_1h.json
node analyze_1h.mjs      # FALSIFY-013: the 168-cell direction test  (~60s, 200k permutations)
node falsify014.mjs      # FALSIFY-014: range and volume, DST split  (~2min)
node h2_decomp.mjs       # weekday vs weekend, Saturday vs Sunday
```

Write somewhere other than the working directory with `F013_DATA=/path/to/data`.

`analyze_1h.mjs` also reports a regime-conditional split when `CR_DATABASE_URL` points at a
CoinRotator SuperTrend table. That table is not public, the split had no permutation test run on it,
and it carries none of the headline results, so the script skips it and reports the split as null
when the variable is unset.

## What you should get

```
BTC: signAgree 80/168 (47.6%)   minQ 0.1457   survivors=0
ETH: signAgree 86/168 (51.2%)   minQ 0.0647   survivors=0
SOL: signAgree 85/168 (50.6%)   minQ 0.1357   survivors=0

SOL range:  hour 21/24 survive (minQ=7.06e-5)   DST peak EDT=14:00 EST=15:00
SOL volume: hour 24/24 survive (minQ=6.00e-5)   DST peak EDT=14:00 EST=15:00
```

Permutations are seeded (`mulberry32(20260801)`), so these are exact, not approximate.

## One thing worth knowing before you trust your own bars

The permutation count and the cell count have to be chosen together. Benjamini-Hochberg rejects the
top-ranked cell only when `p <= q/m`, and with `B` permutations the smallest attainable p-value is
`1/(B+1)`. The original pre-registration paired **B = 2,000** with **m = 168**, which puts the floor
at 0.0005 against a threshold of 0.000298: the top cell was arithmetically unrejectable whatever the
data said. The rule is `B >= m/q - 1`, so 168 cells at q = 0.05 needs at least 3,359. These scripts
run 200,000. The null held either way.
