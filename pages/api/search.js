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

    // Clean up coin data
    for (const coin of coins) {
      coin.contract = coin.platforms?.[coin.defaultPlatform]
      delete coin.platforms
      delete coin.defaultPlatform
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ coins })
  }
}

export default handler