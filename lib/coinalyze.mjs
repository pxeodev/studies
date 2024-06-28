import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'
import subDays from 'date-fns/subDays/index.js';

const API_KEYS = [
  '8e46528a-2b35-4b0c-b89b-b73e536a2894',
  'e3b3b41f-d2be-4b3e-8281-1f42d9687840',
  'f3bde557-60db-4b4e-8a91-d5cf9fb6abb5',
  '7228310f-b658-4889-970c-c960a474781b',
  'c05e48af-3880-4a17-8954-04af5c0e6906',
  '70a8ac50-7496-4c44-a10c-95c3d068c755',
  '69165bd5-9ba5-4c37-adfa-5cc7c9737f1b',
  'd1184b9e-cb82-4379-b878-f7828717b383',
  '5a75ffa8-e08c-437d-9a8f-af61e7db0f6b',
  '7e305a76-ae63-4358-91c8-7de90987d842',
  '9574ab98-78d7-4f04-877b-88161be9e326',
  '3a99f14b-c034-4484-9af6-75e81eb57e62',
  'e0ff0d45-c281-4e92-a97f-f9a219f5f65c',
  'b290f080-113b-47f1-a3f8-c4f135e8280a',
  '0cee5dd4-451c-4cd5-9b59-4ce4832c5f13',
  '377c30d6-a856-42d1-93a7-c2c6742f73fc',
  '5eb9d821-6443-4e44-aad5-abfe5a900a77',
  '67aa742f-6c75-484b-bce8-1748c1f35256',
  'e6f2f09c-2902-4c87-96e5-b9ae03eff27f',
  '9c0f453b-e1e8-47f1-a215-6c3ae4794602',
]
let apiKeyIndex = 0

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
coinalyze.interceptors.request.use((config) => {
  config.headers.api_key = API_KEYS[apiKeyIndex++ % API_KEYS.length]
  return config
}, null, { synchronous: true })

export const getSupportedExchanges = () => {
  return coinalyze.get(`exchanges`)
}

export const getSupportedFutureMarkets = () => {
  return coinalyze.get(`future-markets`)
}

export const getOpenInterest = async (symbol, market) => {
  const data = await coinalyze.get(`open-interest?symbols=${symbol}`)
  const value = data.data[0]?.value
  return { openInterest: value, symbol, market }
}

export const getFundingRate = async (symbol, market) => {
  const data = await coinalyze.get(`funding-rate?symbols=${symbol}`)
  const value = data.data[0]?.value
  return { fundingRate: value, symbol, market }
}

export const getVolume24h = async (symbol, market) => {
  let yesterday = subDays(new Date(), 1)
  yesterday = parseInt(+yesterday / 1000)
  const today = parseInt(+new Date() / 1000)
  const data = await coinalyze.get(`ohlcv-history?symbols=${symbol}&interval=daily&from=${yesterday}&to=${today}`)
  const value = data.data[0]?.history?.[0]?.v
  return { futuresVolume24h: value, symbol, market }
}
