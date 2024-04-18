import groupBy from 'lodash/groupBy.js'
import minBy from 'lodash/minBy.js'
import maxBy from 'lodash/maxBy.js'

export default function convertToDailySignals(ohlcs, returnDays = false) {
  ohlcs = groupBy(ohlcs, 'quoteSymbol')

  for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
    let dailyQuoteSymbolOhlcs = groupBy(quoteOhlcs, (ohlc) => {
      return `${ohlc.closeTime.getUTCFullYear()}-${ohlc.closeTime.getUTCMonth()}-${ohlc.closeTime.getUTCDate()}`
    })

    ohlcs[quoteSymbol] = Object.values(dailyQuoteSymbolOhlcs).map((dailyOhlcs) => {
      const dayOpen = Number(minBy(dailyOhlcs, 'closeTime').open)
      const dayHigh = Math.max(...dailyOhlcs.map(ohlc => ohlc.high))
      const dayLow = Math.min(...dailyOhlcs.map(ohlc => ohlc.low))
      const dayClose = Number(maxBy(dailyOhlcs, 'closeTime').close)

      const dayOhlc = [dayOpen, dayHigh, dayLow, dayClose]

      if (returnDays) {
        dayOhlc.push(dailyOhlcs[0].closeTime)
      }

      return dayOhlc
    })
  }

  return ohlcs
}