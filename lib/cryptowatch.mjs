import axios from 'axios'
import axiosRetry, { exponentialDelay } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const cryptowatch = axios.create({
  baseURL: 'https://api.cryptowat.ch',
  timeout: 30000,
  headers: { 'X-CW-API-Key': process.env.CRYPTOWATCH_API_KEY }
})
axiosRetry(cryptowatch, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
cryptowatch.interceptors.request.use(AxiosLogger.requestLogger);

export default cryptowatch