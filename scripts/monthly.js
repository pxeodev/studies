import dotenv from 'dotenv';
import { init, withScope, captureMessage, startTransaction, captureException } from '@sentry/node';
import * as Tracing from '@sentry/tracing'
import pick from 'lodash/pick.js'
import minBy from 'lodash/minBy.js';
import levenshtein from 'js-levenshtein';

import prisma from '../lib/prisma.mjs'
import coinGecko, { getExchange } from '../lib/coinGecko.mjs';
import { getCoin, getCoins } from '../lib/coinpaprika.mjs'

dotenv.config();
init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});
const excludedExchanges = ['ftx', 'ftx_us', 'ftx_spot', 'ftx_tr']

const fetchExchanges = async () => {
  const exchangesData = (await coinGecko.get('/exchanges/list')).data

  for (const exchange of exchangesData) {
    if (excludedExchanges.includes(exchange.id)) {
      continue;
    }
    const exchangeDetailData = (await getExchange(exchange.id)).data

    let dbExchangeData = pick(exchangeDetailData, ['name', 'image', 'url', 'centralized'])
    dbExchangeData.centralized = Boolean(dbExchangeData.centralized)

    await prisma.exchange.upsert({
      where: { id: exchange.id },
      create: {
        id: exchange.id,
        ...dbExchangeData
      },
      update: dbExchangeData,
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

      withScope(scope => {
        scope.setLevel('warning');
        scope.setExtra('symbol', symbol);
        captureMessage(`Coinpaprika: Detected the right coin via levenshtein distance: ${closestCoin.name} (${symbol})`);
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
      await prisma.coin.update({
        where: {
          id: matchingCoin.id
        },
        data: {
          coinpaprikaId: coinPaprikaCoinData.id,
          coinpaprikaName: coinPaprikaCoinData.name,
          coinpaprikaRank: coinPaprikaCoinData.rank,
          coinpaprikaActive: coinPaprikaCoinData.is_active,
          coinpaprikaTags: coinPaprikaCoinData.tags || undefined,
          coinpaprikaTeam: coinPaprikaCoinData.team,
          coinpaprikaDescription: coinPaprikaCoinData.description,
          coinpaprikaMessage: coinPaprikaCoinData.message,
          coinpaprikaOpenSource: coinPaprikaCoinData.open_source,
          coinpaprikaHardwarewallet: coinPaprikaCoinData.hardware_wallet,
          coinpaprikaLaunchDateStart: coinPaprikaCoinData.started_at,
          coinpaprikaDevelopmentStatus: coinPaprikaCoinData.development_status,
          coinpaprikaProofType: coinPaprikaCoinData.proof_type,
          coinpaprikaOrgStructure: coinPaprikaCoinData.org_structure,
          coinpaprikaHashAlgorithm: coinPaprikaCoinData.hash_algorithm,
          coinpaprikaContracts: coinPaprikaCoinData.contracts,
          coinpaprikaLinks: coinPaprikaCoinData.links,
          coinpaprikaLinksExtended: coinPaprikaCoinData.links_extended,
          coinpaprikaWhitepaper: coinPaprikaCoinData.whitepaper
        }
      })
    }
  }
}

setTimeout(async () => {
  const transaction = startTransaction({
    op: "monthly",
    name: "monthly",
  });
  try {
    await fetchCoinpaprikaData()
    await fetchExchanges()
  } catch (e) {
    captureException(e);
    console.log(e)
  } finally {
    transaction.finish();
  }
}, 99);