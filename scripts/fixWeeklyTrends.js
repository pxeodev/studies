import dotenv from 'dotenv';

import prisma from '../lib/prisma.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { convertOhlcsToSuperTrends } from '../utils/supersupertrend.mjs';
import { SUPERTREND_FLAVOR } from '../utils/variables.mjs';

dotenv.config();

const fixWeeklyTrends = async () => {
  let allCoinIds = await prisma.coin.findMany({
    select: {
      id: true,
    }
  })
  allCoinIds = allCoinIds.map(coin => coin.id)
  for (const coinId of allCoinIds) {
    console.log(coinId)
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
        closeTime: {
          gte: '2023-01-01T00:00:00.000Z'
        }
      },
      orderBy: { closeTime: 'asc' },
    })
    ohlcs = convertToDailySignals(ohlcs, true)
    for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
      const crTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, true)
      await prisma.superTrend.createMany({ data: crTrends, skipDuplicates: true })
      const classicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, true)
      await prisma.superTrend.createMany({ data: classicTrends, skipDuplicates: true })
    }
  }
}

fixWeeklyTrends();