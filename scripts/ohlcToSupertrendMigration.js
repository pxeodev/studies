import dotenv from 'dotenv';

import sql from '../lib/database.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { saveDailyOhlcsToSupertrends } from '../utils/ohlc.mjs';

dotenv.config();

const ohlcToSupertrendMigration = async () => {
  let allCoinIds = await sql`SELECT id FROM "Coin" ORDER BY id ASC`
  allCoinIds = allCoinIds.map(coin => coin.id)
  for (const coinId of allCoinIds) {
    // if (coinId.localeCompare('zcoin') < 0) {
    //   continue;
    // }
    // if (coinId !== 'ethereum') {
    //   continue;
    // }
    let ohlcs = await sql`SELECT "closeTime", "open", "high", "low", "close", "quoteSymbol" FROM "Ohlc" WHERE "coinId" = ${coinId} ORDER BY "closeTime" ASC`
    ohlcs = convertToDailySignals(ohlcs, true)
    saveDailyOhlcsToSupertrends(ohlcs, coinId)
  }
}

ohlcToSupertrendMigration();