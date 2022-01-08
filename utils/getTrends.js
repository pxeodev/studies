import mapValues from 'lodash/mapValues'

import supertrend from './supertrend'
import convertToWeeklySignals from './convertToWeeklySignals'
import { signals } from './variables'

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
  let superSupertrend
  const superTrends = Object.values(trends).map(trend => trend[0]).filter(trend => trend.length)
  if (superTrends.length === 2) {
    superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : signals.hodl
  } else if (superTrends.every(tr => tr === signals.buy)) {
    superSupertrend = signals.buy
  } else if (superTrends.every(tr => tr === signals.sell)) {
    superSupertrend = signals.sell
  } else {
    superSupertrend = signals.hodl
  }

  return [trends, superSupertrend]
}