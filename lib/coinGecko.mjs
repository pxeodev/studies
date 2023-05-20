import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

import getProxyConfig from '../utils/getProxyConfig.mjs'

const coinGecko = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 30000
})
axiosRetry(coinGecko, {
  retries: 5,
  retryDelay: (_count) => { return 1000 * 60; }, // CoinGecko gives us 429 for a minute
  onRetry: (_count, err) => console.log(`Retry #${_count}`, err),
  shouldResetTimeout: true,
  retryCondition: (e) => {
    return (
      isNetworkOrIdempotentRequestError(e) ||
      e?.code === 'ECONNABORTED' ||
      e?.code === 'ECONNRESET' ||
      e.response?.status === 429
    );
  }
});
coinGecko.interceptors.request.use(AxiosLogger.requestLogger);

export const getMarket = async (page) => {
  return coinGecko.get(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`, getProxyConfig())
}

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