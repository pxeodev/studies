import minBy from 'lodash/minBy';
import levenshtein from 'js-levenshtein';

import sql from '../../lib/database.mjs'

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    const coin = (await sql`SELECT id, tickers, derivatives FROM "Coin" WHERE id = ${req.query.id}`)[0];
    const exchanges = await sql`SELECT * FROM "Exchange"`
    let tickers = coin.tickers || []
    tickers = tickers.map((ticker) => {
      const baseSymbol = ticker.base.toUpperCase()
      const quoteSymbol = ticker.target.toUpperCase()
      const exchangeName = ticker.market.name
      let matchingExchange = exchanges.find((exchange) => exchange.name === exchangeName)
      if (!matchingExchange) {
        matchingExchange = minBy(exchanges, (exchange) => levenshtein(exchange.name, exchangeName))
      }
      return {
        key: `${baseSymbol}/${quoteSymbol}${exchangeName}`,
        name: exchangeName,
        tradeLink: ticker.trade_url,
        volume: ticker.volume,
        baseSymbol: baseSymbol,
        pair: `${baseSymbol}/${quoteSymbol}`,
        centralized: matchingExchange?.centralized
      }
    })
    const derivatives = coin.derivatives || []
    derivatives.forEach((derivative) => {
      const marketName = derivative['market']
      let matchingMarket = exchanges.find((exchange) => exchange.name === marketName)
      if (!matchingMarket) {
        matchingMarket = minBy(exchanges, (exchange) => { levenshtein(exchange.name, marketName) })
      }
      tickers.push({
        key: `derivative${derivative['symbol']}${marketName}`,
        name: marketName,
        tradeLink: matchingMarket?.url,
        volume: null,
        baseSymbol: null,
        pair: derivative['symbol'],
        derivative: true
      })
    })
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ tickers })
  }
}

export default handler