import subDays from 'date-fns/subDays'
import sql from '../../lib/database.mjs'
import pick from 'lodash/pick';

const handler = async (req, res) => {
  if (req.query.apiKey !== 'YET_ANOTHER_UNGUESSABLE_API_KEY') {
    res.status(401).send("Unauthorized")
  } else if (req.method !== 'GET') {
    res.status(400).send("Bad request")
  } else {
    const coins = await sql`
      SELECT id, name, symbol, images
      FROM "Coin"
      WHERE "closeTime" >= ${subDays(new Date(), 30)}
      ORDER BY "marketCapRank" ASC
      LIMIT 100
    `;
    coins = coins.map(coin => {
      coin.ohlcs = coin.ohlcs.map(ohlcv => {
        return [Number(ohlcv.open), Number(ohlcv.high), Number(ohlcv.low), Number(ohlcv.close), ohlcv.closeTime.getTime(), ohlcv.quoteSymbol]
      })
      return pick(coin, ['symbol', 'name', 'ohlcs'])
    })
    res.status(200).json({ coins })
  }
}

export default handler