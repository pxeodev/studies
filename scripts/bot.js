import endOfYesterday from 'date-fns/endOfYesterday';
import isSameDay from 'date-fns/isSameDay';
import subDays from 'date-fns/subDays';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import prisma from '../lib/prisma'
import { tweet } from '../lib/twitter'
import { channelCreateMessage } from '../lib/discord'
import convertToDailySignals from '../utils/convertToDailySignals';
import getTrends from '../utils/getTrends';
import { defaultAtrPeriods, defaultMultiplier } from '../utils/variables'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const bot = async () => {
  const transaction = Sentry.startTransaction({
    op: "Bot",
    name: "Bot Transaction",
  });
  try {
    const yesterday = endOfYesterday();
    const thirtyDaysAgo = subDays(new Date(), 30)

    let coinsData = await prisma.coin.findMany({
      orderBy: { marketCapRank: 'asc' },
      take: 1000,
      select: {
        id: true,
        symbol: true,
        name: true,
        marketCap: true,
        twitter: true,
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
              gte: thirtyDaysAgo,
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
      const symbol = coinData.symbol.toUpperCase()
      const tweetPost = `${coinData.name} (${symbol}) changed from ${coinData.yesterdaySuperSuperTrend} to ${coinData.superSuperTrend} today! Find out more at coinrotator.app/coin/${coinData.id} #CoinRotator $${symbol} @${coinData.twitter}`
      const channelPost = `${coinData.name} (${symbol}) changed from ${coinData.yesterdaySuperSuperTrend} to ${coinData.superSuperTrend} today! Find out more at https://coinrotator.app/coin/${coinData.id}`
      tweet(tweetPost)
      channelCreateMessage(channelPost)
    })
  } catch (error) {
    console.log(error)
    Sentry.captureException(error);
    throw(error)
  } finally {
    transaction.finish();
  }
}

bot()