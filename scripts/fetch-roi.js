import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import puppeteer from 'puppeteer';

import prisma from '../lib/prisma'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// TODO: Copy this function over to dropstab.js and use it there
const findMatchingCoinId = async (symbol, name) => {
  symbol = symbol.toLowerCase();
  let matchingCoin;
  const matchingCoinsBySymbol = await prisma.coin.findMany({
    where: { symbol },
    select: {
      id: true,
      symbol: true,
      name: true,
      marketCap: true,
    }
  });

  // TODO: Sometimes the symbol doesn't seem to match the coingecko symbol???

  // Symbols can be used by multiple coins, so we need to find the coin heuristically in some cases
  if (matchingCoinsBySymbol.length > 1) {
    // TODO: We need to find the best match by name string comparison
    // Find a library for that
    // Find examples to try this on
    matchingCoin = matchingCoinsBySymbol[0];
  } else {
    matchingCoin = matchingCoinsBySymbol[0];
  }

  console.log(symbol)
  return matchingCoin.id;
}

const fetchRoi = async () => {
  let browser;
  const transaction = Sentry.startTransaction({
    op: "Fetch ROI",
    name: "Fetch ROI Transaction",
  });
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://dropstab.com/ico-roi', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for the next button to become interactive

    const data = [];
    let hasNextPage = true;
    let currentPage = 1;

    while (hasNextPage) {
      console.log('Scraping page #', currentPage);
      const pageData = await page.$$eval('table tbody tr', (rows) => {
        const data = [];
        for (const row of rows) {
          const symbolElement = row.querySelector('td:nth-child(3) .uppercase');
          const symbol = symbolElement.innerText;
          const name = symbolElement.nextSibling.innerText;
          const usd = Number(row.querySelector('td:nth-child(7)').innerText.replace('x', '').trim());
          const eth = Number(row.querySelector('td:nth-child(8)').innerText.replace('x', '').trim());
          const btc = Number(row.querySelector('td:nth-child(9)').innerText.replace('x', '').trim());
          data.push({
            symbol,
            name,
            usd,
            eth,
            btc,
          })
        }

        return data;
      });

      data.push(...pageData)

      const nextPage = await page.$('[aria-label="Next page"]');
      if (nextPage) {
        await nextPage.click();
        currentPage++;
        await page.waitForFunction(
          (currentPage) => {
            const params = new URLSearchParams(window.location.search);
            return params.get('p') == currentPage;
          },
          {},
          currentPage
        )
      } else {
        hasNextPage = false
      }
    }

    for (const coinData of data) {
      const matchingCoinId = await findMatchingCoinId(coinData.symbol, coinData.name);
      await prisma.coin.update({
        where: { id: matchingCoinId },
        data: {
          launch_roi_usd: coinData.usd,
          launch_roi_eth: coinData.eth,
          launch_roi_btc: coinData.btc,
        }
      })
    }
  } catch (error) {
    console.log(error)
    Sentry.captureException(error);
    throw(error)
  } finally {
    browser?.close();
    transaction.finish();
  }
}

fetchRoi()