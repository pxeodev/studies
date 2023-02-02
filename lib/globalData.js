import flow from 'lodash/fp/flow'
import forEach from 'lodash/fp/forEach'
import orderBy from 'lodash/fp/orderBy'
import take from 'lodash/fp/take'

import prisma from './prisma.mjs'
import { getCategories } from '../utils/categories'

const globalData = async () => {
  const categories = await getCategories()
  const coins = await prisma.coin.findMany({
    select: {
      id: true,
      name: true,
      symbol: true,
      images: true,
      marketCap: true,
      currentPrice: true,
      categories: true,
    },
    orderBy: { marketCapRank: 'asc' },
  })
  let topCategories = []
  for (const coin of coins) {
    const marketCapNumber = Number(coin.marketCap)
    const weightedCoinPrice = coin.currentPrice * marketCapNumber
    for (const category of coin.categories) {
      let matchingCategory = topCategories.find(cat => category === cat.name)
      if (!matchingCategory) {
        const categoryData = categories.find(cat => cat.name === category)
        matchingCategory = {
          name: category,
          weightedPrices: [],
          marketCapSum: 0,
          slug: categoryData.slug,
          description: categoryData.description
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

  for (let coin of coins) {
    coin.image = coin.images.small
    delete coin.images
    delete coin.marketCap
    delete coin.currentPrice
    delete coin.categories
  }

  return {
    topCategories,
    categories: categories.map(category => category.name),
    coins
  }
}

export default globalData