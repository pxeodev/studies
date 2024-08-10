import isEmpty from 'lodash/isEmpty'

import sql from '../../lib/database.mjs'

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
      SELECT id, name, images, symbol, "marketCap"
      FROM "Coin"
      WHERE id IN ${sql([...requestedCoins])}
    `
    coins = await Promise.all(
      coins.map(async (coin) => {
        return {
          ...coin,
          marketCap: Number(coin.marketCap),
        }
      })
    )
    res.status(200).json({ coins })
  }
}

export default handler