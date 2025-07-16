import axios from 'axios'
import axiosRetry, { exponentialDelay } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const render = axios.create({
  baseURL: 'https://api.render.com/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
  }
})
axiosRetry(render, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
render.interceptors.request.use(AxiosLogger.requestLogger);

export const createJob = ({ serviceId, startCommand }) => {
  return render.post(`services/${serviceId}/jobs`, {
    startCommand
  })
}