import { init, startTransaction, captureException } from '@sentry/node';
import * as Tracing from '@sentry/tracing'
import format from 'date-fns/format'
import groupBy from 'lodash/groupBy';
import { Readable } from 'stream';

import { tweet } from '../lib/twitter'
import { channelCreateMessage } from '../lib/discord'
import { postMessage, sendDocument } from '../lib/telegram'
import getFreshSignals from '../utils/getFreshSignals';

init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const bot = async () => {
  const transaction = startTransaction({
    op: "Bot",
    name: "Bot Transaction",
  });
  try {
    const coinsData = await getFreshSignals();
    const trimmedCoinsData = coinsData.slice(0, 20)
    for (const coin of trimmedCoinsData) {
      const symbol = coin.symbol.toUpperCase()
      const tweetPost = `${coin.name} (${symbol}) changed from ${coin.yesterdaySuperSuperTrend} to ${coin.superSuperTrend} today! Find out more at coinrotator.app/coin/${coin.id} #CoinRotator $${symbol} @${coin.twitter}`
      const channelPost = `${coin.name} (${symbol}) changed from ${coin.yesterdaySuperSuperTrend} to ${coin.superSuperTrend} today! Find out more at https://coinrotator.app/coin/${coin.id}`
      console.log(tweetPost, channelPost)
      try {
        await tweet(tweetPost)
      } catch {
        console.log('Tweet failed')
      }
      try {
        await channelCreateMessage(channelPost)
      } catch (e) {
        console.log('Discord failed')
        console.log(e.response.status);
        console.log(e.response.headers);
        console.log(e.response.data);
      }
      try {
        await postMessage(channelPost)
      } catch {
        console.log('Telegram failed')
      }
      await new Promise((res) => setTimeout(res, 1000))
    }
    await new Promise((res) => setTimeout(res, 50000))
    const groupedTrends = groupBy(coinsData, 'superSuperTrend')
    for (const [superSuperTrend, trendData] of Object.entries(groupedTrends)) {
      const fileName = `${format(new Date(), 'MM-dd-yyyy')} ${superSuperTrend} Trends.txt`
      const documentText = trendData
        .map(coin => `${coin.symbol.toUpperCase()}USDT`)
        .join(`\n`)
      sendDocument(fileName, Readable.from(documentText))
      await new Promise((res) => setTimeout(res, 1000))
    }
  } catch (error) {
    console.log(error)
    captureException(error);
    throw(error)
  } finally {
    transaction.finish();
  }
}

bot()