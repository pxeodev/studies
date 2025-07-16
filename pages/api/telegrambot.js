import subDays from 'date-fns/subDays';
import groupBy from 'lodash/groupBy';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';
import pick from 'lodash/pick';
import reduce from 'lodash/reduce';

import sql from '../../lib/database.mjs'
import supersupertrend from 'coinrotator-utils/supersupertrend.mjs';

const handler = async (req, res) => {
  if (req.query.apiKey !== 'TELEGRAM_BOT_API_KEY') {
    res.status(401).send("Unauthorized")
  } else if (req.method !== 'GET') {
    res.status(400).send("Bad request")
  } else {
    let twoDaysAgo = subDays(new Date(), 2)
    let coins = await sql`
      SELECT "Coin"."id", "symbol", "name", "SuperTrend"."date", "SuperTrend"."trend", "SuperTrend"."quoteSymbol"
      FROM "Coin"
      LEFT JOIN "SuperTrend" ON "SuperTrend"."coinId" = "Coin"."id"
      WHERE "SuperTrend"."flavor" = 'CoinRotator'
      AND "SuperTrend"."weekly" = false
      AND "SuperTrend"."date" >= ${twoDaysAgo}
      ORDER BY "marketCapRank" ASC
    `
    coins = reduce(coins, (result, coin) => {
      if (!result[coin.id]) {
        result[coin.id] = {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          superTrends: [],
        }
      }
      result[coin.id].superTrends.push(pick(coin, ['date', 'trend', 'quoteSymbol']))
      return result
    }, [])
    coins = Object.values(coins)
    coins = coins.map(coin => {
      coin.trends = groupBy(coin.superTrends, 'date')
      delete coin.superTrends
      coin.trends = mapKeys(coin.trends, (_trends, date) => {
        date = new Date(date)
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      })
      coin.trends = mapValues(coin.trends, (trends, _date) => {
        return {
          superTrends: trends.map(superTrend => pick(superTrend, ['trend', 'quoteSymbol'])),
          superSuperTrend: supersupertrend(trends.map(superTrend => superTrend.trend)),
        }
      })

      return coin
    })
    res.status(200).json({ coins })
  }
}

export default handler