import axios from 'axios'
import dotenv from 'dotenv';
import subDays from 'date-fns/subDays'
import levenshtein from 'js-levenshtein';
import chunk from 'lodash/chunk'
import groupBy from 'lodash/groupBy'
import pickBy from 'lodash/pickBy'
import minBy from 'lodash/minBy';
import isNil from 'lodash/isNil'
import union from 'lodash/union'
import uniqBy from 'lodash/uniqBy'
import { init, withScope, captureMessage, startTransaction, captureException } from '@sentry/node';
import * as Tracing from '@sentry/tracing'

import { quoteSymbols } from '../utils/variables'
import { getCategoriesByCoin } from '../utils/categories'
import prisma from '../lib/prisma'
import coinGecko, { getOhlc, getCoin } from '../lib/coinGecko'
import cryptowatch from '../lib/cryptowatch'
import { getAllCoins } from '../lib/lunr'
import { Prisma } from '@prisma/client'
import { hasPlatforms } from '../utils/coingecko';

dotenv.config();
init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const fetchOhlcDays = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'cvxcrv', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd', 'rsr', 'fei', 'frax', 'tribe', 'gusd', 'usdx', 'eurt', 'tryb', 'itl', 'usds', 'xchf', 'xaur', 'eosdt', 'dgx', 'bitcny', 'idrt', 'ousd', 'usdk', 'rsv', 'musd', 'qc', 'dgd', 'eurs', 'susd', 'sai', 'cusd', 'alusd', 'seur', 'ethbull', 'eeur', 'eth2x-fli', 'instadapp-wbtc']
const excludedTokens = ['thorchain-erc20']
const noRankError = 'no-rank-error'
// We have to potentially try to get OHLC data from all of these markets, since some of them might only recently have listed a pair
const marketPriority = ['binance', 'bitfinex', 'huobi', 'ftx'].reverse()

const fetchCoinDataCoingecko = async (coinId, categories) => {
  let coinData
  try {
    coinData = (await getCoin(coinId)).data
    if (isNil(coinData.market_data.market_cap_rank)) {
      throw(noRankError)
    }
  } catch (e) {
    if (e === noRankError || e.response.status === 404) {
      // CoinGecko doesn't know this coin, so we assume it got delisted
      await prisma.ohlc.deleteMany({
        where: {
          coinId,
        },
      })
      await prisma.coinTime.deleteMany({
        where: {
          coinId,
        },
      })
      await prisma.coin.delete({
        where: {
          id: coinId,
        },
      })
      return false
    } else {
      console.log(e.response?.status);
      console.log(e.response?.headers);
      console.log(e.response?.data);
      throw(e)
    }
  }
  const symbol = coinData.symbol.toLowerCase()

  let platforms;
  if (hasPlatforms(coinData.platforms)) {
    platforms = pickBy(coinData.platforms, contract => contract.length)
    if (!Object.keys(platforms).length) {
      platforms = Prisma.DbNull
    }
  } else {
    platforms = Prisma.DbNull
  }

  const dailyChange = coinData.market_data.price_change_percentage_24h || undefined
  const weeklyChange = coinData.market_data.price_change_percentage_7d || undefined
  const marketCap = Math.ceil(coinData.market_data.market_cap.usd)
  const volume = Math.ceil(coinData.market_data.total_volume.usd)
  const dbCoinData = {
    symbol,
    name: coinData.name,
    defaultPlatform: coinData.asset_platform_id,
    platforms,
    images: coinData.image,
    description: coinData.description.en,
    homepage: coinData.links.homepage[0],
    twitter: coinData.links.twitter_screen_name || '',
    twitterFollowers: coinData.community_data.twitter_followers,
    ath: coinData.market_data.ath.usd,
    atl: coinData.market_data.atl.usd,
    marketCap,
    marketCapRank: coinData.market_data.market_cap_rank,
    fullyDilutedValuation: coinData.market_data.fully_diluted_valuation.usd,
    currentPrice: coinData.market_data.current_price?.usd,
    circulatingSupply: coinData.market_data.circulating_supply,
    totalSupply: coinData.market_data.total_supply,
    maxSupply: coinData.market_data.max_supply,
    tickers: coinData.tickers,
    categories: categories[`${symbol}-${coinData.name}`],
    dailyChange: dailyChange,
    weeklyChange: weeklyChange,
  }

  await prisma.coin.upsert({
    where: { id: coinId },
    create: {
      id: coinId,
      ...dbCoinData
    },
    update: dbCoinData,
  })

  await prisma.coinTime.create({
    data: {
      coinId,
      date: new Date(),
      marketCap,
      volume,
    }
  })

  return [true, symbol, coinId]
}

const fetchOhlcData = async (coinId, symbol, cryptowatchMarkets) => {
  const cryptoWatchAfterParam = Math.round((subDays(new Date(), fetchOhlcDays)).valueOf() / 1000)
  const ohlcPerQuoteSymbolEndpoints = quoteSymbols.map((quoteSymbol) => {
    if(symbol === quoteSymbol) {
      return []
    }

    let matchingMarkets = cryptowatchMarkets.filter((market) => {
      const realQuoteSymbol = quoteSymbol === 'usd' ? 'usdt' : quoteSymbol
      if (market.pair === `${symbol}${realQuoteSymbol}`) {
        market.inverse = false
        return true
      } else if (market.pair === `${realQuoteSymbol}${symbol}`) {
        market.inverse = true
        return true
      } else {
        return false
      }
    })

    matchingMarkets = matchingMarkets.sort((a, b) => marketPriority.indexOf(b.exchange) - marketPriority.indexOf(a.exchange))

    const endPoints = matchingMarkets.map((market) => {
      return {
        inverse: market.inverse,
        route: `https://api.cryptowat.ch/markets/${market.exchange}/${market.pair}/ohlc?periods=14400&after=${cryptoWatchAfterParam}`,
        quoteSymbol
      }
    })

    endPoints.push({
      isCoinGecko: true,
      quoteSymbol
    })

    return endPoints
  })
  let ohlcs = []
  const now = new Date()
  for (let ohlcEndPoints of ohlcPerQuoteSymbolEndpoints) {
    if (!ohlcEndPoints.length) {
      continue
    }
    for (let { route, inverse, isCoinGecko, quoteSymbol } of ohlcEndPoints) {
      let ohlcData = {}
      if (isCoinGecko) {
        let response
        try {
          response = await getOhlc(coinId, quoteSymbol, fetchOhlcDays)
        } catch(e) {
          console.log(e.response?.status);
          console.log(e.response?.headers);
          console.log(e.response?.data);
          throw(e);
        }
        ohlcData = response.data.map((frame) => {
          const closeTime = new Date(frame[0])
          return {
            closeTime,
            open: frame[1],
            high: frame[2],
            low: frame[3],
            close: frame[4],
            coinId,
            quoteSymbol
          }
        })
        ohlcData = ohlcData.filter((ohlc) => ohlc.closeTime < now)
        ohlcs = [...ohlcs, ...ohlcData]
      } else {
        const response = await cryptowatch.get(route)
        ohlcData = response.data.result['14400']
        // Sometimes cryptowatch can't give us all the OHLC data, because a coin just recently got listed on an exchange
        if (ohlcData.length < fetchOhlcDays * 6) {
          continue
        }
        ohlcData = ohlcData.map((frame) => {
          const ohlcCloseTimeUnix = new Date(frame[0] * 1000)
          return {
            closeTime: ohlcCloseTimeUnix,
            open: frame[1],
            high: frame[2],
            low: frame[3],
            close: frame[4],
            coinId: coinId,
            quoteSymbol
          }
        })
        if (inverse) {
          ohlcData = ohlcData.map((ohlc) => {
            return {
              ...ohlc,
              open: 1 / ohlc.open,
              high: 1 / ohlc.high,
              low: 1 / ohlc.low,
              close: 1 / ohlc.close,
            }
          })
        }
        ohlcData = ohlcData.filter((ohlc) => new Date(ohlc.closeTime) < now)
        ohlcs = [...ohlcs, ...ohlcData]
        break
      }
    }
  }

  await prisma.ohlc.createMany({ data: ohlcs, skipDuplicates: true })
}

const fetchCoinDataAndOhlcs = async () => {
  const coinMarketsPage1 = await coinGecko.get('/coins/markets?vs_currency=usd&per_page=250')
  const coinMarketsPage2 = await coinGecko.get('/coins/markets?vs_currency=usd&per_page=250&page=2')
  const coinMarketsPage3 = await coinGecko.get('/coins/markets?vs_currency=usd&per_page=250&page=3')
  const coinMarketsPage4 = await coinGecko.get('/coins/markets?vs_currency=usd&per_page=250&page=4')
  let coinsMarketData = [...coinMarketsPage1.data, ...coinMarketsPage2.data, ...coinMarketsPage3.data, ...coinMarketsPage4.data]
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedSymbols.includes(coinMarket.symbol))
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedTokens.includes(coinMarket.id))
  let coinIds = coinsMarketData.map(({ id }) => id)
  let databaseCoinIds = await prisma.coin.findMany({
    select: {
      id: true
    }
  })
  databaseCoinIds = databaseCoinIds.map(({ id }) => id)
  coinIds = union(coinIds, databaseCoinIds)
  if (process.env.NODE_ENV == "development") {
    coinIds = coinIds.slice(0, 10)
  }
  const chunkedCoinIds = chunk(coinIds, 5)
  const categories = await getCategoriesByCoin();

  const coinsToFetchOhlcsFor = []
  for (let chunk of chunkedCoinIds) {
    const responses = await Promise.all(chunk.map(coinId => fetchCoinDataCoingecko(coinId, categories)))

    for (const [coinExists, symbol, coinId] of responses) {
      if (coinExists) {
        coinsToFetchOhlcsFor.push({
          coinId,
          symbol
        })
      }
    }
  }

  const cryptowatchMarketsResponse = await cryptowatch.get('/markets')
  let cryptowatchMarkets = cryptowatchMarketsResponse.data.result
  cryptowatchMarkets = cryptowatchMarkets.filter(market => market.active)
  const chunkedOhlcRequests = chunk(coinsToFetchOhlcsFor, 5)

  for (let chunk of chunkedOhlcRequests) {
    await Promise.all(chunk.map(({ coinId, symbol }) => fetchOhlcData(coinId, symbol, cryptowatchMarkets)))
  }
}

const fetchDerivativesData = async() => {
  const derivativesData = (await coinGecko.get('derivatives')).data
  let perpetualDerivatives = derivativesData.filter(derivate => derivate.contract_type === 'perpetual')
  perpetualDerivatives = uniqBy(perpetualDerivatives, 'symbol')
  const derivativesByCoin = groupBy(perpetualDerivatives, 'index_id')

  for (const [coinId, derivatives] of Object.entries(derivativesByCoin)) {
    const derivativesCoinData = derivatives.map(derivative => {
      const derivateMarket = derivative.market
        .replace(/\(?Futures\)?/, '')
        .trim()
      return {
        symbol: derivative.symbol,
        market: derivateMarket
      }
    })

    const coinToUpdate = await prisma.coin.findFirst({
      where : {
        symbol: coinId.toLowerCase()
      }
    })
    if (coinToUpdate) {
      await prisma.coin.update({
        where: { id: coinToUpdate.id },
        data: {
          derivatives: derivativesCoinData
        },
      })
    }
  }
}

const fetchLunrData = async() => {
  const lunrCoins = (await getAllCoins()).data?.data || []
  for (const lunrCoin of lunrCoins) {
    let matchingCoin
    const matchingCoins = await prisma.coin.findMany({
      where : {
        symbol: lunrCoin.s.toLowerCase()
      }
    })
    if (matchingCoins.length === 1) {
      matchingCoin = matchingCoins[0]
    } else if (matchingCoins.length > 1) {
      const closestCoin = minBy(matchingCoins, (coin) => levenshtein(coin.name, lunrCoin.n));

      withScope(scope => {
        scope.setLevel('warning');
        scope.setExtra('symbol', lunrCoin.s);
        captureMessage(`Lunr: Detected the right coin via levenshtein distance: ${closestCoin.name} (${lunrCoin.s})`);
      });
      console.log('Found multiple coins', matchingCoins)
      console.log('Picked', closestCoin, ' for ', lunrCoin.s, lunrCoin.n)
      matchingCoin = closestCoin;
    } else {
      console.log('No matching db coin found for ', lunrCoin.s, lunrCoin.n)
    }
    if (matchingCoin) {
      await prisma.coin.update({
        where: { id: matchingCoin.id },
        data: {
          lunrInternalId: lunrCoin.id,
          lunrSymbol: lunrCoin.s,
          lunrName: lunrCoin.n,
          lunrCurrentPrice: lunrCoin.p,
          lunrVolume: lunrCoin.v,
          lunrPercentageChange24h: lunrCoin.pc,
          lunrPercentageChange1h: lunrCoin.pch,
          lunrMarketCap: lunrCoin.mc,
          lunrGalaxyScore: lunrCoin.gs,
          lunrGalaxyScorePrevious: lunrCoin.gs_p,
          lunrSocialScore: lunrCoin.ss,
          lunrAverageSentiment: lunrCoin.as,
          lunrSocialVolume: lunrCoin.sv,
          lunrSocialContributors: lunrCoin.c,
          lunrSocialDominance: lunrCoin.sd,
          lunrMarketDominance: lunrCoin.d,
          lunrAltRank: lunrCoin.acr,
          lunrAltRankPrevious: lunrCoin.acr_p,
          lunrCategories: lunrCoin.categories?.split(',')
        },
      })
    }
  }
}

setTimeout(async () => {
  const transaction = startTransaction({
    op: "Datafetch",
    name: `Datafetch ${new Date()}`,
  });
  try {
    await fetchCoinDataAndOhlcs();
    await fetchDerivativesData();
    await fetchLunrData();
    if (process.env.NODE_ENV === 'production') {
      await axios.get('https://api.vercel.com/v1/integrations/deploy/prj_uc9CaXrUEpspFxIJeoTgrrWqaIAY/ZzMCeSY4lD')
    }
  } catch (e) {
    console.log(e)
    captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);