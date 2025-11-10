import sql from '../../lib/database.mjs'

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
    
    // Get BTC's 7-day change for delta calculation
    const btcOhlc = await sql`
      SELECT close 
      FROM "Ohlc" 
      WHERE "coinId" = 'bitcoin' 
        AND "quoteSymbol" = 'usd'
      ORDER BY "closeTime" DESC 
      LIMIT 43
    `
    
    let btcChange7d = null
    if (btcOhlc.length >= 43) {
      const btcCurrent = parseFloat(btcOhlc[0].close)
      const btcSevenDaysAgo = parseFloat(btcOhlc[42].close)
      btcChange7d = ((btcCurrent - btcSevenDaysAgo) / btcSevenDaysAgo) * 100
    }
    
    // Get OHLC data for all coins in one query (last 43 candles = ~7 days)
    const coinIds = coins.map(c => c.id)
    const ohlcData = await sql`
      SELECT * FROM (
        SELECT 
          "coinId",
          close,
          "closeTime",
          ROW_NUMBER() OVER (PARTITION BY "coinId" ORDER BY "closeTime" DESC) as rn
        FROM "Ohlc"
        WHERE "coinId" IN ${sql(coinIds)}
          AND "quoteSymbol" = 'usd'
      ) ranked
      WHERE rn <= 43
      ORDER BY "coinId", "closeTime" DESC
    `
    
    // Group OHLC by coinId for fast lookup
    const ohlcByCoin = {}
    for (const row of ohlcData) {
      if (!ohlcByCoin[row.coinId]) {
        ohlcByCoin[row.coinId] = []
      }
      ohlcByCoin[row.coinId].push(parseFloat(row.close))
    }
    
    // Calculate 7d change and BTC delta for each coin
    for (const coin of coins) {
      coin.contract = coin.platforms?.[coin.defaultPlatform]
      delete coin.platforms
      delete coin.defaultPlatform
      
      const coinOhlc = ohlcByCoin[coin.id]
      if (coinOhlc && coinOhlc.length >= 43) {
        const current = coinOhlc[0]
        const sevenDaysAgo = coinOhlc[42]
        coin.change7d = ((current - sevenDaysAgo) / sevenDaysAgo) * 100
        
        // Calculate BTC delta if we have BTC's change
        if (btcChange7d !== null) {
          coin.btcDelta = coin.change7d - btcChange7d
        }
      }
    }
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ coins })
  }
}

export default handler