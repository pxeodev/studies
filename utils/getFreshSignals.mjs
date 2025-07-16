import sql from '../lib/database.mjs'
import { getSuperTrends } from './getTrends.mjs';

const getFreshSignals = async () => {
  const excludedSymbols = ['usdd', 'ustc']

  let coinsData = await sql`SELECT id, symbol, name, "marketCap", twitter FROM "Coin" ORDER BY "marketCapRank" ASC`
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