import dotenv from 'dotenv';
import pick from 'lodash/pick.js'
import minBy from 'lodash/minBy.js';
import levenshtein from 'js-levenshtein';

import sql from '../lib/database.mjs'
import coinGecko, { getExchange } from '../lib/coinGecko.mjs';
import { getCoin, getCoins } from '../lib/coinpaprika.mjs'
import { excludedExchanges } from 'coinrotator-utils/variables.mjs';

dotenv.config();

const fetchExchanges = async () => {
  const exchangesData = (await coinGecko.get('/exchanges/list')).data

  for (const exchange of exchangesData) {
    if (excludedExchanges.includes(exchange.id)) {
      continue;
    }
    let exchangeDetailData
    try {
      exchangeDetailData = (await getExchange(exchange.id)).data
    } catch(e) {
      // CoinGecko sometimes has no exchange details for some exchanges
      if (e.response?.status === 404) {
        console.dir(e.response?.headers, { depth: null });
        console.dir(e.response?.data, { depth: null });
        continue;
      } else {
        throw(e);
      }
    }

    let dbExchangeData = pick(exchangeDetailData, ['name', 'image', 'url', 'centralized'])
    dbExchangeData.centralized = Boolean(dbExchangeData.centralized)

    await sql`
      INSERT INTO exchange (id, ${sql(Object.keys(dbExchangeData))})
      VALUES (${exchange.id}, ${sql(Object.values(dbExchangeData))})
      ON CONFLICT (id) DO UPDATE SET ${sql(Object.entries(dbExchangeData).map(([key, value]) => `${key} = ${value}`))}
    `;
  }
}

const fetchCoinpaprikaData = async () => {
  const getMatchingDbCoin = async (symbol, name) => {
    const matchingCoins = await sql`SELECT * FROM "Coin" WHERE "symbol" = ${symbol.toLowerCase()}`
    let matchingCoin = null
    if (matchingCoins.length === 1) {
      matchingCoin = matchingCoins[0]
    } else if (matchingCoins.length > 1) {
      const closestCoin = minBy(matchingCoins, (coin) => levenshtein(coin.name, name));
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
      await sql`
        UPDATE "Coin" SET
          coinpaprikaId = ${coinPaprikaCoinData.id},
          coinpaprikaName = ${coinPaprikaCoinData.name},
          coinpaprikaRank = ${coinPaprikaCoinData.rank},
          coinpaprikaActive = ${coinPaprikaCoinData.is_active},
          coinpaprikaTags = ${coinPaprikaCoinData.tags || undefined},
          coinpaprikaTeam = ${coinPaprikaCoinData.team},
          coinpaprikaDescription = ${coinPaprikaCoinData.description},
          coinpaprikaMessage = ${coinPaprikaCoinData.message},
          coinpaprikaOpenSource = ${coinPaprikaCoinData.open_source},
          coinpaprikaHardwarewallet = ${coinPaprikaCoinData.hardware_wallet},
          coinpaprikaLaunchDateStart = ${coinPaprikaCoinData.started_at},
          coinpaprikaDevelopmentStatus = ${coinPaprikaCoinData.development_status},
          coinpaprikaProofType = ${coinPaprikaCoinData.proof_type},
          coinpaprikaOrgStructure = ${coinPaprikaCoinData.org_structure},
          coinpaprikaHashAlgorithm = ${coinPaprikaCoinData.hash_algorithm},
          coinpaprikaContracts = ${coinPaprikaCoinData.contracts},
          coinpaprikaLinks = ${coinPaprikaCoinData.links},
          coinpaprikaLinksExtended = ${coinPaprikaCoinData.links_extended},
          coinpaprikaWhitepaper = ${coinPaprikaCoinData.whitepaper}
        WHERE id = ${matchingCoin.id}
      `
    }
  }
}

setTimeout(async () => {
  await fetchExchanges()
  // await fetchCoinpaprikaData()
}, 99);