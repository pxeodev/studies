import subDays from 'date-fns/subDays';
import pick from 'lodash/pick';
import groupBy from 'lodash/groupBy';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';

import prisma from '../../lib/prisma.mjs'
import supersupertrend from '../../utils/supersupertrend.mjs';

const handler = async (req, res) => {
  if (req.query.apiKey !== 'TELEGRAM_BOT_API_KEY') {
    res.status(401).send("Unauthorized")
  } else if (req.method !== 'GET') {
    res.status(400).send("Bad request")
  } else {
    let coins = await prisma.coin.findMany({
      orderBy: { marketCapRank: 'asc' },
      include: {
        superTrends: {
          select: {
            trend: true,
            quoteSymbol: true,
            date: true,
          },
          where: {
            flavor: 'CoinRotator',
            weekly: false,
            date: {
              gte: subDays(new Date(), 2),
            }
          },
        }
      }
    })
    coins = coins.map(coin => {
      coin = pick(coin, ['id', 'symbol', 'name', 'superTrends'])
      coin.trends = groupBy(coin.superTrends, 'date')
      delete coin.superTrends
      coin.trends = mapKeys(coin.trends, (_trends, date) => {
        date = new Date(date)
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      })
      coin.trends = mapValues(coin.trends, (trends, _date) => {
        return {
          superTrends: trends.map(superTrend => pick(superTrend, ['trend', 'quoteSymbol'])),
          superSuperTrend: supersupertrend(trends.map(superTrend => superTrend.trend)),
        }
      })

      return coin
    })
    res.status(200).json({ coins })
  }
}

export default handler