import dotenv from 'dotenv';
import endOfYesterday from 'date-fns/endOfYesterday/index.js';
import subDays from 'date-fns/subDays/index.js'
import format from 'date-fns/format/index.js'
import startOfDay from 'date-fns/startOfDay/index.js'
import mapValues from 'lodash/mapValues.js'
import { promises as fs } from 'fs';

import sql from '../lib/database.mjs'
import supertrend from '../utils/supertrend.mjs'
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { defaultAtrPeriods, defaultMultiplier } from 'coinrotator-utils/variables.mjs'
import supersupertrend from 'coinrotator-utils/supersupertrend.mjs';
import { signals } from 'coinrotator-utils/variables.mjs';

dotenv.config();

const compileTrendHistory = async () => {
  const coinsData = await sql`SELECT id, symbol, name FROM "Coin"`
  const trendDays = [];
  for (const coinData of coinsData) {
    console.log(`Fetching ${coinData.name} (${coinData.symbol.toUpperCase()}) data`);
    let ohlcs = await sql`SELECT "closeTime", "open", "high", "low", "close", "quoteSymbol" FROM "Ohlc" WHERE "coinId" = ${coinData.id} AND "closeTime" < ${endOfYesterday()} ORDER BY "closeTime" ASC`
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

    for (let i = 0, date = startOfDay(new Date());
         reverseBtcTrends[i] !== '' && reverseEthTrends[i] !== '' && reverseUsdTrends[i] !== '';
         i++, date = startOfDay(subDays(date, 1))
        ) {
      const superSupertrend = supersupertrend([
        reverseEthTrends[i] || 0,
        reverseBtcTrends[i] || 0,
        reverseUsdTrends[i] || 0
      ])
      dailySuperSuperTrends.push({
        date,
        superSupertrend
      })
      const dayStored = trendDays.find(existingDay => existingDay.getTime() === date.getTime())
      if (!dayStored) {
        trendDays.push(date);
      }
    }

    coinData.dailySuperSuperTrends = dailySuperSuperTrends;
  }
  const trendReportFile = await fs.open('./supertrends.csv', 'a+');
  for (let date of trendDays) {
    const currentDateTrends = coinsData.filter((coin) => coin.dailySuperSuperTrends.find((dailyTrend) =>
      dailyTrend.date.getTime() === date.getTime()))

    const upCoins = currentDateTrends.filter((coin) =>
      coin.dailySuperSuperTrends.find((dailyTrend) => dailyTrend.superSupertrend === signals.buy))
    const hodlCoins = currentDateTrends.filter((coin) =>
      coin.dailySuperSuperTrends.find((dailyTrend) => dailyTrend.superSupertrend === signals.hodl))
    const downCoins = currentDateTrends.filter((coin) =>
      coin.dailySuperSuperTrends.find((dailyTrend) => dailyTrend.superSupertrend === signals.sell))

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