import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const API_KEYS = [
  '8e46528a-2b35-4b0c-b89b-b73e536a2894'
]

const coinalyze = axios.create({
  baseURL: 'https://api.coinalyze.net/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'api_key': API_KEYS[0]
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

export const getSupportedFutureMarkets = () => {
  return coinalyze.get(`future-markets`)
}

export const getOpenInterest = (symbol) => {
  return coinalyze.get(`open-interest?symbols=${symbol}&convert_to_usd=true`)
}

export const getFundingRate = (symbol) => {
  return coinalyze.get(`funding-rate?symbols=${symbol}`)
}