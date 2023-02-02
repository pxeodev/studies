import csv from 'csvtojson'
import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'
import slugify from 'slugify'

import prisma from '../lib/prisma.mjs'

let overrides

export async function getCategoryOverrides() {
  overrides ||= await csv().fromFile('lib/CategoryOverride.csv');

  return overrides
}

export async function overrideCoinCategories(name, symbol, categories) {
  await getCategoryOverrides();

  const matchingOverrides = overrides.filter((coin) => {
    return coin.CoinSymbol.toLowerCase() === symbol.toLowerCase() && coin.CoinName.toLowerCase() === name.toLowerCase()
  })

  for (const override of matchingOverrides) {
    const overrideCategory = override.Category
    if (override.addORremove === 'remove') {
      categories = categories.filter((category) => category !== overrideCategory)
    } else if (override.addORremove === 'add' && !categories.includes(overrideCategory)) {
      categories.push(overrideCategory)
    }
  }

  return categories
}

export async function getCategories() {
  const categoryDescriptions = await csv().fromFile('lib/CategoryDescriptions.csv');
  let categories = await prisma.coin.findMany({
    select: {
      categories: true
    }
  })
  categories = flow(
    flatMap('categories'),
    uniq
  )(categories)
  categories = categories.sort((a, b) => a.localeCompare(b))
  categories = categories.map((categoryName) => {
    const description = categoryDescriptions.find((cat) => cat.CategoryName === categoryName)?.CategoryDescription
    return {
      name: categoryName,
      slug: slugify(categoryName, { lower: true }),
      description
    }
  })

  return categories
}