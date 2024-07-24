import axios from 'axios'
import dotenv from 'dotenv';
import levenshtein from 'js-levenshtein';
import chunk from 'lodash/chunk.js'
import groupBy from 'lodash/groupBy.js'
import pickBy from 'lodash/pickBy.js'
import minBy from 'lodash/minBy.js';
import isNil from 'lodash/isNil.js'
import union from 'lodash/union.js'
import uniqBy from 'lodash/uniqBy.js'

import { quoteSymbols } from 'coinrotator-utils/variables.mjs'
import prisma from '../lib/prisma.mjs'
import coinGecko, { getOhlc, getCoin, getMarket } from '../lib/coinGecko.mjs'
import { createJob } from '../lib/render.mjs'
import { getAllCoins } from '../lib/lunr.mjs'
import { Prisma } from '@prisma/client'
import { hasPlatforms } from '../utils/coingecko.mjs';
import convertToDailySignals from '../utils/convertToDailySignals.mjs';
import { saveDailyOhlcsToSupertrends } from '../utils/ohlc.mjs';
import { overrideCoinCategories, aliasCoinCategories } from '../utils/categories.mjs';

dotenv.config();

const fetchOhlcDays = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd', 'rsr', 'fei', 'frax', 'tribe', 'gusd', 'usdx', 'eurt', 'tryb', 'itl', 'usds', 'xchf', 'xaur', 'eosdt', 'dgx', 'bitcny', 'idrt', 'ousd', 'usdk', 'rsv', 'qc', 'dgd', 'eurs', 'susd', 'sai', 'cusd', 'alusd', 'seur', 'eeur', 'eth2x-fli', 'dfuk']
const excludedTokens = ['thorchain-erc20']
const unrankedCoins = ['ftx-token', 'rats', 'bitdao', 'astropepex', 'binaryx-2', 'presearch', 'quadency', 'iq50', 'maga-pepe-2', 'babytrump', 'kamala-horris', 'bitcoin-cats']
const noRankError = 'no-rank-error'
// We have to potentially try to get OHLC data from all of these markets, since some of them might only recently have listed a pair
const marketPriority = ['binance', 'bitfinex', 'huobi', 'ftx'].reverse()

const fetchCoinDataCoingecko = async (coinId) => {
  let coinData
  try {
    coinData = (await getCoin(coinId)).data
    if (isNil(coinData.market_data.market_cap_rank) && !unrankedCoins.includes(coinId)) {
      throw(noRankError)
    }
  } catch (e) {
    if (e === noRankError || e.response?.status === 404) {
      // CoinGecko doesn't know this coin, so we assume it got delisted
      await prisma.ohlc.deleteMany({
        where: {
          coinId,
        },
      })
      await prisma.superTrend.deleteMany({
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
      return [false, null, coinId]
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
  const tickers = uniqBy(coinData.tickers, ticker => `${ticker.base}${ticker.target}${ticker.market.name}`)
  let categories = await overrideCoinCategories(coinData.name, symbol, coinData.categories)
  categories = await aliasCoinCategories(categories)
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
    tickers: tickers,
    dailyChange: dailyChange,
    weeklyChange: weeklyChange,
    coingeckoCategories: categories,
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

const fetchOhlcData = async (coinId, symbol) => {
  const ohlcPerQuoteSymbolEndpoints = quoteSymbols.map((quoteSymbol) => {
    if(symbol === quoteSymbol) return []

    return [{
      isCoinGecko: true,
      quoteSymbol
    }]
  })
  let ohlcs = []
  const now = new Date()
  for (let ohlcEndPoints of ohlcPerQuoteSymbolEndpoints) {
    if (!ohlcEndPoints.length) {
      continue
    }
    for (let { route, inverse, isCoinGecko, quoteSymbol } of ohlcEndPoints) {
      let ohlcData = {}
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
    }
  }

  await prisma.ohlc.createMany({ data: ohlcs, skipDuplicates: true })
  const dailyOhlcs = convertToDailySignals(ohlcs, true)
  await saveDailyOhlcsToSupertrends(dailyOhlcs, coinId)
}

const fetchCoinDataAndOhlcs = async () => {
  const coinMarketsPage1 = await getMarket(1)
  const coinMarketsPage2 = await getMarket(2)
  const coinMarketsPage3 = await getMarket(3)
  const coinMarketsPage4 = await getMarket(4)
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
  unrankedCoins.forEach((unrankedCoin) => {
    if (!coinIds.includes(unrankedCoin)) {
      coinIds.push(unrankedCoin)
    }
  })
  if (process.env.NODE_ENV == "development") {
    coinIds = coinIds.slice(0, 10)
  }
  const chunkedCoinIds = chunk(coinIds, 5)

  const coinsToFetchOhlcsFor = []
  for (let chunk of chunkedCoinIds) {
    const responses = await Promise.all(chunk.map(coinId => fetchCoinDataCoingecko(coinId)))

    try {
      for (const [coinExists, symbol, coinId] of responses) {
        if (coinExists) {
          coinsToFetchOhlcsFor.push({
            coinId,
            symbol
          })
        }
      }
    } catch(e) {
      console.log(e, typeof responses, responses)
    }
  }

  const chunkedOhlcRequests = chunk(coinsToFetchOhlcsFor, 5)

  for (let chunk of chunkedOhlcRequests) {
    await Promise.all(chunk.map(({ coinId, symbol }) => fetchOhlcData(coinId, symbol)))
  }
}

const fetchDerivativesData = async() => {
  const derivativesData = (await coinGecko.get('derivatives')).data
  let perpetualDerivatives = derivativesData.filter(derivate => derivate.contract_type === 'perpetual')
  perpetualDerivatives = perpetualDerivatives.map(derivate => {
    if (derivate.market === 'KuCoin Futures') {
      derivate.index_id = derivate.index_id.replace('USDT', '').substring(1) // KuCoin Futures symbols are special for some reason
    }
    return derivate
  })
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
  await fetchCoinDataAndOhlcs();
  await fetchDerivativesData();
  // await fetchLunrData();
  if (process.env.NODE_ENV === 'production') {
    await axios.post('https://coinrotator-realtime-fra.onrender.com/new-trends')
    setTimeout(async () => {
      await axios.get('https://api.vercel.com/v1/integrations/deploy/prj_uc9CaXrUEpspFxIJeoTgrrWqaIAY/zigJ5zntts')
      await createJob({ serviceId: 'crn-c8q7r2pg7hp6tkba3sj0', startCommand: 'node dist/bot.mjs' })
      try {
        await axios.post('https://websocket-pr-8.onrender.com/new-trends')
        setTimeout(async () => {
          await axios.post('https://websocket-pr-6.onrender.com/new-trends')
        }, 1000 * 60 * 10)
      } catch(e) {}
    }, 1000 * 60 * 5) // Wait 5 minutes so the realtime server can start
  }
}, 99);
