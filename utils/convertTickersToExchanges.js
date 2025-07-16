import groupBy from 'lodash/groupBy'
import sumBy from 'lodash/sumBy'

import { excludedExchanges } from 'coinrotator-utils/variables.mjs'

export default function convertTickersToExchanges(tickers) {
  tickers = tickers.filter(ticker => !excludedExchanges.includes(ticker.market?.identifier))
  let exchanges = groupBy(tickers, 'market.name')

  Object.keys(exchanges).forEach((key) => {
    exchanges[key] = sumBy(exchanges[key], 'volume')
  })
  exchanges = Object.entries(exchanges)
  exchanges = exchanges.sort((exchangeA, exchangeB) => exchangeB[1] - exchangeA[1])

  return exchanges
}