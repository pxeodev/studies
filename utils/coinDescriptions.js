import csv from 'csvtojson'

let data;

export async function getDescriptionByCoin(symbol) {
  data ||= await csv().fromFile('lib/CoinDescription.csv');
  const description = data.find(description => description.Symbol.toLowerCase() === symbol)
  return description ? description.Description : null;
}