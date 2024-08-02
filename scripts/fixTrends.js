import dotenv from 'dotenv';
import axios from 'axios';

import sql from '../lib/database.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { convertOhlcsToSuperTrends } from '../utils/ohlc.mjs';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';

dotenv.config();

const fixTrends = async () => {
  await sql`DELETE FROM "SuperTrend"`
  let allCoinIds = await sql`
    SELECT id
    FROM "Coin"
    ORDER BY id ASC
  `;
  allCoinIds = allCoinIds.map(coin => coin.id)
  for (const coinId of allCoinIds) {
    console.log(coinId)
    let ohlcs = await sql`SELECT "closeTime", "open", "high", "low", "close", "quoteSymbol" FROM "Ohlc" WHERE "coinId" = ${coinId} ORDER BY "closeTime" ASC`
    ohlcs = convertToDailySignals(ohlcs, true)
    for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
      const weeklyCrTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, true)
      await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(weeklyCrTrends)} ON CONFLICT DO NOTHING`
      const weeklyClassicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, true)
      await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(weeklyClassicTrends)} ON CONFLICT DO NOTHING`

      const dailyCrTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, false)
      await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(dailyCrTrends)} ON CONFLICT DO NOTHING`
      const dailyClassicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, false)
      await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(dailyClassicTrends)} ON CONFLICT DO NOTHING`
    }
  }
  axios.post('https://coinrotator-realtime-fra.onrender.com/new-trends')
}

fixTrends();