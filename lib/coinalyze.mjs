import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'
import subDays from 'date-fns/subDays/index.js';

const API_KEYS = [
  '8e46528a-2b35-4b0c-b89b-b73e536a2894',
  'e3b3b41f-d2be-4b3e-8281-1f42d9687840'
]
let apiKeyIndex = 0
const apiKey = () => {
  return {
    headers: {
      'api_key': API_KEYS[apiKeyIndex++ % API_KEYS.length]
    }
  }
}

const coinalyze = axios.create({
  baseURL: 'https://api.coinalyze.net/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  }
})

axiosRetry(coinalyze, {
  retries: 5,
  retryDelay: (_count, error) => {
    const retryAfterSeconds = error?.response?.headers?.['retry-after'] || 60
    return 1000 * retryAfterSeconds;
  },
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryCondition: (e) => {
    return (
      isNetworkOrIdempotentRequestError(e) ||
      e?.code === 'ECONNABORTED' ||
      e?.code === 'ECONNRESET' ||
      e.response?.status === 429
    );
  }
})
coinalyze.interceptors.request.use(AxiosLogger.requestLogger);

export const getSupportedExchanges = () => {
  return coinalyze.get(`exchanges`, apiKey())
}

export const getSupportedFutureMarkets = () => {
  return coinalyze.get(`future-markets`, apiKey())
}

export const getOpenInterest = (symbol) => {
  return coinalyze.get(`open-interest?symbols=${symbol}`, apiKey())
}

export const getFundingRate = (symbol) => {
  return coinalyze.get(`funding-rate?symbols=${symbol}`, apiKey())
}

export const getVolume24h = async (symbol) => {
  let yesterday = subDays(new Date(), 1)
  yesterday = parseInt(+yesterday / 1000)
  const today = parseInt(+new Date() / 1000)
  const data = await coinalyze.get(`ohlcv-history?symbols=${symbol}&interval=daily&from=${yesterday}&to=${today}`, apiKey())
  return data.data[0]?.history?.[0]?.v
}