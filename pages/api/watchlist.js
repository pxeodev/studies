import isEmpty from 'lodash/isEmpty'

import sql from '../../lib/database.mjs'
import convertTickersToExchanges from '../../utils/convertTickersToExchanges.js'

const handler = async (req, res) => {
  let requestedCoins = req.query['coins[]']
  if (isEmpty(requestedCoins)) {
    requestedCoins = ['thisisneverevereverevergonnabeavalidcoinid']
  }
  if (req.method !== 'GET' || !requestedCoins instanceof Array) {
    res.status(400)
  } else {
    if (typeof requestedCoins === 'string') {
      requestedCoins = [requestedCoins]
    }
    let coins = await sql`
      SELECT id, name, images, symbol, "marketCap", tickers
      FROM "Coin"
      WHERE id IN ${sql([...requestedCoins])}
    `
    coins = await Promise.all(
      coins.map(async (coin) => {
        const exchanges = convertTickersToExchanges(coin.tickers)
        delete coin.tickers
        return {
          ...coin,
          exchanges,
          marketCap: Number(coin.marketCap),
        }
      })
    )
    res.status(200).json({ coins })
  }
}

export default handler