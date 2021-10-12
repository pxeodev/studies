import round from 'lodash/round'

// Taken from https://tradingtuitions.com/supertrend-indicator-excel-sheet-with-realtime-buy-sell-signals/
const supertrend = (data = [], options = { atrPeriods: 10, multiplier: 1.5 }) => {
  return data
  .map((entry, index) => {
    if (index === 0) {
      return [...entry, 0]
    }
    // Max of (High-Low, High-Close, Low-Close)
    const tr = Math.max(...[entry[2] - entry[3], Math.abs(entry[2] - data[index - 1][4]), Math.abs(entry[3] - data[index - 1][4])]) || 0
    return [...entry, round(tr, 10)]
  })
  .map((entry, index, array) => {
    if (index < options.atrPeriods) { return entry; }

    // Calc ATR(SMA)
    const atrSMA = array
      .slice(index + 1 - options.atrPeriods, index + 1)
      .map(atrEntry => atrEntry[atrEntry.length - 1])
      .reduce((previous, next) => previous + next, 0) / options.atrPeriods
    const roundedAtrSMA = round(atrSMA, 10)

    const basicUpperband = (entry[2] + entry[3]) / 2 + options.multiplier * atrSMA
    const roundedBasicUpperband = round(basicUpperband, 10)
    const basicLowerband = (entry[2] + entry[3]) / 2 - options.multiplier * atrSMA
    const roundedBasicLowerband = round(basicLowerband, 10)

    let newEntry = [...entry, roundedAtrSMA, roundedBasicUpperband, roundedBasicLowerband]
    // The final upperband and the final lowerband equal the basic upperband and the basic lowerband for the first entry in the ATR period
    if (index === options.atrPeriods) {
      newEntry.push(roundedBasicUpperband, roundedBasicLowerband)
    }

    return newEntry
  })
  .reduce((previousResult, currentEntry, index) => {
    if (index <= options.atrPeriods) { return [...previousResult, currentEntry] }

    const previousClose = previousResult[index -1][4]

    const previousFinalUpperband = previousResult[index - 1][9]
    const currentBasicUpperband = currentEntry[7]
    const finalUpperband = (currentBasicUpperband < previousFinalUpperband || previousClose > previousFinalUpperband) ? currentBasicUpperband : previousFinalUpperband

    const previousFinalLowerband = previousResult[index - 1][10]
    const currentBasicLowerband = currentEntry[8]
    const finalLowerband = (currentBasicLowerband > previousFinalLowerband || previousClose < previousFinalLowerband) ? currentBasicLowerband : previousFinalLowerband

    return [...previousResult, [...currentEntry, finalUpperband, finalLowerband]]
  }, [])
  .map((entry, index, array) => {
    if (index < options.atrPeriods) { return '' }

    const previousSuperTrend = array[index - 1][11]
    const previousFinalUpperband = array[index - 1][9]
    const previousFinalLowerband = array[index - 1][10]
    const currentClose = entry[4]
    const currentFinalUpperband = entry[9]
    const currentFinalLowerband = entry[10]

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

    return entry[4] < supertrendIndicator ? 'sell' : 'buy'
  })
}

export default supertrend
