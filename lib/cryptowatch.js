import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'

const cryptowatch = axios.create({
  baseURL: 'https://api.cryptowat.ch',
  timeout: 30000,
  headers: { 'X-CW-API-Key': process.env.CRYPTOWATCH_API_KEY }
})
cryptowatch.defaults.raxConfig = {
  instance: cryptowatch,
  onRetryAttempt: (err) => console.log(err),
}
cryptowatch.interceptors.request.use(AxiosLogger.requestLogger);
rax.attach(cryptowatch)

export default cryptowatch