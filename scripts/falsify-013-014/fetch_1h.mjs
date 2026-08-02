#!/usr/bin/env node
// Pull pure 1h klines from Binance spot for FALSIFY-013 (168-cell dow x hour grid).
// Fetch pattern mirrors simulation-engine/scripts/refetch_clean_daily.js (cursor + dedupe + retry).
// Fixed-granularity source: interval=1h is honoured exactly, unlike CoinGecko's range-dependent /ohlc.
import { writeFileSync } from 'fs';

const HOST = 'https://data-api.binance.vision';
const DIR  = process.env.F013_DATA || '.';
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };
const HOUR_MS = 3600000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0,120)}`);
      return await r.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

async function fetchHourly(pair) {
  const rows = [];
  const seen = new Set();
  let cursor = 0;                       // startTime=0 -> Binance returns earliest available
  for (let call = 0; ; call++) {
    const batch = await fetchJSON(`${HOST}/api/v3/klines?symbol=${pair}&interval=1h&startTime=${cursor}&limit=1000`);
    if (!batch.length) break;
    let added = 0;
    for (const k of batch) {
      const openTime = k[0];
      if (seen.has(openTime)) continue;
      seen.add(openTime);
      rows.push({ t: openTime, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });
      added++;
    }
    const lastOpen = batch[batch.length - 1][0];
    if (added === 0 || lastOpen <= cursor) break;
    cursor = lastOpen + HOUR_MS;
    if (call % 20 === 0) process.stdout.write(`  ${pair} ${rows.length} bars\r`);
    await sleep(120);
  }
  rows.sort((a, b) => a.t - b.t);
  return rows;
}

for (const [sym, pair] of Object.entries(PAIRS)) {
  const rows = await fetchHourly(pair);
  // drop the in-progress final bar: its close is not settled
  const nowH = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const closed = rows.filter(r => r.t < nowH);
  const iso = t => new Date(t).toISOString();
  // gap audit against a perfect 1h grid
  const gaps = new Map();
  for (let i = 1; i < closed.length; i++) {
    const g = (closed[i].t - closed[i-1].t) / HOUR_MS;
    gaps.set(g, (gaps.get(g) || 0) + 1);
  }
  const expected = (closed.at(-1).t - closed[0].t) / HOUR_MS + 1;
  console.log(`${sym} (${pair}): ${closed.length} bars  ${iso(closed[0].t)} -> ${iso(closed.at(-1).t)}`);
  console.log(`   expected on perfect grid: ${expected}  missing: ${expected - closed.length}`);
  console.log(`   gap histogram (hours): ${[...gaps.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([g,n])=>`${g}h:${n}`).join('  ')}`);
  writeFileSync(`${DIR}/${sym}_1h.json`, JSON.stringify(closed));
}
console.log('done');
