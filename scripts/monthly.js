import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import pick from 'lodash/pick'
import minBy from 'lodash/minBy';
import levenshtein from 'js-levenshtein';

import prisma from '../lib/prisma'
import coinGecko from '../lib/coinGecko';
import { getCoin, getCoins } from '../lib/coinpaprika'

dotenv.config();
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const fetchExchanges = async () => {
  const exchangesData = (await coinGecko.get('/exchanges/list')).data

  for (const exchange of exchangesData) {
    await new Promise((res) => setTimeout(res, 6000))
    let exchangeData = (await coinGecko.get(`/exchanges/${exchange.id}`)).data
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

const fetchCoinpaprikaData = async () => {
  const getMatchingDbCoin = async (symbol, name) => {
    const matchingCoins = await prisma.coin.findMany({
      where: {
        symbol: symbol.toLowerCase()
      }
    })
    let matchingCoin = null
    if (matchingCoins.length === 1) {
      matchingCoin = matchingCoins[0]
    } else if (matchingCoins.length > 1) {
      const closestCoin = minBy(matchingCoins, (coin) => levenshtein(coin.name, name));

      Sentry.withScope(scope => {
        scope.setLevel('warning');
        scope.setExtra('symbol', symbol);
        Sentry.captureMessage(`Coinpaprika: Detected the right coin via levenshtein distance: ${closestCoin.name} (${symbol})`);
      });
      console.log('Found multiple coins', matchingCoins)
      console.log('Picked', closestCoin, ' for ', symbol, name)
      matchingCoin = closestCoin;
    } else {
      console.log('No matching db coin found for ', symbol, name)
    }

    return matchingCoin
  }

  const coins = (await getCoins()).data
  for (const coinPaprikaCoin of coins) {
    const matchingCoin = await getMatchingDbCoin(coinPaprikaCoin.symbol, coinPaprikaCoin.name)
    if (matchingCoin) {
      const coinPaprikaCoinData = (await getCoin(coinPaprikaCoin.id)).data
      // TODO: Add CP data to the coin schema
      // TODO: Update data here
      await prisma.coin.update({
        where: {
          id: matchingCoin.id
        },
        data: {

        }
      })
    }
  }
}

setTimeout(async () => {
  const transaction = Sentry.startTransaction({
    op: "monthly",
    name: "monthly",
  });
  try {
    await fetchCoinpaprikaData()
    await fetchExchanges()
  } catch (e) {
    Sentry.captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);