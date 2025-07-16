import dotenv from 'dotenv';

import sql from '../lib/database.mjs'
import { getCategoryOverrides, overrideCoinCategories } from '../utils/categories.mjs'

dotenv.config();

const overrideCategories = async () => {
  const overrides = await getCategoryOverrides();
  for (const override of overrides) {
    const coinData = await sql`SELECT id, "categories" FROM "Coin" WHERE "name" = ${override.CoinName} AND "symbol" = ${override.CoinSymbol.toLowerCase()}`
    const categories = await overrideCoinCategories(override.CoinName, override.CoinSymbol, coinData.categories)
    await sql`UPDATE "Coin" SET "categories" = ${categories} WHERE id = ${coinData.id}`
  }
}

overrideCategories();