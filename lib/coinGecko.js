import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'

import { proxyList } from '../utils/variables'

let agentList
let agentListIndex = 0
const getProxyConfig = async () => {
  agentList ||= proxyList.map((proxy) => {
    const agentConfig = {
      proxy,
      keepAlive: true
    };

    return {
      httpAgent: new HttpProxyAgent(agentConfig),
      httpsAgent: new HttpsProxyAgent(agentConfig),
    }
  })

  return agentList[agentListIndex++ % agentList.length]
}
const coinGecko = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 30000
})
coinGecko.defaults.raxConfig = {
  instance: coinGecko,
  onRetryAttempt: (err) => console.log(err),
  retryDelay: 1000 * 60, // CoinGecko gives us 429 for a minute
  backoffType: 'static'
}
coinGecko.interceptors.request.use(AxiosLogger.requestLogger);
rax.attach(coinGecko)

export const getCoin = async (coinId) => {
  const proxyConfig = await getProxyConfig()
  return coinGecko.get(`/coins/${coinId}`, {...proxyConfig})
}

export const getOhlc = async (coinId, quoteSymbol, fetchOhlcDays) => {
  const proxyConfig = await getProxyConfig()
  return coinGecko.get(`/coins/${coinId}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`, {...proxyConfig})
}

export default coinGecko