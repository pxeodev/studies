import sql from '../../lib/database.mjs'

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    const coins = await sql`
      SELECT
        id,
        name,
        symbol,
        (images ->> 'small') AS image
      FROM "Coin"
      ORDER BY "marketCapRank" ASC
    `
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ coins })
  }
}

export default handler