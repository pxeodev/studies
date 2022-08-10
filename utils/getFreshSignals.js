import endOfYesterday from 'date-fns/endOfYesterday';
import isSameDay from 'date-fns/isSameDay';
import subDays from 'date-fns/subDays';

import prisma from '../lib/prisma'
import convertToDailySignals from './convertToDailySignals';
import getTrends from './getTrends';
import { defaultAtrPeriods, defaultMultiplier } from './variables'

const getFreshSignals = async () => {
  const excludedSymbols = ['usdd', 'ustc']
  const yesterday = endOfYesterday();
  const thirtyDaysAgo = subDays(new Date(), 30)

  let coinsData = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    take: 1000,
    select: {
      id: true,
      symbol: true,
      name: true,
      marketCap: true,
      twitter: true,
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
            gte: thirtyDaysAgo,
            lte: yesterday,
          }
        },
        orderBy: { closeTime: 'asc' }
      }
    }
  })
  coinsData = coinsData.filter(coin => !excludedSymbols.includes(coin.symbol))
  coinsData = coinsData.map((coinData) => {
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    let yesterdaysOhcls = coinData.ohlcs.filter(ohlc => !isSameDay(ohlc.closeTime, yesterday))
    yesterdaysOhcls = convertToDailySignals(yesterdaysOhcls)

    const [_trends, superSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier)
    const [_yesterdayTrends, yesterdaySuperSuperTrend] = getTrends(yesterdaysOhcls, defaultAtrPeriods, defaultMultiplier)

    return {
      ...coinData,
      yesterdaySuperSuperTrend,
      superSuperTrend,
    }
  })
  coinsData = coinsData.filter((coinData) => coinData.superSuperTrend !== coinData.yesterdaySuperSuperTrend);
  coinsData = coinsData.sort((a, b) => Number(b.marketCap - a.marketCap))

  return coinsData
}

export default getFreshSignals