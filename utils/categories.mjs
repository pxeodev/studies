import csv from 'csvtojson'
import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'

import prisma from '../lib/prisma.mjs'

let overrides
export async function overrideCoinCategories(name, symbol, categories) {
  overrides ||= await csv().fromFile('lib/CategoryOverride.csv');

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
  let categories = await prisma.coin.findMany({
    select: {
      categories: true
    }
  })
  categories = flow(
    flatMap('categories'),
    uniq
  )(categories)

  return categories.sort((a, b) => a.localeCompare(b))
}