import groupBy from 'lodash/groupBy'
import minBy from 'lodash/minBy'
import maxBy from 'lodash/maxBy'
import subSeconds from 'date-fns/subSeconds'

export default function convertToDailySignals(ohlcs) {
  ohlcs = groupBy(ohlcs, 'quoteSymbol')

  for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
    let dailyQuoteSymbolOhlcs = groupBy(quoteOhlcs, (ohlc) => {
      // Subtracting 1 second here to get the OHLCs right that end at midnight
      // I.e.: January 6 00:00:00 is the last OHLC of January 5, by subtracing 1 second the date gets corrected
      const closeTime = subSeconds(ohlc.closeTime, 1)
      return `${closeTime.getUTCFullYear()}-${closeTime.getUTCMonth()}-${closeTime.getUTCDate()}`
    })

    ohlcs[quoteSymbol] = Object.values(dailyQuoteSymbolOhlcs).map((dailyOhlcs) => {
      const dayOpen = Number(minBy(dailyOhlcs, 'closeTime').open)
      const dayHigh = Math.max(...dailyOhlcs.map(ohlc => ohlc.high))
      const dayLow = Math.min(...dailyOhlcs.map(ohlc => ohlc.low))
      const dayClose = Number(maxBy(dailyOhlcs, 'closeTime').close)

      return [dayOpen, dayHigh, dayLow, dayClose]
    })
  }

  return ohlcs
}