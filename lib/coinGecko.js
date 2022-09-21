import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'

const agentConfig = {
  proxy: "http://user-sp31527169:3BFfXQrusvyAVfuu3z3h@eu.dc.smartproxy.com:20000",
  keepAlive: true
};
const coinGecko = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 30000,
  httpAgent: new HttpProxyAgent(agentConfig),
  httpsAgent: new HttpsProxyAgent(agentConfig),
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
  return coinGecko.get(`/coins/${coinId}`)
}

export const getOhlc = async (coinId, quoteSymbol, fetchOhlcDays) => {
  return coinGecko.get(`/coins/${coinId}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`)
}

export default coinGecko