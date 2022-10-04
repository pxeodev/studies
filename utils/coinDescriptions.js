import csv from 'csvtojson'

let data;

export async function getDescriptionByCoin(coin) {
  data ||= await csv().fromFile('lib/CoinDescription.csv');
  const description = data.find(description => description.Symbol.toLowerCase() === coin.symbol)
  return description ? description.Description : coin.description;
}