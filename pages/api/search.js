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
      // Order by date ASC to match getTrends.mjs behavior
      const allTrends = await sql`
        SELECT "coinId", "quoteSymbol", trend, date
        FROM "SuperTrend"
        WHERE "coinId" IN ${sql(coinIds)}
          AND flavor = 'CoinRotator'
          AND weekly = false
          AND date >= ${lookbackDate}
          AND date <= ${latestDate}
        ORDER BY "coinId", date ASC, "quoteSymbol"
      `

      // Group by coinId
      const trendsByCoinId = groupBy(allTrends, 'coinId')

      for (const [coinId, coinTrends] of Object.entries(trendsByCoinId)) {
        // Group by quoteSymbol first (like getTrends.mjs does)
        const trendsByQuote = groupBy(coinTrends, 'quoteSymbol')

        // Get trends for each quote symbol in chronological order
        const ethTrends = (trendsByQuote['eth'] || []).map(t => t.trend)
        const btcTrends = (trendsByQuote['btc'] || []).map(t => t.trend)
        const usdTrends = (trendsByQuote['usd'] || []).map(t => t.trend)

        // Calculate supersupertrend for each date (using zipWith logic)
        const minLength = Math.min(ethTrends.length, btcTrends.length, usdTrends.length)
        if (minLength === 0) continue

        const supersuperTrends = []
        for (let i = 0; i < minLength; i++) {
          const superSupertrend = supersupertrend([
            ethTrends[i] || '',
            btcTrends[i] || '',
            usdTrends[i] || ''
          ])
          supersuperTrends.push(superSupertrend)
        }

        // Get latest trend and streak (using getTrendStreak logic)
        if (supersuperTrends.length === 0) continue

        const lastTrend = supersuperTrends[supersuperTrends.length - 1]
        let streak = 1

        // Count backwards from second-to-last
        for (let i = supersuperTrends.length - 2; i >= 0; i--) {
          if (lastTrend === supersuperTrends[i]) {
            streak++
          } else {
            break
          }
        }

        trendsByCoin[coinId] = { trend: lastTrend, streak }
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