import dotenv from 'dotenv';
import axios from 'axios'
import startofHour from 'date-fns/startOfHour/index.js';
import sum from 'lodash/sum.js';
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import prisma from '../lib/prisma.mjs';

import { getSupportedExchanges, getSupportedFutureMarkets, getOpenInterest, getFundingRate, getVolume24h } from '../lib/coinalyze.mjs';

dotenv.config();
puppeteer.use(StealthPlugin())
const CME_SCRAPING_COINS = ['bitcoin', 'ethereum']

let browser, page
const initializeScraping = async () => {
  browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    timeout: 1000000
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 100080 })
  await page.setDefaultNavigationTimeout(0);
}

const scrapeCoinData = async (coinSymbol) => {
  let openInterest = 0
  let fundingRate = 0
  let futuresVolume24h = 0
  return [openInterest, fundingRate, futuresVolume24h]
}

const fetchCoinalyze = async () => {
  await initializeScraping()
  const now = startofHour(new Date());
  const databaseExchanges = await prisma.exchange.findMany({ select: { id: true, name: true } })
  const databaseExchangeNames = databaseExchanges.map(exchange => exchange.name);
  let supportedExchanges = await getSupportedExchanges()
  supportedExchanges = supportedExchanges.data.filter(exchange => databaseExchangeNames.includes(exchange.name));
  const supportedExchangeCodes = supportedExchanges.map(exchange => exchange.code);

  let supportedFutureMarkets = await getSupportedFutureMarkets();
  supportedFutureMarkets = supportedFutureMarkets.data.filter(market => market.is_perpetual && supportedExchangeCodes.includes(market.exchange));
  const supportedFutureSymbols = supportedFutureMarkets.map(market => market.base_asset.toLowerCase());

  const databaseCoins = await prisma.coin.findMany({
    select: {
      symbol: true,
      id: true,
    },
    where: {
      symbol: {
        in: supportedFutureSymbols
      }
    },
    orderBy: {
      marketCapRank: 'asc'
    }
  });
  for (const coin of databaseCoins) {
    let supportedMarketsForCoin = supportedFutureMarkets.filter(market => market.base_asset.toLowerCase() === coin.symbol);
    const requests = []
    for (const market of supportedMarketsForCoin) {
      requests.push(
        getOpenInterest(market.symbol, market.exchange),
        getFundingRate(market.symbol, market.exchange),
        getVolume24h(market.symbol, market.exchange)
      )
    }
    const data = await Promise.all(requests)
    let openInterest = data.filter(data => data.openInterest)
    openInterest = sum(openInterest.map(data => data.openInterest))
    let fundingRate = data.filter(data => data.fundingRate)
    fundingRate = sum(fundingRate.map(data => data.fundingRate))
    let futuresVolume24h = data.filter(data => data.futuresVolume24h)
    futuresVolume24h = sum(futuresVolume24h.map(data => data.futuresVolume24h))
    if (CME_SCRAPING_COINS.includes(coin.id)) {
      const [scrapedOpenInterest, scrapedFundingRate, scrapedFuturesVolume24h] = await scrapeCoinData(coin.symbol)
      openInterest += scrapedOpenInterest
      fundingRate += scrapedFundingRate
      futuresVolume24h += scrapedFuturesVolume24h
    }
    await prisma.coin.update({
      where: {
        id: coin.id
      },
      data: {
        openInterest,
        fundingRate,
        futuresVolume24h,
      }
    });
    await prisma.coinTime.create({
      data: {
        coinId: coin.id,
        date: now,
        time: now,
        timeframe: '1h',
        openInterest,
        fundingRate,
        futuresVolume24h,
      }
    })
  }
}

setTimeout(async () => {
  await fetchCoinalyze()
  if (process.env.NODE_ENV === 'production') {
    await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/new-coinalyze-data`)
  }
}, 99);