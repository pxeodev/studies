import endOfYesterday from 'date-fns/endOfYesterday';
import isSameDay from 'date-fns/isSameDay';

import prisma from '../lib/prisma'
import { tweet } from '../lib/twitter'
import { channelCreateMessage } from '../lib/discord'
import convertToDailySignals from '../utils/convertToDailySignals';
import getTrends from '../utils/getTrends';
import { defaultAtrPeriods, defaultMultiplier } from '../utils/variables'

const bot = async () => {
  const yesterday = endOfYesterday();

  let coinsData = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    take: 1000,
    select: {
      id: true,
      symbol: true,
      name: true,
      marketCap: true,
      ohlcs: {
        select: {
          closeTime: true,
          open: true,
          high: true,
          low: true,
          close: true,
          quoteSymbol: true
        },
        where: {
          closeTime: {
            lte: yesterday,
          }
        },
        orderBy: { closeTime: 'asc' }
      }
    }
  })
  coinsData = coinsData.map((coinData) => {
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    let yesterdaysOhcls = coinData.ohlcs.filter(ohlc => !isSameDay(ohlc.closeTime, yesterday))
    yesterdaysOhcls = convertToDailySignals(yesterdaysOhcls)

    const [_trends, superSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier)
    const [_yesterdayTrends, yesterdaySuperSuperTrend] = getTrends(yesterdaysOhcls, defaultAtrPeriods, defaultMultiplier)

    return {
      ...coinData,
      yesterdaySuperSuperTrend,
      superSuperTrend,
    }
  })
  coinsData = coinsData.filter((coinData) => coinData.superSuperTrend !== coinData.yesterdaySuperSuperTrend);
  coinsData = coinsData.sort((a, b) => Number(b.marketCap - a.marketCap))
  coinsData = coinsData.slice(0, 5)
  coinsData.forEach((coinData) => {
    const statusUpdate = `${coinData.name} ($${coinData.symbol.toUpperCase()}) changed from ${coinData.yesterdaySuperSuperTrend} to ${coinData.superSuperTrend} today! Find out more at https://coinrotator.app/coin/${coinData.id} #CoinRotator`
    tweet(statusUpdate)
    channelCreateMessage(statusUpdate)
  })
}

export default bot