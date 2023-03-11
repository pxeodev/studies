import dotenv from 'dotenv';

import prisma from '../lib/prisma.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { defaultAtrPeriods, defaultMultiplier, classicAtrPeriods, classicMultiplier, SUPERTREND_FLAVOR } from '../utils/variables.mjs';
import supertrend from '../utils/supertrend.mjs';
import convertToWeeklySignals from '../utils/convertToWeeklySignals.mjs';

dotenv.config();

const convertOhlcsToSuperTrends = (ohlcs, coinId, quoteSymbol, flavor, weekly = false) => {
  if (weekly)  {
    ohlcs = convertToWeeklySignals(ohlcs, true)
  }
  const ohlcsWithoutCloseDate = ohlcs.map(ohlc => ohlc.slice(0, 4))
  const atrPeriods = flavor === SUPERTREND_FLAVOR.coinrotator ? defaultAtrPeriods : classicAtrPeriods
  const multiplier = flavor === SUPERTREND_FLAVOR.coinrotator ? defaultMultiplier : classicMultiplier
  let trends = supertrend(ohlcsWithoutCloseDate, { atrPeriods, multiplier })
  return trends.map((trend, i) => {
    const matchingOhlcs = ohlcs[i]
    return {
      coinId,
      quoteSymbol,
      trend,
      flavor,
      date: matchingOhlcs[4],
      weekly,
    }
  }).filter(t => t.trend !== '')
}

const ohlcToSupertrendMigration = async () => {
  let allCoinIds = await prisma.coin.findMany({
    select: {
      id: true,
    }
  })
  allCoinIds = allCoinIds.map(coin => coin.id)
  for (const coinId of allCoinIds) {
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
    for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
      console.log(coinId, quoteSymbol)
      const crTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator)
      await prisma.superTrend.createMany({ data: crTrends, skipDuplicates: true })
      const classicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic)
      await prisma.superTrend.createMany({ data: classicTrends, skipDuplicates: true })
      const weeklyCrTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, true)
      await prisma.superTrend.createMany({ data: weeklyCrTrends, skipDuplicates: true })
      const weeklyClassicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, true)
      await prisma.superTrend.createMany({ data: weeklyClassicTrends, skipDuplicates: true })
    }
  }
}

ohlcToSupertrendMigration();