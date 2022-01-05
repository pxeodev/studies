import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import compact from 'lodash/compact'
import dotenv from 'dotenv';
import subDays from 'date-fns/subDays'

import { quoteSymbols } from '../utils/variables'
import prisma from '../lib/prisma'

dotenv.config();

const fetchOhlcDays = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'cvxcrv', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd', 'rsr', 'fei', 'frax', 'tribe', 'gusd', 'usdx', 'eurt', 'tryb', 'itl', 'usds', 'xchf', 'xaur', 'eosdt', 'dgx', 'bitcny', 'idrt', 'ousd', 'usdk', 'rsv', 'musd', 'qc', 'dgd', 'eurs', 'susd', 'sai', 'cusd', 'alusd']
const excludedTokens = ['thorchain-erc20']

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

  const coinMarketsPage1 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250')
  const coinMarketsPage2 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=2')
  const coinMarketsPage3 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=3')
  const coinMarketsPage4 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=4')
  let coinsMarketData = [...coinMarketsPage1.data, ...coinMarketsPage2.data, ...coinMarketsPage3.data, ...coinMarketsPage4.data]
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedSymbols.includes(coinMarket.symbol))
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedTokens.includes(coinMarket.id))
  coinsMarketData = coinsMarketData.map((data) => ({...data, symbol: data.symbol.toLowerCase()}))
  if (process.env.NODE_ENV == "development") {
    coinsMarketData = coinsMarketData.slice(0, 3)
  }

  const cryptowatchMarketsResponse = await cryptowatchAPI.get('/markets')
  let cryptowatchMarkets = cryptowatchMarketsResponse.data.result
  cryptowatchMarkets = cryptowatchMarkets.filter(market => market.active)

  // We have to potentially try to get OHLC data from all of these markets, since some of them might only recently have listed a pair
  let marketPriority = ['binance', 'bitfinex', 'huobi', 'ftx']
  marketPriority.reverse()

  for (let coinMarketData of coinsMarketData) {
    const coinData = (await coinGeckoAPI.get(`/coins/${coinMarketData.id}`)).data
    await new Promise((res) => setTimeout(res, 1200))

    const dbCoinData = {
      symbol: coinMarketData.symbol,
      name: coinMarketData.name,
      categories: compact(coinData.categories),
      images: coinData.image,
      description: coinData.description.en,
      homepage: coinData.links.homepage[0],
      twitter: coinData.links.twitter_screen_name,
      twitterFollowers: coinData.community_data.twitter_followers,
      currentPriceUsd: coinData.market_data.current_price.usd,
      ath: coinData.market_data.ath.usd,
      atl: coinData.market_data.atl.usd,
      marketCap: coinData.market_data.market_cap.usd,
      marketCapRank: coinData.market_data.market_cap_rank,
      fullyDilutedValuation: coinData.market_data.fully_diluted_valuation.usd,
      circulatingSupply: coinData.market_data.circulating_supply,
    }

    await prisma.coin.upsert({
      where: { id: coinMarketData.id },
      create: {
        id: coinMarketData.id,
        ...dbCoinData
      },
      update: dbCoinData,
    })

    let cryptoWatchAfterParam = Math.round((subDays(new Date(), fetchOhlcDays)).valueOf() / 1000)
    const ohlcPerQuoteSymbolEndpoints = quoteSymbols.map((quoteSymbol) => {
      if(coinMarketData.symbol === quoteSymbol) {
        return []
      }

      let matchingMarkets = cryptowatchMarkets.filter((market) => {
        const realQuoteSymbol = quoteSymbol === 'usd' ? 'usdt' : quoteSymbol
        if (market.pair === `${coinMarketData.symbol}${realQuoteSymbol}`) {
          market.inverse = false
          return true
        } else if (market.pair === `${realQuoteSymbol}${coinMarketData.symbol}`) {
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
        route: `https://api.coingecko.com/api/v3/coins/${coinMarketData.id}/ohlc?vs_currency=${quoteSymbol}&days=${fetchOhlcDays}`,
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
          const closeTime = new Date(frame[0])
          ohlcData = response.data.map((frame) => {
            return {
              closeTime,
              open: frame[1],
              high: frame[2],
              low: frame[3],
              close: frame[4],
              coinId: coinMarketData.id,
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
              coinId: coinMarketData.id,
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

  // TODO: Set TZ=UTC everywhere
  // TODO: Do this CRON job at 4:10 AM UTC every day via render.com and run it once manually
  // TODO: Remove the cron job org thing
  if (process.env.NODE_ENV === 'production') {
    await axios.get('https://api.vercel.com/v1/integrations/deploy/prj_uc9CaXrUEpspFxIJeoTgrrWqaIAY/ZzMCeSY4lD')
  }
}

script()