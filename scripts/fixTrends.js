import dotenv from 'dotenv';
import axios from 'axios';

import prisma from '../lib/prisma.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { convertOhlcsToSuperTrends } from '../utils/ohlc.mjs';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';

dotenv.config();

const fixTrends = async () => {
  await prisma.superTrend.deleteMany()
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
        coinId
      },
      orderBy: { closeTime: 'asc' },
    })
    ohlcs = convertToDailySignals(ohlcs, true)
    for (const [quoteSymbol, quoteOhlcs] of Object.entries(ohlcs)) {
      const weeklyCrTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, true)
      await prisma.superTrend.createMany({ data: weeklyCrTrends, skipDuplicates: true })
      const weeklyClassicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, true)
      await prisma.superTrend.createMany({ data: weeklyClassicTrends, skipDuplicates: true })

      const dailyCrTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.coinrotator, false)
      await prisma.superTrend.createMany({ data: dailyCrTrends, skipDuplicates: true })
      const dailyClassicTrends = convertOhlcsToSuperTrends(quoteOhlcs, coinId, quoteSymbol, SUPERTREND_FLAVOR.classic, false)
      await prisma.superTrend.createMany({ data: dailyClassicTrends, skipDuplicates: true })
    }
  }
  // axios.post('https://coinrotator-realtime-fra.onrender.com/new-trends')
}

fixTrends();