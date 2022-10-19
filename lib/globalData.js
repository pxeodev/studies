import prisma from './prisma'
import { getCategories } from '../utils/categories';

const globalData = async () => {
  const topCoins = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    take: 5,
    select: {
      id: true,
      name: true
    }
  })
  const topCategories = [
    'DeFi',
    'NFT',
    'Metaverse',
    'Meme',
    'DAO'
  ]
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
    topCoins,
    topCategories,
    categories,
    coins
  }
};

export default globalData;