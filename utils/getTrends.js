import mapValues from 'lodash/mapValues'

import supertrend from './supertrend'
import convertToWeeklySignals from './convertToWeeklySignals'
import supersupertrend from './supersupertrend';

export default function getTrends(ohlcs, atrPeriods, multiplier, showWeeklySignals) {
  const trends = mapValues(ohlcs, (ohlcs) => {
    if (showWeeklySignals) {
      ohlcs = convertToWeeklySignals(ohlcs)
    }
    const trends = supertrend(ohlcs, { atrPeriods, multiplier })
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
  })
  const superSupertrend = supersupertrend(mapValues(trends, (trends) => trends[0]))

  return [trends, superSupertrend]
}