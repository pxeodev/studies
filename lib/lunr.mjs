import axios from 'axios'
import axiosRetry, { exponentialDelay } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const lunr = axios.create({
  baseURL: 'https://lunarcrush.com/api3/',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${process.env.LUNR_API_TOKEN}`,
  }
})
axiosRetry(lunr, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
lunr.interceptors.request.use(AxiosLogger.requestLogger);

export const getAllCoins = () => {
  return lunr.get('coins')
}

export default lunr