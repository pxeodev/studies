import csv from 'csvtojson'
import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'
import slugify from 'slugify'
import { gql } from '@urql/core'

import prisma from '../lib/prisma.mjs'
import strapi from './strapi.js'

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