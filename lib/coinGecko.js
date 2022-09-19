import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'

const agentConfig = {
  proxy: "http://coinrotator:WBA!phj1pgz-vev5mjv@de.proxymesh.com:31280",
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

export default coinGecko