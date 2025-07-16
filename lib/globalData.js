import flow from 'lodash/fp/flow'
import forEach from 'lodash/fp/forEach'
import orderBy from 'lodash/fp/orderBy'
import take from 'lodash/fp/take'

import sql from './database.mjs'
import { getCategories } from '../utils/categories'

const globalData = async () => {
  const categories = await getCategories()
  const coins = await sql`
    SELECT "marketCap", "currentPrice", "categories"
    FROM "Coin"
    ORDER BY "marketCapRank" ASC
  `
  let topCategories = []
  for (const coin of coins) {
    const marketCapNumber = Number(coin.marketCap)
    const weightedCoinPrice = coin.currentPrice * marketCapNumber
    coin.categories ||= []
    for (const category of coin.categories) {
      let matchingCategory = topCategories.find(cat => category === cat.name)
      if (!matchingCategory) {
        const categoryData = categories.find(cat => cat.name === category)
        matchingCategory = {
          name: category,
          weightedPrices: [],
          marketCapSum: 0,
          slug: categoryData.slug
        }
        topCategories.push(matchingCategory)
      }
      matchingCategory.weightedPrices.push(weightedCoinPrice)
      matchingCategory.marketCapSum += marketCapNumber
    }
  }
  topCategories = flow(
    forEach((category) => {
      category.indexPrice = category.weightedPrices.reduce((acc, cur) => acc + cur, 0) / category.marketCapSum
      delete category.weightedPrices
      delete category.marketCapSum
    }),
    orderBy('indexPrice', 'desc'),
    take(5)
  )(topCategories)

  return {
    topCategories,
    categories: categories.map(category => category.name),
    lastUpdated: new Date()
  }
}

export default globalData