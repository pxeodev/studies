import mapValues from 'lodash/mapValues.js'
import zipWith from 'lodash/zipWith.js'
import groupBy from 'lodash/groupBy.js';

import supersupertrend from './supersupertrend.mjs';
import { SUPERTREND_FLAVOR } from './variables.mjs';
import prisma from '../lib/prisma.mjs';

export async function getSuperTrends(coinId, { flavor = SUPERTREND_FLAVOR.coinrotator, weekly = false, skipLast = false } = {}) {
  let trends = await prisma.superTrend.findMany({
    select: {
      quoteSymbol: true,
      trend: true,
      date: true
    },
    where: {
      coinId,
      flavor,
      weekly
    },
    orderBy: {
      date: 'asc'
    }
  })
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

function superSupertrendStreak(trends) {
  const supertrends = Object.values(trends).map(t => t[2])
  const supertrendsByTime = zipWith(...supertrends, (a, b, c) => [a || '', b || '', c || ''])
  const supersuperTrends = supertrendsByTime.map(supertrends => supersupertrend(supertrends))

  return getTrendStreak(supersuperTrends)[1]
}

function getTrendStreak(trends) {
  const lastTrend = trends[trends.length - 1] || ''
  let trendLength = 0
  for (let i = trends.length - 1; i > 0; i--) {
    if (lastTrend === trends[i]) {
      trendLength++
    } else {
      break
    }
  }

  return [lastTrend, trendLength]
}