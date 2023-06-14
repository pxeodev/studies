import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const coinGecko = axios.create({
  baseURL: 'https://pro-api.coingecko.com/api/v3',
  timeout: 30000,
  headers: {'x-cg-pro-api-key': process.env.CG_API_KEY }
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
  return coinGecko.get(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`)
}

export const getCoin = async (coinId) => {
  return coinGecko.get(`/coins/${coinId}`)
}

export const getOhlc = async (coinId, quoteSymbol, fetchOhlcDays) => {
  return coinGecko.get(`/coins/${coinId}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`)
}

export const getExchange = async (exchangeId) => {
  return coinGecko.get(`/exchanges/${exchangeId}`)
}

export default coinGecko