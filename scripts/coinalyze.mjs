import dotenv from 'dotenv';
import axios from 'axios'
import startofHour from 'date-fns/startOfHour/index.js';
import sum from 'lodash/sum.js';
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { retry } from '@lifeomic/attempt'
import * as Sentry from "@sentry/node";

import '../lib/sentry.mjs'
import { getSupportedExchanges, getSupportedFutureMarkets, getOpenInterest, getFundingRate, getVolume24h } from '../lib/coinalyze.mjs';
import { deformat } from '../utils/number.mjs';
import sql from '../lib/database.mjs';

dotenv.config();
puppeteer.use(StealthPlugin())
const CME_SCRAPING_COINS = ['bitcoin', 'ethereum']

let browser, page
const initializeScraping = async () => {
  browser = await puppeteer.launch({
    // headless: false,
    // devtools: true,
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 100080 })
  await page.setDefaultNavigationTimeout(0);
}

const scrapeCoinData = async (coinId, coinSymbol) => {
  console.log(`Scraping ${coinSymbol}`)
  let openInterest = 0
  let futuresVolume24h = 0
  await page.goto(`https://coinalyze.net/${coinId}/open-interest/`, { waitUntil: 'domcontentloaded' })
  console.log('Went to ', `https://coinalyze.net/${coinId}/open-interest/`)
  openInterest = await page.$eval('.stats .box:nth-child(2) .box-row:first-child', node => node.innerText)
  console.log('Got open interest', openInterest)
  openInterest = deformat(openInterest)
  console.log('Deformatted open interest', openInterest)

  await page.goto(`https://www.coinglass.com/currencies/${coinSymbol}`, { waitUntil: 'domcontentloaded' })
  console.log('Went to ', `https://www.coinglass.com/currencies/${coinSymbol}`)
  futuresVolume24h = await page.waitForSelector('.ant-row:nth-child(2) > div:first-child .MuiBox-root:first-child .Number:nth-child(2)', { visible: true })
  console.log('Futures volume selector appeared')
  futuresVolume24h = await page.$eval('.ant-row:nth-child(2) > div:first-child .MuiBox-root:first-child .Number:nth-child(2)', node => node.ariaLabel)
  console.log('Got futures volume', futuresVolume24h)
  futuresVolume24h = deformat(futuresVolume24h)
  console.log('Deformatted futures volume', futuresVolume24h)

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
    const requests = []
    for (const market of supportedMarketsForCoin) {
      const openInterestDenominationPriceFactor = getOpenInterestPriceFactorUSD(market, databaseCoins, coin)
      requests.push(
        getOpenInterest(market.symbol, market.exchange, openInterestDenominationPriceFactor),
        getVolume24h(market.symbol, market.exchange, coin.currentPrice)
      )
    }
    console.time(`Fetching ${coin.symbol}`)
    let data = await Promise.allSettled(requests)
    console.timeEnd(`Fetching ${coin.symbol}`)
    data = data.filter(data => data.status === 'fulfilled')
    data = data.map(data => data.value)
    let openInterest = data.filter(data => data.openInterest)
    if (!openInterest.length) continue // Sometimes Coinalyze claims to have futures data on a coin when it doesn't
    const largestExchangeByOpenInterest = openInterest.reduce((acc, cur) => acc.openInterest > cur.openInterest ? acc : cur)
    openInterest = sum(openInterest.map(data => data.openInterest))
    let fundingRate = await getFundingRate(largestExchangeByOpenInterest.symbol, largestExchangeByOpenInterest.market)
    fundingRate = fundingRate.fundingRate ?? null
    let futuresVolume24h = data.filter(data => data.futuresVolume24h)
    futuresVolume24h = sum(futuresVolume24h.map(data => data.futuresVolume24h))
    if (CME_SCRAPING_COINS.includes(coin.id)) {
      try {
        console.time(`Scraping ${coin.symbol}`)
        const [scrapedOpenInterest, scrapedFuturesVolume24h] = await retry(async () => {
          return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Operation timed out")), 60000); // Reject after 60 seconds
            try {
              const result = await scrapeCoinData(coin.id, coin.symbol.toUpperCase());
              clearTimeout(timeout); // Clear the timeout once the result is received
              resolve(result);
            } catch (err) {
              clearTimeout(timeout); // Clear the timeout in case of error
              reject(err);
            }
          });
        }, {
          factor: 2,
          maxAttempts: 6,
          jitter: true,
          handleError: (e) => { console.error(e) }
        });
        console.timeEnd(`Scraping ${coin.symbol}`)
        openInterest = scrapedOpenInterest
        futuresVolume24h = scrapedFuturesVolume24h
      } catch(e) {
        console.error(e)
        Sentry.captureException(e);
        // In error case we don't want to save wrong data
        openInterest = null
        futuresVolume24h = null
      }
    }
    if (coin.id === CME_SCRAPING_COINS[CME_SCRAPING_COINS.length - 1]) {
      console.log('Closing browser')
      await page?.close()
      await browser?.close()
      console.log('Closed browser')
    }
    try {
      await sql.begin(async sql => {
        await sql`UPDATE "Coin" SET "openInterest" = ${openInterest}, "fundingRate" = ${fundingRate}, "futuresVolume24h" = ${futuresVolume24h} WHERE id = ${coin.id}`
        await sql`INSERT INTO "CoinTime" ("coinId", "date", "time", "timeframe", "openInterest", "fundingRate", "futuresVolume24h") VALUES (${coin.id}, ${now}, ${now}, '1h', ${openInterest}, ${fundingRate}, ${futuresVolume24h})`
      });
    } catch(e) {
      console.log(coin.id, openInterest, fundingRate, futuresVolume24h)
      console.error(e)
      Sentry.captureException(e, {
        extra: {
          coinId: coin.id,
          openInterest,
          fundingRate,
          futuresVolume24h,
          now,
        },
      });
    }
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
