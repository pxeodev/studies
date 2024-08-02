import mapValues from 'lodash/mapValues.js'
import groupBy from 'lodash/groupBy.js';

import supersupertrend from 'coinrotator-utils/supersupertrend.mjs';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';
import { getTrendStreak, superSupertrendStreak } from 'coinrotator-utils/gettrends.mjs';
import sql from '../lib/database.mjs';

export async function getSuperTrends(coinId, { flavor = SUPERTREND_FLAVOR.coinrotator, weekly = false, skipLast = false } = {}) {
  let trends = await sql`
    SELECT "quoteSymbol", trend, date
    FROM "SuperTrend"
    WHERE "coinId" = ${coinId}
      AND flavor = ${flavor}
      AND weekly = ${weekly}
    ORDER BY date ASC
  `;
  trends = groupBy(trends, 'quoteSymbol')
  trends = mapValues(trends, (trend) => {
    if (skipLast) {
      trend.pop();
    }
    const onlyTrends = trend.map(t => t.trend)
    const [lastTrend, trendLength] = getTrendStreak(onlyTrends)

    return [lastTrend, trendLength, onlyTrends]
  })
  const superSupertrend = supersupertrend(Object.values(mapValues(trends, (trends) => trends[0])))
  const streak = superSupertrendStreak(trends)

  return [trends, superSupertrend, streak]
}