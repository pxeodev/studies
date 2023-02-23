import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'

import getProxyConfig from '../utils/getProxyConfig.mjs'

const coinGecko = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 30000
})
coinGecko.defaults.raxConfig = {
  instance: coinGecko,
  onRetryAttempt: (err) => console.log(err),
  retryDelay: 1000 * 60, // CoinGecko gives us 429 for a minute
  backoffType: 'static',
  retry: 5,
  noResponseRetries: 5,
}
coinGecko.interceptors.request.use(AxiosLogger.requestLogger);
rax.attach(coinGecko)

export const getCoin = async (coinId) => {
  return coinGecko.get(`/coins/${coinId}`, getProxyConfig())
}

export const getOhlc = async (coinId, quoteSymbol, fetchOhlcDays) => {
  return coinGecko.get(`/coins/${coinId}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`, getProxyConfig())
}

export const getExchange = async (exchangeId) => {
  return coinGecko.get(`/exchanges/${exchangeId}`, getProxyConfig())
}

export default coinGecko