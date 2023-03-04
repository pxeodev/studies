import mapValues from 'lodash/mapValues.js'
import zipWith from 'lodash/zipWith.js'

import supertrend from './supertrend.mjs'
import convertToWeeklySignals from './convertToWeeklySignals.mjs'
import supersupertrend from './supersupertrend.mjs';

export default function getTrends(ohlcs, atrPeriods, multiplier, showWeeklySignals, skipLastWeek) {
  const trends = mapValues(ohlcs, (ohlcs) => {
    if (showWeeklySignals) {
      ohlcs = convertToWeeklySignals(ohlcs)
    }
    if (skipLastWeek) {
      ohlcs.pop();
    }
    const trends = supertrend(ohlcs, { atrPeriods, multiplier })
    const [lastTrend, trendLength] = getTrendStreak(trends)
    return [lastTrend, trendLength, trends]
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