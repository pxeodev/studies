import dotenv from 'dotenv';
import { init, startTransaction, captureException } from '@sentry/node';
import * as Tracing from '@sentry/tracing'
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
init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

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
    console.log(`Fetching ${coinData.symbol} data`)
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
      return supertrend(ohlcs, { atrPeriods: defaultAtrPeriods, multiplier: defaultMultiplier })
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
      if (!trendDays.find((existingDay) => existingDay.getTime() === date.getTime())) {
        trendDays.push(date);
      }
    }

    coinData.dailySuperSuperTrends = dailySuperSuperTrends;
  }
  const superTrendsByDay = trendDays.map((day) => {
    const upCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === day.getTime() && dailyTrend.superSupertrend === signals.buy
      })
    })
    const hodlCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === day.getTime() && dailyTrend.superSupertrend === signals.hodl
      })
    })
    const downCoins = coinsData.filter((coin) => {
      return coin.dailySuperSuperTrends.find((dailyTrend) => {
        return dailyTrend.date.getTime() === day.getTime() && dailyTrend.superSupertrend === signals.sell
      })
    })
    return {
      day,
      [signals.buy]: upCoins.map(coin => coin.symbol),
      [signals.hodl]: hodlCoins.map(coin => coin.symbol),
      [signals.sell]: downCoins.map(coin => coin.symbol),
    }
  })
  const file = await fs.open('./supertrends.csv', 'a+');
  superTrendsByDay.forEach((day) => {
    const data = [
      format(day.day, 'yyyy-MM-dd'),
      day[signals.buy].length,
      day[signals.hodl].length,
      day[signals.sell].length
    ]
    file.writeFile(`${data.join(',')}\n`)
  })
}

setTimeout(async () => {
  const transaction = startTransaction({
    op: "compileTrendHistory",
    name: "compileTrendHistory",
  });
  try {
    await compileTrendHistory()
  } catch (e) {
    captureException(e);
    console.log(e)
  } finally {
    transaction.finish();
  }
}, 99);