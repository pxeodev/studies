import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import dotenv from 'dotenv';
import subDays from 'date-fns/subDays'
import pickBy from 'lodash/pickBy'
import isNil from 'lodash/isNil'
import union from 'lodash/union'
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { quoteSymbols } from '../utils/variables'
import { getCategoriesByCoin } from '../utils/categories'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { hasPlatforms } from '../utils/coingecko';

dotenv.config();

const fetchOhlcDays = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'cvxcrv', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd', 'rsr', 'fei', 'frax', 'tribe', 'gusd', 'usdx', 'eurt', 'tryb', 'itl', 'usds', 'xchf', 'xaur', 'eosdt', 'dgx', 'bitcny', 'idrt', 'ousd', 'usdk', 'rsv', 'musd', 'qc', 'dgd', 'eurs', 'susd', 'sai', 'cusd', 'alusd', 'seur', 'ethbull', 'eeur', 'eth2x-fli']
const excludedTokens = ['thorchain-erc20']
const noRankError = 'no-rank-error'

const script = async () => {
  const coinGeckoAPI = axios.create({
    baseURL: 'https://api.coingecko.com/api/v3',
    timeout: 30000
  })
  coinGeckoAPI.defaults.raxConfig = {
    instance: coinGeckoAPI
  }
  coinGeckoAPI.interceptors.request.use(AxiosLogger.requestLogger);
  rax.attach(coinGeckoAPI)

  const cryptowatchAPI = axios.create({
    baseURL: 'https://api.cryptowat.ch',
    timeout: 30000,
    headers: { 'X-CW-API-Key': process.env.CRYPTOWATCH_API_KEY }
  })
  cryptowatchAPI.defaults.raxConfig = {
    instance: cryptowatchAPI
  }
  cryptowatchAPI.interceptors.request.use(AxiosLogger.requestLogger);
  rax.attach(cryptowatchAPI)

  const categories = await getCategoriesByCoin();

  const coinMarketsPage1 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250')
  const coinMarketsPage2 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=2')
  const coinMarketsPage3 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=3')
  const coinMarketsPage4 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=4')
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
    coinIds = coinIds.slice(0, 3)
  }

  const cryptowatchMarketsResponse = await cryptowatchAPI.get('/markets')
  let cryptowatchMarkets = cryptowatchMarketsResponse.data.result
  cryptowatchMarkets = cryptowatchMarkets.filter(market => market.active)

  // We have to potentially try to get OHLC data from all of these markets, since some of them might only recently have listed a pair
  let marketPriority = ['binance', 'bitfinex', 'huobi', 'ftx']
  marketPriority.reverse()

  for (let coinId of coinIds) {
    let coinData
    try {
      coinData = (await coinGeckoAPI.get(`/coins/${coinId}`)).data
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
        continue
      } else {
        throw(e)
      }
    }
    const symbol = coinData.symbol.toLowerCase()
    await new Promise((res) => setTimeout(res, 1200))

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
      twitter: coinData.links.twitter_screen_name,
      twitterFollowers: coinData.community_data.twitter_followers,
      ath: coinData.market_data.ath.usd,
      atl: coinData.market_data.atl.usd,
      marketCap,
      marketCapRank: coinData.market_data.market_cap_rank,
      fullyDilutedValuation: coinData.market_data.fully_diluted_valuation.usd,
      circulatingSupply: coinData.market_data.circulating_supply,
      totalSupply: coinData.market_data.total_supply,
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

    let cryptoWatchAfterParam = Math.round((subDays(new Date(), fetchOhlcDays)).valueOf() / 1000)
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
        coinGecko: true,
        route: `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`,
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
      for (let { route, inverse, coinGecko, quoteSymbol } of ohlcEndPoints) {
        let ohlcData = {}
        if (coinGecko) {
          await new Promise((res) => setTimeout(res, 1200))
          const response = await coinGeckoAPI.get(route)
          ohlcData = response.data.map((frame) => {
            const closeTime = new Date(frame[0])
            return {
              closeTime,
              open: frame[1],
              high: frame[2],
              low: frame[3],
              close: frame[4],
              coinId: coinId,
              quoteSymbol
            }
          })
          ohlcData = ohlcData.filter((ohlc) => ohlc.closeTime < now)
          ohlcs = [...ohlcs, ...ohlcData]
        } else {
          const response = await cryptowatchAPI.get(route)
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

  if (process.env.NODE_ENV === 'production') {
    await axios.get('https://api.vercel.com/v1/integrations/deploy/prj_uc9CaXrUEpspFxIJeoTgrrWqaIAY/ZzMCeSY4lD')
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
  op: "Datafetch",
  name: `Datafetch ${new Date()}`,
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