import path from 'path'
import csv from 'csvtojson'

const parseDiscrepancies = async () => {
  const filePath = path.join(__dirname, '../lib/Dropstab_Coingecko_Discrepancies.csv');
  const discrepancies = await csv().fromFile(filePath);
  return discrepancies
}

const isDropstabDiscrepancy = async(symbol) => {
  const discrepancies = await parseDiscrepancies();
  const match = discrepancies.find(discrepancy => discrepancy["Dropstab symbol"] === symbol);

  return match && match["Coingecko symbol"];
}

export default isDropstabDiscrepancy;