import sql from '../../lib/database.mjs'
import supersupertrend from 'coinrotator-utils/supersupertrend.mjs'
import groupBy from 'lodash/groupBy.js'

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    let coins = await sql`
      SELECT
        id,
        name,
        symbol,
        platforms,
        "defaultPlatform",
        (images ->> 'small') AS image,
        "marketCapRank",
        "marketCap"
      FROM "Coin"
      ORDER BY "marketCapRank" ASC
    `

    // Clean up coin data
    for (const coin of coins) {
      coin.contract = coin.platforms?.[coin.defaultPlatform]
      delete coin.platforms
      delete coin.defaultPlatform
    }

    // Get latest date from SuperTrend
    const latestDateResult = await sql`
      SELECT MAX(date) as latest_date
      FROM "SuperTrend"
      WHERE flavor = 'CoinRotator'
        AND weekly = false
    `
    const latestDate = latestDateResult[0]?.latest_date

    // Get trends for all coins at latest date
    let trendsByCoin = {}
    if (latestDate) {
      const coinIds = coins.map(c => c.id)
      const trends = await sql`
        SELECT "coinId", "quoteSymbol", trend, date
        FROM "SuperTrend"
        WHERE "coinId" IN ${sql(coinIds)}
          AND flavor = 'CoinRotator'
          AND weekly = false
          AND date = ${latestDate}
        ORDER BY "coinId", "quoteSymbol"
      `

      // Group by coinId and calculate supersupertrend
      const trendsByCoinId = groupBy(trends, 'coinId')
      for (const [coinId, coinTrends] of Object.entries(trendsByCoinId)) {
        const trendValues = coinTrends.map(t => t.trend)
        const superSupertrend = supersupertrend(trendValues)
        trendsByCoin[coinId] = { trend: superSupertrend }
      }

      // Calculate streaks - get previous dates for each coin
      const previousTrends = await sql`
        SELECT "coinId", "quoteSymbol", trend, date
        FROM "SuperTrend"
        WHERE "coinId" IN ${sql(coinIds)}
          AND flavor = 'CoinRotator'
          AND weekly = false
          AND date < ${latestDate}
        ORDER BY "coinId", date DESC, "quoteSymbol"
      `

      // Group by coinId and date, calculate streaks
      const trendsByCoinAndDate = groupBy(previousTrends, 'coinId')
      for (const [coinId, coinTrendHistory] of Object.entries(trendsByCoinAndDate)) {
        if (!trendsByCoin[coinId]) continue

        const currentTrend = trendsByCoin[coinId].trend
        const trendsByDate = groupBy(coinTrendHistory, 'date')
        const dates = Object.keys(trendsByDate).sort().reverse()

        let streak = 1
        for (const date of dates) {
          const dateTrends = trendsByDate[date]
          const trendValues = dateTrends.map(t => t.trend)
          const dateSuperSupertrend = supersupertrend(trendValues)

          if (dateSuperSupertrend === currentTrend) {
            streak++
          } else {
            break
          }
        }

        trendsByCoin[coinId].streak = streak
      }
    }

    // Attach trend data to coins
    for (const coin of coins) {
      const trendData = trendsByCoin[coin.id]
      if (trendData) {
        coin.dailySuperSuperTrend = trendData.trend
        coin.dailySuperSuperTrendStreak = trendData.streak || 1
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ coins })
  }
}

export default handler