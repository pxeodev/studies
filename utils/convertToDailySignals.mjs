import groupBy from 'lodash/groupBy.js'
import minBy from 'lodash/minBy.js'
import maxBy from 'lodash/maxBy.js'
import subSeconds from 'date-fns/subSeconds/index.js'

export default function convertToDailySignals(ohlcs, returnDays = false) {
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

      const dayOhlc = [dayOpen, dayHigh, dayLow, dayClose]

      if (returnDays) {
        const dayDate = subSeconds(dailyOhlcs[0].closeTime, 1)
        dayOhlc.push(dayDate)
      }

      return dayOhlc
    })
  }

  return ohlcs
}