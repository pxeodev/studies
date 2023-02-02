import dotenv from 'dotenv';

import prisma from '../lib/prisma.mjs'
import { getCategoryOverrides, overrideCoinCategories } from '../utils/categories.mjs'

dotenv.config();

const overrideCategories = async () => {
  const overrides = await getCategoryOverrides();
  for (const override of overrides) {
    const coinData = await prisma.coin.findFirst({
      where: {
        name: override.CoinName,
        symbol: override.CoinSymbol.toLowerCase(),
      },
      select: {
        id: true,
        categories: true,
      }
    })
    const categories = await overrideCoinCategories(override.CoinName, override.CoinSymbol, coinData.categories)
    await prisma.coin.update({
      where: {
        id: coinData.id,
      },
      data: {
        categories,
      }
    })
  }
}

overrideCategories();