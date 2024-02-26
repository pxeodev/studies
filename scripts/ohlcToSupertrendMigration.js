import dotenv from 'dotenv';

import prisma from '../lib/prisma.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { saveDailyOhlcsToSupertrends } from '../utils/ohlc.mjs';

dotenv.config();

const ohlcToSupertrendMigration = async () => {
  let allCoinIds = await prisma.coin.findMany({
    select: {
      id: true,
    }
  })
  allCoinIds = allCoinIds.map(coin => coin.id)
  for (const coinId of allCoinIds) {
    // if (coinId.localeCompare('zcoin') < 0) {
    //   continue;
    // }
    // if (coinId !== 'ethereum') {
    //   continue;
    // }
    let ohlcs = await prisma.ohlc.findMany({
      select: {
        closeTime: true,
        open: true,
        high: true,
        low: true,
        close: true,
        quoteSymbol: true
      },
      where: {
        coinId,
      },
      orderBy: { closeTime: 'asc' },
    })
    ohlcs = convertToDailySignals(ohlcs, true)
    saveDailyOhlcsToSupertrends(ohlcs, coinId)
  }
}

ohlcToSupertrendMigration();