import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'

const coinPaprika = axios.create({
  baseURL: 'https://api.coinpaprika.com/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'Accept-Encoding': 'deflate, gzip'
  }
})
coinPaprika.defaults.raxConfig = {
  instance: coinPaprika,
  onRetryAttempt: (err) => console.log(err),
}
coinPaprika.interceptors.request.use(AxiosLogger.requestLogger);
rax.attach(coinPaprika)

export const getCoins = () => {
  return coinPaprika.get('coins')
}

export const getCoin = (coinId) => {
  return coinPaprika.get(`coins/${coinId}`)
}