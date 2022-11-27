import prisma from './prisma'
import { getCategories } from '../utils/categories';

const globalData = async () => {
  const categories = await getCategories()
  const coins = await prisma.coin.findMany({
    select: {
      id: true,
      name: true,
      symbol: true,
      images: true,
      marketCap: true
    },
    orderBy: { marketCapRank: 'asc' },
  })
  for (let coin of coins) {
    coin.image = coin.images.small
    delete coin.images
    delete coin.marketCap
  }

  return {
    categories,
    coins
  }
};

export default globalData;