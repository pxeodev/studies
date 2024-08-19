import dotenv from 'dotenv';
import axios from 'axios'
import startofHour from 'date-fns/startOfHour/index.js';
import sum from 'lodash/sum.js';
import mean from 'lodash/mean.js';
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { retry } from '@lifeomic/attempt'

import { getSupportedExchanges, getSupportedFutureMarkets, getOpenInterest, getFundingRate, getVolume24h } from '../lib/coinalyze.mjs';
import { deformat } from '../utils/number.mjs';
import sql from '../lib/database.mjs';

dotenv.config();
puppeteer.use(StealthPlugin())
const CME_SCRAPING_COINS = ['bitcoin', 'ethereum']
const preferredFundingRateMarkets = ['A', '6', '3']

let browser, page
const initializeScraping = async () => {
  browser = await puppeteer.launch({
    // headless: false,
    // devtools: true,
    timeout: 100000
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 100080 })
  await page.setDefaultNavigationTimeout(0);
}

const scrapeCoinData = async (coinId, coinSymbol) => {
  let openInterest = 0
  let futuresVolume24h = 0
  await page.goto(`https://coinalyze.net/${coinId}/open-interest/`)
  openInterest = await page.$eval('.stats .box:nth-child(2) .box-row:first-child', node => node.innerText)
  openInterest = deformat(openInterest)

  await page.goto(`https://www.coinglass.com/currencies/${coinSymbol}`)
  futuresVolume24h = await page.$eval('.ant-row:nth-child(2) > div:first-child .MuiBox-root:first-child .Number:nth-child(2)', node => node.ariaLabel)
  futuresVolume24h = deformat(futuresVolume24h)

  return [openInterest, futuresVolume24h]
}

const getOpenInterestPriceFactorUSD = (market, databaseCoins, coin) => {
  const openInterestDenomination = market.oi_lq_vol_denominated_in === 'QUOTE_ASSET' ? market.quote_asset : market.base_asset
  if (openInterestDenomination === 'EUR' || openInterestDenomination === 'USD') {
    return 1 // EUR is always very close to USD and we don't have the price for EUR...
  }
  let openInterestDenominationPriceFactor = 1
  if (coin.symbol.toUpperCase() === openInterestDenomination) {
    openInterestDenominationPriceFactor = coin.currentPrice
  } else {
    const openInterestDenominationCoin = databaseCoins.find(coin => coin.symbol.toUpperCase() === openInterestDenomination)
    if (openInterestDenominationCoin) {
      openInterestDenominationPriceFactor = openInterestDenominationCoin.currentPrice
    } else {
      console.log('No price for', openInterestDenomination)
      throw(new Error('No price for ' + openInterestDenomination))
    }
  }
  return openInterestDenominationPriceFactor
}

const fetchCoinalyze = async () => {
  await initializeScraping()
  const now = startofHour(new Date());
  const databaseExchanges = await sql`SELECT id, name FROM "Exchange"`
  const databaseExchangeNames = databaseExchanges.map(exchange => exchange.name);
  let supportedExchanges = await getSupportedExchanges()
  supportedExchanges = supportedExchanges.data.filter(exchange => databaseExchangeNames.includes(exchange.name));
  const supportedExchangeCodes = supportedExchanges.map(exchange => exchange.code);

  let supportedFutureMarkets = await getSupportedFutureMarkets();
  supportedFutureMarkets = supportedFutureMarkets.data.filter(market => market.is_perpetual && supportedExchangeCodes.includes(market.exchange));
  const supportedFutureSymbols = supportedFutureMarkets.map(market => market.base_asset.toLowerCase());

  const databaseCoins = await sql`SELECT id, symbol, "currentPrice" FROM "Coin" WHERE symbol IN ${sql([...supportedFutureSymbols])} ORDER BY "marketCapRank" ASC`
  for (const coin of databaseCoins) {
    let supportedMarketsForCoin = supportedFutureMarkets.filter(market => market.base_asset.toLowerCase() === coin.symbol);
    let preferredFundingRateMarket = supportedMarketsForCoin.find(market => preferredFundingRateMarkets.includes(market.exchange))
    if (!preferredFundingRateMarket) {
      preferredFundingRateMarket = supportedMarketsForCoin[0]
    }
    const requests = []
    for (const market of supportedMarketsForCoin) {
      const openInterestDenominationPriceFactor = getOpenInterestPriceFactorUSD(market, databaseCoins, coin)
      requests.push(
        getOpenInterest(market.symbol, market.exchange, openInterestDenominationPriceFactor),
        getVolume24h(market.symbol, market.exchange, coin.currentPrice)
      )
      if (market.exchange === preferredFundingRateMarket.exchange) {
        requests.push(
          getFundingRate(market.symbol, market.exchange)
        )
      }
    }
    let data = await Promise.allSettled(requests)
    data = data.filter(data => data.status === 'fulfilled')
    data = data.map(data => data.value)
    let openInterest = data.filter(data => data.openInterest)
    openInterest = sum(openInterest.map(data => data.openInterest))
    let fundingRate = data.filter(data => data.fundingRate)
    fundingRate = mean(fundingRate.map(data => data.fundingRate))
    let futuresVolume24h = data.filter(data => data.futuresVolume24h)
    futuresVolume24h = sum(futuresVolume24h.map(data => data.futuresVolume24h))
    if (CME_SCRAPING_COINS.includes(coin.id)) {
      const [scrapedOpenInterest, scrapedFuturesVolume24h] = await retry(() => scrapeCoinData(coin.id, coin.symbol.toUpperCase()), {
        factor: 2,
        maxAttempts: 6,
        jitter: true
      });
      openInterest = scrapedOpenInterest
      futuresVolume24h = scrapedFuturesVolume24h
    }
    if (coin.id === CME_SCRAPING_COINS[CME_SCRAPING_COINS.length - 1]) {
      console.log('Closing browser')
      await page?.close()
      await browser?.close()
      console.log('Closed browser')
    }
    await sql`UPDATE "Coin" SET "openInterest" = ${openInterest}, "fundingRate" = ${fundingRate}, "futuresVolume24h" = ${futuresVolume24h} WHERE id = ${coin.id}`
    await sql`INSERT INTO "CoinTime" ("coinId", "date", "time", "timeframe", "openInterest", "fundingRate", "futuresVolume24h") VALUES (${coin.id}, ${now}, ${now}, '1h', ${openInterest}, ${fundingRate}, ${futuresVolume24h})`
  }
}

setTimeout(async () => {
  console.log('Fetching Coin Analyze data')
  await fetchCoinalyze()
  console.log('Coin Analyze data fetched')
  if (process.env.NODE_ENV === 'production') {
    await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/new-coinalyze-data`)
  }
  console.log('Coin Analyze data posted')
  process.exit(0)
}, 99);
