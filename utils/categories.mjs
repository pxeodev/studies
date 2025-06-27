import csv from 'csvtojson'
import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'
import slugify from 'slugify'
import { gql } from '@urql/core'
import { Langfuse } from 'langfuse'

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

/**
 * Creates a Langfuse prompt with all unique categories and coingeckoCategories from the Coin table.
 *
 * @param {Object} options - Options for the prompt creation.
 * @param {string} [options.name] - Name of the prompt (default: 'all-categories-list')
 * @param {string} [options.type] - Type of the prompt (default: 'text')
 * @param {string[]} [options.labels] - Labels for the prompt (default: ['production'])
 * @param {Object} [options.config] - Config for the prompt (default: { model: 'gpt-4o', temperature: 0.7, supported_languages: ['en'] })
 * @returns {Promise<Object>} The created prompt object from Langfuse
 *
 * Usage:
 *   await createCategoriesPromptInLangfuse();
 */
export async function createCategoriesPromptInLangfuse(options = {}) {
  const langfuse = new Langfuse();
  const {
    name = 'all-categories-list',
    type = 'text',
    labels = ['production'],
    config = { model: 'gpt-4o', temperature: 0.7, supported_languages: ['en'] },
  } = options;

  // Fetch all categories, coingeckoCategories, and volume from the Coin table
  let coins = await sql`SELECT "categories", "coingeckoCategories", "volume" FROM "Coin"`;
  // Map: category name -> total volume
  const categoryVolumeMap = new Map();

  for (const coin of coins) {
    coin.categories ||= [];
    coin.coingeckoCategories ||= [];
    const allCategories = [...coin.categories, ...coin.coingeckoCategories];
    for (const category of allCategories) {
      if (!category) continue;
      const prev = categoryVolumeMap.get(category) || 0;
      categoryVolumeMap.set(category, prev + Number(coin.volume || 0));
    }
  }

  // Only include categories with total volume >= 500000
  let filteredCategories = Array.from(categoryVolumeMap.entries())
    .filter(([_, volume]) => volume >= 500000)
    .map(([category]) => category)
    .sort((a, b) => a.localeCompare(b));

  // Build the prompt string
  const prompt = filteredCategories.map(cat => `- "${cat}"`).join('\n');

  // Create the prompt in Langfuse
  const createdPrompt = await langfuse.createPrompt({
    name,
    type,
    prompt,
    labels,
    config,
  });
  return createdPrompt;
}