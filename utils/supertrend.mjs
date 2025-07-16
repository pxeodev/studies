import round from 'lodash/round.js';

import { signals } from 'coinrotator-utils/variables.mjs';

// Taken from https://tradingtuitions.com/supertrend-indicator-excel-sheet-with-realtime-buy-sell-signals/
const supertrend = (data = [], options = { atrPeriods: 10, multiplier: 1.5 }) => {
  return data
  .map((entry, index) => {
    if (index === 0) {
      return [...entry, 0]
    }
    // Max of (High-Low, High-Close, Low-Close)
    const tr = Math.max(...[entry[1] - entry[2], Math.abs(entry[1] - data[index - 1][3]), Math.abs(entry[2] - data[index - 1][3])]) || 0
    return [...entry, round(tr, 10)]
  })
  .map((entry, index, array) => {
    if (index < options.atrPeriods) { return entry; }

    const alpha = 1 / options.atrPeriods
    const rma = alpha * entry[entry.length - 1] + (1 - alpha) * (array[index - 1][5] || 0)
    const roundedRMA = round(rma, 10)
    entry.push(roundedRMA)

    const basicUpperband = (entry[1] + entry[2]) / 2 + options.multiplier * roundedRMA
    const roundedBasicUpperband = round(basicUpperband, 10)
    const basicLowerband = (entry[1] + entry[2]) / 2 - options.multiplier * roundedRMA
    const roundedBasicLowerband = round(basicLowerband, 10)

    let newEntry = [...entry, roundedBasicUpperband, roundedBasicLowerband]
    // The final upperband and the final lowerband equal the basic upperband and the basic lowerband for the first entry in the ATR period
    if (index === options.atrPeriods) {
      newEntry.push(roundedBasicUpperband, roundedBasicLowerband)
    }

    return newEntry
  })
  .reduce((previousResult, currentEntry, index) => {
    if (index <= options.atrPeriods) { return [...previousResult, currentEntry] }

    const previousClose = previousResult[index -1][3]

    const previousFinalUpperband = previousResult[index - 1][8]
    const currentBasicUpperband = currentEntry[6]
    const finalUpperband = (currentBasicUpperband < previousFinalUpperband || previousClose > previousFinalUpperband) ? currentBasicUpperband : previousFinalUpperband

    const previousFinalLowerband = previousResult[index - 1][9]
    const currentBasicLowerband = currentEntry[7]
    const finalLowerband = (currentBasicLowerband > previousFinalLowerband || previousClose < previousFinalLowerband) ? currentBasicLowerband : previousFinalLowerband

    return [...previousResult, [...currentEntry, finalUpperband, finalLowerband]]
  }, [])
  .map((entry, index, array) => {
    if (index < options.atrPeriods) { return '' }

    const previousSuperTrend = array[index - 1][10]
    const previousFinalUpperband = array[index - 1][8]
    const previousFinalLowerband = array[index - 1][9]
    const currentClose = entry[3]
    const currentFinalUpperband = entry[8]
    const currentFinalLowerband = entry[9]

    let supertrendIndicator;
    if (previousSuperTrend === previousFinalUpperband && currentClose <= currentFinalUpperband) {
      supertrendIndicator = currentFinalUpperband
    } else if (previousSuperTrend === previousFinalUpperband && currentClose > currentFinalUpperband) {
      supertrendIndicator = currentFinalLowerband
    } else if (previousSuperTrend === previousFinalLowerband && currentClose >= currentFinalLowerband) {
      supertrendIndicator = currentFinalLowerband
    } else if (previousSuperTrend === previousFinalLowerband && currentClose < currentFinalLowerband) {
      supertrendIndicator = currentFinalUpperband
    }

    entry.push(supertrendIndicator)

    return entry[3] < supertrendIndicator ? signals.sell : signals.buy
  })
}

export default supertrend
