import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import pick from 'lodash/pick'

import prisma from '../lib/prisma'

dotenv.config();

const script = async () => {
  const coinGeckoAPI = axios.create({
    baseURL: 'https://api.coingecko.com/api/v3',
    timeout: 60000
  })
  coinGeckoAPI.defaults.raxConfig = {
    instance: coinGeckoAPI,
    onRetryAttempt: (err) => console.log(err),
    retry: 7
  }
  coinGeckoAPI.interceptors.request.use(AxiosLogger.requestLogger);
  rax.attach(coinGeckoAPI)

  const exchangesData = (await coinGeckoAPI.get('/exchanges/list')).data

  for (const exchange of exchangesData) {
    await new Promise((res) => setTimeout(res, 6000))
    let exchangeData = (await coinGeckoAPI.get(`/exchanges/${exchange.id}`)).data
    exchangeData = pick(exchangeData, ['name', 'image', 'url'])

    await prisma.exchange.upsert({
      where: { id: exchange.id },
      create: {
        id: exchange.id,
        ...exchangeData
      },
      update: exchangeData,
    })
  }
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});
const transaction = Sentry.startTransaction({
  op: "Fetchexchanges",
  name: `Fetchexchanges ${new Date()}`,
});

setTimeout(() => {
  try {
    script();
  } catch (e) {
    Sentry.captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);