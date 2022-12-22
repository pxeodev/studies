import isEmpty from 'lodash/isEmpty'
import endOfYesterday from 'date-fns/endOfYesterday';
import subWeeks from 'date-fns/subWeeks';

import prisma from '../../lib/prisma'
import convertToDailySignals from '../../utils/convertToDailySignals.mjs'
import convertTickersToExchanges from '../../utils/convertTickersToExchanges.js'
import { defaultAtrPeriods, defaultMultiplier } from '../../utils/variables.mjs'
import getTrends from '../../utils/getTrends.mjs'

const handler = async (req, res) => {
  let requestedCoins = req.query['coins[]']
  if (isEmpty(requestedCoins)) {
    requestedCoins = ['thisisneverevereverevergonnabeavalidcoinid']
  }
  if (req.method !== 'GET' || !requestedCoins instanceof Array) {
    res.status(400)
  } else {
    const yesterday = endOfYesterday();
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
              lte: yesterday,
              gte: subWeeks(yesterday, 12)
            }
          },
          orderBy: { closeTime: 'asc' }
        }
      }
    })
    coins = coins.map((coin) => {
      const ohlcs = convertToDailySignals(coin.ohlcs)
      const [_dailyTrends, dailySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, false)
      const [_weeklyTrends, weeklySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true)
      const exchanges = convertTickersToExchanges(coin.tickers)
      delete coin.ohlcs
      delete coin.tickers
      return {
        ...coin,
        exchanges,
        marketCap: Number(coin.marketCap),
        dailySuperSuperTrend,
        weeklySuperSuperTrend
      }
    })
    res.status(200).json({ coins })
  }
}

export default handler