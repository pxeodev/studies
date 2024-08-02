import sql from '../lib/database.mjs';
import { defaultAtrPeriods, defaultMultiplier, classicAtrPeriods, classicMultiplier, SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';
import supertrend from './supertrend.mjs';
import convertToWeeklySignals from './convertToWeeklySignals.mjs';
import { subDays } from 'date-fns';
import convertToDailySignals from './convertToDailySignals.mjs';

export const convertOhlcsToSuperTrends = (ohlcs, coinId, quoteSymbol, flavor, weekly = false) => {
  if (weekly) {
    ohlcs = convertToWeeklySignals(ohlcs, true)
  }
  const ohlcsWithoutCloseDate = ohlcs.map(ohlc => ohlc.slice(0, 4))
  const atrPeriods = flavor === SUPERTREND_FLAVOR.coinrotator ? defaultAtrPeriods : classicAtrPeriods
  const multiplier = flavor === SUPERTREND_FLAVOR.coinrotator ? defaultMultiplier : classicMultiplier
  let trends = supertrend(ohlcsWithoutCloseDate, { atrPeriods, multiplier })
  return trends.map((trend, i) => {
    const matchingOhlcs = ohlcs[i]
    return {
      coinId,
      quoteSymbol,
      trend,
      flavor,
      date: matchingOhlcs[4],
      weekly,
    }
  }).filter(t => t.trend !== '')
}

export async function saveDailyOhlcsToSupertrends (ohlcs, coinId) {
  for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
    console.log(`Saving ${coinId}(${quoteSymbol}) to supertrends`)
    const crTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator)
    await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(crTrends)} ON CONFLICT DO NOTHING`
    const classicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic)
    await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(classicTrends)} ON CONFLICT DO NOTHING`

    const today = new Date()
    let weeklyCoinOhlcs = await sql`SELECT * FROM "Ohlc" WHERE "coinId" = ${coinId} AND "quoteSymbol" = ${quoteSymbol} AND "closeTime" >= ${subDays(today, 13 * 7)} ORDER BY "closeTime" ASC`
    weeklyCoinOhlcs = convertToDailySignals(weeklyCoinOhlcs, true)[quoteSymbol] || []

    const weeklyCrTrends = convertOhlcsToSuperTrends(weeklyCoinOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, true)
    await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(weeklyCrTrends)} ON CONFLICT DO NOTHING`
    const weeklyClassicTrends = convertOhlcsToSuperTrends(weeklyCoinOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, true)
    await sql`INSERT INTO "SuperTrend" ("coinId", "quoteSymbol", "trend", "flavor", "weekly", "date") VALUES ${sql(weeklyClassicTrends)} ON CONFLICT DO NOTHING`
  }
}