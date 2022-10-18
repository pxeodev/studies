import endOfYesterday from 'date-fns/endOfYesterday';
import isSameDay from 'date-fns/isSameDay';

import prisma from '../lib/prisma'
import convertToDailySignals from './convertToDailySignals';
import getTrends from './getTrends';
import { defaultAtrPeriods, defaultMultiplier } from './variables'

const getFreshSignals = async () => {
  const excludedSymbols = ['usdd', 'ustc']
  const yesterday = endOfYesterday();

  let coinsData = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      symbol: true,
      name: true,
      marketCap: true,
      twitter: true,
    }
  })
  coinsData = coinsData.filter(coin => !excludedSymbols.includes(coin.symbol))
  for (let coin of coinsData) {
    console.log(`Fetching data for ${coin.name} (${coin.symbol})`)
    let ohlcs = await prisma.ohlc.findMany({
      select: {
        closeTime: true,
        open: true,
        high: true,
        low: true,
        close: true,
        quoteSymbol: true
      },
      where: {
        coinId: coin.id,
        closeTime: {
          lte: yesterday,
        }
      },
      orderBy: { closeTime: 'asc' }
    })
    let yesterdaysOhcls = ohlcs.filter(ohlc => !isSameDay(ohlc.closeTime, yesterday))
    ohlcs = convertToDailySignals(ohlcs)
    yesterdaysOhcls = convertToDailySignals(yesterdaysOhcls)

    const [_todayTrends, todaySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier)
    const [_yesterdayTrends, yesterdaySuperSuperTrend] = getTrends(yesterdaysOhcls, defaultAtrPeriods, defaultMultiplier)
    const [_weekTrends, weekSuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true)
    const [_lastWeekTrends, lastWeekSuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true, true)

    coin.yesterdaySuperSuperTrend = yesterdaySuperSuperTrend
    coin.todaySuperSuperTrend = todaySuperSuperTrend
    coin.weekSuperSuperTrend = weekSuperSuperTrend
    coin.lastWeekSuperSuperTrend = lastWeekSuperSuperTrend
  }
  coinsData = coinsData.filter((coinData) => coinData.superSuperTrend !== coinData.yesterdaySuperSuperTrend);
  coinsData = coinsData.sort((a, b) => Number(b.marketCap - a.marketCap))

  return coinsData
}

export default getFreshSignals