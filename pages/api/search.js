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

    // Get trends for all coins - optimized single query with limited lookback
    let trendsByCoin = {}
    if (latestDate) {
      const coinIds = coins.map(c => c.id)

      // Limit lookback to 30 days for performance
      const lookbackDate = new Date(latestDate)
      lookbackDate.setDate(lookbackDate.getDate() - 30)

      // Single query to get all trends with date filtering
      const allTrends = await sql`
        SELECT "coinId", "quoteSymbol", trend, date
        FROM "SuperTrend"
        WHERE "coinId" IN ${sql(coinIds)}
          AND flavor = 'CoinRotator'
          AND weekly = false
          AND date >= ${lookbackDate}
          AND date <= ${latestDate}
        ORDER BY "coinId", date DESC, "quoteSymbol"
      `

      // Group by coinId and date
      const trendsByCoinAndDate = groupBy(allTrends, 'coinId')

      for (const [coinId, coinTrends] of Object.entries(trendsByCoinAndDate)) {
        // Group by date
        const trendsByDate = groupBy(coinTrends, 'date')
        const dates = Object.keys(trendsByDate).sort().reverse()

        if (dates.length === 0) continue

        // Get latest date trend
        const latestDateTrends = trendsByDate[dates[0]]
        const latestTrendValues = latestDateTrends.map(t => t.trend)
        const currentTrend = supersupertrend(latestTrendValues)

        // Calculate streak
        let streak = 1
        for (let i = 1; i < dates.length; i++) {
          const dateTrends = trendsByDate[dates[i]]
          const trendValues = dateTrends.map(t => t.trend)
          const dateSuperSupertrend = supersupertrend(trendValues)

          if (dateSuperSupertrend === currentTrend) {
            streak++
          } else {
            break
          }
        }

        trendsByCoin[coinId] = { trend: currentTrend, streak }
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