import csv from 'csvtojson'

const parseDiscrepancies = async () => {
  const discrepancies = await csv().fromFile('lib/DropsTab_Coingecko_Discrepancies.csv');
  return discrepancies
}

const isDropstabDiscrepancy = async(symbol) => {
  const discrepancies = await parseDiscrepancies();
  const match = discrepancies.find(discrepancy => discrepancy["Dropstab symbol"] === symbol);

  return match && match["Coingecko symbol"];
}

export default isDropstabDiscrepancy;