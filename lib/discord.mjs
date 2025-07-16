import axios from 'axios'

const spamChannelId = '940962406207741972'

const discord = axios.create({
  baseURL: 'https://discord.com/api',
  timeout: 30000,
  headers: {
    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'User-Agent': `DiscordBot (https://axios-http.com/, ${axios.VERSION})`
  }
})

export const channelCreateMessage = (message) => {
  return discord.post(`/channels/${spamChannelId}/messages`, {
    content: message
  })
}

export default discord