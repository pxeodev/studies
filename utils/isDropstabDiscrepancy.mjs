import path from 'path'
import csv from 'csvtojson'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const parseDiscrepancies = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = path.join(__dirname, '../lib/Dropstab_Coingecko_Discrepancies.csv');
  const discrepancies = await csv().fromFile(filePath);
  return discrepancies
}

const isDropstabDiscrepancy = async(id) => {
  const discrepancies = await parseDiscrepancies();
  const match = discrepancies.find(discrepancy => discrepancy["Coingecko id"] === id);

  return match && match["Dropstab id"];
}

export default isDropstabDiscrepancy;