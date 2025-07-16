import isEmpty from 'lodash/isEmpty'

import sql from '../../lib/database.mjs'

const handler = async (req, res) => {
  let requestedCoins = req.query['coins']
  console.log('requestedCoins', requestedCoins)
  if (isEmpty(requestedCoins)) {
    requestedCoins = 'thisisneverevereverevergonnabeavalidcoinid'
  }
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    requestedCoins = requestedCoins.split(',')
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