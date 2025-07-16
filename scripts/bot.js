import format from 'date-fns/format/index.js'
import isMonday from 'date-fns/isMonday/index.js'
import groupBy from 'lodash/groupBy.js';
import { Readable } from 'stream';

import { channelCreateMessage } from '../lib/discord.mjs'
import { postMessage, sendDocument } from '../lib/telegram.mjs'
import getFreshSignals from '../utils/getFreshSignals.mjs';

const bot = async () => {
  const [dailyFreshSignals, weeklyFreshSignals] = await getFreshSignals();
  const today = new Date();
  const trimmedDailyFreshSignals = dailyFreshSignals.slice(0, 20)
  for (const coin of trimmedDailyFreshSignals) {
    const symbol = coin.symbol.toUpperCase()
    const channelPost = `${coin.name} (${symbol}) changed from ${coin.yesterdaySuperSuperTrend} to ${coin.todaySuperSuperTrend} today! Find out more at https://coinrotator.app/coin/${coin.id}`
    console.log(channelPost)
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
  const dailyGroupedTrends = groupBy(dailyFreshSignals, 'todaySuperSuperTrend')
  for (const [todaySuperSuperTrend, dailyTrendData] of Object.entries(dailyGroupedTrends)) {
    const fileName = `${format(today, 'MM-dd-yyyy')} ${todaySuperSuperTrend} Trends.txt`
    const documentText = dailyTrendData
      .map(coin => `${coin.symbol.toUpperCase()}USDT`)
      .join(`\n`)
    console.log(documentText)
    sendDocument(fileName, Readable.from(documentText))
    await new Promise((res) => setTimeout(res, 1000))
  }
  if (isMonday(today)) {
    const weekGroupedTrends = groupBy(weeklyFreshSignals, 'weekSuperSuperTrend')
    for (const [weekSuperSuperTrend, weekTrendData] of Object.entries(weekGroupedTrends)) {
      const fileName = `Weekly ${weekSuperSuperTrend} Trends.txt`
      const documentText = weekTrendData
        .map(coin => `${coin.symbol.toUpperCase()}USDT`)
        .join(`\n`)
      console.log('weekly signals', documentText)
      sendDocument(fileName, Readable.from(documentText))
      await new Promise((res) => setTimeout(res, 1000))
    }
  }
}

bot()