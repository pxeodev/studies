import csv from 'csvtojson'

export default async function getCategories() {
  let categories = await csv().fromFile('lib/DropsTabCategories.csv');
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