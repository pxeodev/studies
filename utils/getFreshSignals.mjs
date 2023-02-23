import endOfYesterday from 'date-fns/endOfYesterday/index.js';
import isSameDay from 'date-fns/isSameDay/index.js';

import prisma from '../lib/prisma.mjs'
import convertToDailySignals from './convertToDailySignals.mjs';
import getTrends from './getTrends.mjs';
import { defaultAtrPeriods, defaultMultiplier } from './variables.mjs'

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
  coinsData = coinsData.sort((a, b) => Number(b.marketCap - a.marketCap))
  const dailyFreshSignals = coinsData.filter((coinData) => coinData.todaySuperSuperTrend !== coinData.yesterdaySuperSuperTrend);
  const weeklyFreshSignals = coinsData.filter((coinData) => coinData.weekSuperSuperTrend !== coinData.lastWeekSuperSuperTrend);

  return [dailyFreshSignals, weeklyFreshSignals]
}

export default getFreshSignals