import flow from 'lodash/fp/flow.js'
import uniq from 'lodash/fp/uniq.js'
import flatMap from 'lodash/fp/flatMap.js'
import slugify from 'slugify'
import { gql } from '@urql/core'
import { Langfuse } from 'langfuse'

import sql from '../lib/database.mjs'
import strapi from 'coinrotator-utils/strapi.mjs'
import { getCategoriesFromCoinTable, getCategoryStats, filterCategories } from 'coinrotator-utils'

// Re-export the functions from coinrotator-utils for backward compatibility
export { getCategoryOverrides, getCategoryAliases, overrideCoinCategories, aliasCoinCategories } from 'coinrotator-utils'

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

  // Use centralized functions to get category stats
  const categoryStats = await getCategoryStats(sql);
  const filteredCategories = filterCategories(categoryStats, 1000000, 3);

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