import csv from 'csvtojson'
import uniq from 'lodash/uniq'

const parseCategories = async () => {
  const categories = await csv().fromFile('lib/DropsTabCategories.csv');
  return categories
}

export async function getCategoriesByCoin() {
  const categories = await parseCategories();
  const mappedCategories = {}
  categories.forEach((category) => {
    const symbol = category.Asset_Symbol.toLowerCase()
    const coinName = category.Asset_Name
    const assetKey = `${symbol}-${coinName}`
    mappedCategories[assetKey] ||= []
    mappedCategories[assetKey].push(category.Asset_Category)
  })
  return mappedCategories;
}

export async function getCategories() {
  let categories = await parseCategories();
  categories = categories.map(category => category.Asset_Category)
  categories = uniq(categories)
  categories = categories.sort((a, b) => a.localeCompare(b))

  return categories;
}