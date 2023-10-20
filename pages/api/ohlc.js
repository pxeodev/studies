import subDays from 'date-fns/subDays'
import prisma from '../../lib/prisma.mjs'
import pick from 'lodash/pick';

const handler = async (req, res) => {
  if (req.query.apiKey !== 'YET_ANOTHER_UNGUESSABLE_API_KEY') {
    res.status(401).send("Unauthorized")
  } else if (req.method !== 'GET') {
    res.status(400).send("Bad request")
  } else {
    let coins = await prisma.coin.findMany({
      orderBy: { marketCapRank: 'asc' },
      take: 100,
      include: {
        ohlcs: {
          select: {
            closeTime: true,
            open: true,
            high: true,
            low: true,
            close: true,
            quoteSymbol: true
          },
          where: {
            closeTime: {
              gte: subDays(new Date(), 30),
            }
          },
          orderBy: { closeTime: 'asc' },
        }
      }
    })
    coins = coins.map(coin => {
      coin.ohlcs = coin.ohlcs.map(ohlcv => {
        return [Number(ohlcv.open), Number(ohlcv.high), Number(ohlcv.low), Number(ohlcv.close), ohlcv.closeTime.getTime(), ohlcv.quoteSymbol]
      })
      return pick(coin, ['symbol', 'name', 'ohlcs'])
    })
    res.status(200).json({ coins })
  }
}

export default handler