import dotenv from 'dotenv';
import endOfYesterday from 'date-fns/endOfYesterday';
import subDays from 'date-fns/subDays'
import format from 'date-fns/format'
import startOfDay from 'date-fns/startOfDay'
import mapValues from 'lodash/mapValues'
import { promises as fs } from 'fs';

import prisma from '../lib/prisma'
import supertrend from '../utils/supertrend'
import convertToDailySignals from '../utils/convertToDailySignals';
import { defaultAtrPeriods, defaultMultiplier } from '../utils/variables'
import supersupertrend from '../utils/supersupertrend';
import { signals } from '../utils/variables';

dotenv.config();

const compileTrendHistory = async () => {
  const coinsData = await prisma.coin.findMany({
    select: {
      id: true,
      symbol: true,
      name: true,
    }
  })
  const trendDays = [];
  for (const coinData of coinsData) {
    console.log(`Fetching ${coinData.name} (${coinData.symbol.toUpperCase()}) data`)
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
        coinId: coinData.id,
        closeTime: {
          lte: endOfYesterday(),
        }
      },
      orderBy: { closeTime: 'asc' }
    })
    ohlcs = convertToDailySignals(ohlcs)
    const trends = mapValues(ohlcs, (ohlcs) => {
      return supertrend(ohlcs, {
        atrPeriods: defaultAtrPeriods,
        multiplier: defaultMultiplier
      })
    })
    const dailySuperSuperTrends = []
    let reverseUsdTrends = trends.usd?.reverse() || [];
    let reverseEthTrends = trends.eth?.reverse() || [];
    let reverseBtcTrends = trends.btc?.reverse() || [];

    for (let i = 0, date = startOfDay(new Date()); reverseBtcTrends[i] !== '' && reverseEthTrends[i] !== '' && reverseUsdTrends[i] !== ''; i++, date = startOfDay(subDays(date, 1))) {
      const superSupertrend = supersupertrend({
        eth: reverseEthTrends[i] || 0,
        btc: reverseBtcTrends[i] || 0,
        usd: reverseUsdTrends[i] || 0
      })
      dailySuperSuperTrends.push({
        date,
        superSupertrend
      })
      const dayAlreadyStored = trendDays.find((existingDay) => existingDay.getTime() === date.getTime())
      if (!dayAlreadyStored) {
        trendDays.push(date);
      }
    }

    coinData.dailySuperSuperTrends = dailySuperSuperTrends;
  }
  const trendReportFile = await fs.open('./supertrends.csv', 'a+');
  for (let date of trendDays) {
    const upCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === date.getTime() &&
               dailyTrend.superSupertrend === signals.buy
      })
    })
    const hodlCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === date.getTime() &&
               dailyTrend.superSupertrend === signals.hodl
      })
    })
    const downCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === date.getTime() &&
               dailyTrend.superSupertrend === signals.sell
      })
    })

    const data = [
      format(date, 'yyyy-MM-dd'),
      upCoins.length,
      hodlCoins.length,
      downCoins.length,
    ]
    trendReportFile.writeFile(`${data.join(',')}\n`)
  }
}

compileTrendHistory();