import prisma from '../lib/prisma.mjs'
import { getSuperTrends } from './getTrends.mjs';

const getFreshSignals = async () => {
  const excludedSymbols = ['usdd', 'ustc']

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

    const [_todayTrends, todaySuperSuperTrend] = await getSuperTrends(coin.id)
    const [_yesterdayTrends, yesterdaySuperSuperTrend] = await getSuperTrends(coin.id, { skipLast: true })
    const [_weekTrends, weekSuperSuperTrend] = await getSuperTrends(coin.id, { weekly: true })
    const [_lastWeekTrends, lastWeekSuperSuperTrend] = await getSuperTrends(coin.id, { weekly: true, skipLast: true })

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