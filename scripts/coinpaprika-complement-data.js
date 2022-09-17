import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import levenshtein from 'js-levenshtein';
import minBy from 'lodash/minBy';

import { getCoin, getCoins } from '../lib/coinpaprika'
import prisma from '../lib/prisma'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

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

const coinpaprikaMatchSymbols = async () => {
  const transaction = Sentry.startTransaction({
    op: "CoinPaprika match symbols",
    name: "CoinPaprika match symbols Transaction",
  });
  try {
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
  } catch (error) {
    console.log(error)
    Sentry.captureException(error);
    throw(error)
  } finally {
    transaction.finish();
  }
}

coinpaprikaMatchSymbols()