import sql from '../../lib/database.mjs'
import { signals } from 'coinrotator-utils/variables.mjs';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    const alerts = await sql`
      SELECT * FROM "FourHourTrends"
      ORDER BY timestamp DESC
      LIMIT 1000;
    `;
    let coinSymbols = new Set()
    for (const alert of alerts) {
      coinSymbols.add(alert.coinsymbol.toLowerCase())
    }
    let coins = await sql`
      SELECT id, name, symbol, categories, images, "marketCap", "coingeckoCategories"
      FROM "Coin"
      WHERE symbol IN (${sql([...coinSymbols])})
    `
    const alertsToDelete = []
    for (const [i, alert] of alerts.entries()) {
      const coin = coins.find(coin => coin.symbol.toLowerCase() === alert.coinsymbol.toLowerCase())
      if (!coin) {
        alertsToDelete.push(i)
        continue;
      }
      alert.name = coin.name
      alert.categories = [...coin.categories, ...coin.coingeckoCategories]
      alert.image = coin.images.small
      alert.id = coin.id
      alert.marketCap = parseInt(coin.marketCap)
      switch (alert.trend) {
        case 'BULL':
        case 'MEAN REV BULL':
          alert.fourHourTrend = signals.buy
          break;
        case 'BEAR':
        case 'MEAN REV BEAR':
          alert.fourHourTrend = signals.sell
          break;
        default:
          alert.fourHourTrend = signals.hodl
      }
    }
    for (const i of alertsToDelete.reverse()) {
      alerts.splice(i, 1)
    }
    res.setHeader('Cache-Control', 's-maxage=60')
    res.status(200).json({ alerts })
  }
}

export default handler