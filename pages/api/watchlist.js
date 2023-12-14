import isEmpty from 'lodash/isEmpty'

import prisma from '../../lib/prisma.mjs'
import convertTickersToExchanges from '../../utils/convertTickersToExchanges.js'

const handler = async (req, res) => {
  let requestedCoins = req.query['coins[]']
  if (isEmpty(requestedCoins)) {
    requestedCoins = ['thisisneverevereverevergonnabeavalidcoinid']
  }
  if (req.method !== 'GET' || !requestedCoins instanceof Array) {
    res.status(400)
  } else {
    let coins = await prisma.coin.findMany({
      where: {
        id: {
          in: requestedCoins
        }
      },
      select: {
        id: true,
        name: true,
        images: true,
        symbol: true,
        marketCap: true,
        tickers: true,
      }
    })
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