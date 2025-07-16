import { Telegraf } from 'telegraf'

const chatId = -1001781627575
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

export const postMessage = (message) => {
  bot.telegram.sendMessage(chatId, message)
}

export const sendDocument = (fileName, fileStream) => {
  return bot.telegram.sendDocument(chatId, {
    source: fileStream,
    filename: fileName
  })
}