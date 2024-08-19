import csv from 'csvtojson'
import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'
import slugify from 'slugify'
import { gql } from '@urql/core'

import sql from '../lib/database.mjs'
import strapi from './strapi.js'

let overrides, aliases

export async function getCategoryOverrides() {
  overrides ||= await csv().fromFile('lib/CategoryOverride.csv');

  return overrides
}

export async function getCategoryAliases() {
  aliases ||= await csv().fromFile('lib/CategoryAliases.csv');

  return aliases
}

export async function overrideCoinCategories(name, symbol, categories) {
  await getCategoryOverrides();

  const matchingOverrides = overrides.filter((coin) => {
    return coin.CoinSymbol.toLowerCase() === symbol.toLowerCase() && coin.CoinName.toLowerCase() === name.toLowerCase()
  })

  for (const override of matchingOverrides) {
    const overrideCategory = override.Category
    if (override.addORremove === 'remove') {
      categories = categories?.filter((category) => category !== overrideCategory)
    } else if (override.addORremove === 'add' && !categories?.includes(overrideCategory)) {
      categories ||= []
      categories.push(overrideCategory)
    }
  }

  return categories
}

export async function aliasCoinCategories(categories) {
  await getCategoryAliases();

  const aliasedCategories = categories.map((category) => {
    const matchingAlias = aliases.find(alias => alias.CategoryNameCoingecko === category)
    return matchingAlias ? matchingAlias.CategoryNameDropstab : category
  })

  return aliasedCategories
}

export async function getCategories() {
  const { data } = await strapi.query(
    gql`
      query Categories {
        categories(pagination: { page: 1, pageSize: 1000 }) {
          data {
            attributes {
              name
              metaDescription
              description
            }
          }
        }
      }
    `,
  )
  const categoryDescriptions = data.categories.data
  let categories = await sql`SELECT "categories", "coingeckoCategories" FROM "Coin"`
  for (const coin of Array.from(categories)) {
    coin.categories ||= []
    coin.coingeckoCategories ||= []
    const allCategories = [...coin.categories, ...coin.coingeckoCategories]
    delete coin.coingeckoCategories
    coin.categories = allCategories
  }

  categories = flow(
    flatMap('categories'),
    uniq
  )(categories)
  categories = categories.sort((a, b) => a.localeCompare(b))
  categories = categories.map((categoryName) => {
    const matchingCategory = categoryDescriptions.find((cat) => cat.attributes.name === categoryName)
    return {
      name: categoryName,
      slug: slugify(categoryName),
      description: matchingCategory?.attributes?.description,
      metaDescription: matchingCategory?.attributes?.metaDescription
    }
  })

  return categories
}