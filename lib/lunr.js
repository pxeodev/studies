import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'

const lunr = axios.create({
  baseURL: 'https://lunarcrush.com/api3/',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${process.env.LUNR_API_TOKEN}`,
  }
})
lunr.defaults.raxConfig = {
  instance: lunr,
  onRetryAttempt: (err) => console.log(err),
}
lunr.interceptors.request.use(AxiosLogger.requestLogger);
rax.attach(lunr)

export const getAllCoins = () => {
  return lunr.get('coins')
}

export default lunr