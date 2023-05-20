import axios from 'axios'
import axiosRetry, { exponentialDelay } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

import getProxyConfig from '../utils/getProxyConfig.mjs'

const coinPaprika = axios.create({
  baseURL: 'https://api.coinpaprika.com/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'Accept-Encoding': 'deflate, gzip'
  }
})
axiosRetry(coinPaprika, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
coinPaprika.interceptors.request.use(AxiosLogger.requestLogger);

export const getCoins = () => {
  return coinPaprika.get('coins', getProxyConfig())
}

export const getCoin = (coinId) => {
  return coinPaprika.get(`coins/${coinId}`, getProxyConfig())
}