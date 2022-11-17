import { init, startTransaction, captureException } from '@sentry/node';
import * as Tracing from '@sentry/tracing'
import puppeteer from 'puppeteer';

import prisma from '../lib/prisma.mjs'
import findMatchingCoinDropstab from '../utils/findMatchingCoinDropstab.mjs';

init({
  dsn: process.env.SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const fetchCoinData = async (url, coin, page) => {
  console.log('Fetch launch data for', coin.symbol);
  await page.goto(url, {waitUntil: 'domcontentloaded'});

  let [launch_roi_usd, launch_roi_btc, launch_roi_eth, launch_price, launch_date_start, launch_date_end] = await page.evaluate(() => {
    const icoAndRoiSection = Array.from(document.querySelectorAll('h3'))?.find((h3 => h3.innerText.includes("ROI since ICO")))?.nextSibling
    const roiSection = icoAndRoiSection?.firstChild
    const icoSection = icoAndRoiSection?.lastChild

    if (roiSection || icoSection) {
      const currencySections = Array.from(roiSection.querySelectorAll('div'))
      const rois = currencySections.map((currencySection) => {
        const roi = Number(currencySection.firstChild.innerText.replace('x', ''))
        return isNaN(roi) ? null : roi
      })
      const usdRoi = rois[0]
      const btcRoi = rois[1]
      const ethRoi = rois[2]

      const sections = Array.from(icoSection.querySelectorAll('div'))
      const launchPriceSection = sections[1]
      const launchDateSection = sections[2]
      let launchPrice = launchPriceSection.lastChild.innerText.replace('$', '').replace(',', '').trim();
      if (isNaN(launchPrice)) { launchPrice = null }

      const launchDate = launchDateSection.lastChild.innerText.split(' - ')

      return [usdRoi, btcRoi, ethRoi, launchPrice, launchDate[0], launchDate[1]]
    } else {
      return [null, null, null, null, null, null]
    }
  })

  launch_date_start = Date.parse(launch_date_start);
  launch_date_start = isNaN(launch_date_start) ? null : new Date(launch_date_start);
  launch_date_end = Date.parse(launch_date_end);
  launch_date_end = isNaN(launch_date_end) ? null : new Date(launch_date_end);

  await prisma.coin.update({
    where: {
      id: coin.id
    },
    data: {
      launch_price,
      launch_date_start,
      launch_date_end,
      launch_roi_usd,
      launch_roi_btc,
      launch_roi_eth
    }
  })
}

const getDropsTabData = async (browser) => {
  const page = await browser.newPage();
  await page.goto('https://dropstab.com/', {waitUntil: 'domcontentloaded'});

  const data = [];
  let hasNextPage = true;
  let currentPage = 1;

  while (hasNextPage) {
    console.log('Scraping page #', currentPage);
    const pageData = await page.$$eval('table tbody td:nth-child(3)', (elements) => {
      const data = [];
      for (const element of elements) {
        const url = element.querySelector('a').href;
        const symbolElement = element.querySelector('.uppercase')
        const symbol = symbolElement.innerText;
        const name = symbolElement.nextSibling.innerText;
        data.push({
          url,
          symbol,
          name
        })
      }

      return data;
    });

    data.push(...pageData)

    const nextPage = await page.$('[aria-label="Next page"]');
    if (nextPage) {
      currentPage++;
      await page.goto(`https://dropstab.com?p=${currentPage}`, {waitUntil: 'domcontentloaded'});
    } else {
      hasNextPage = false
    }
  }

  await page.close();

  return data
}

const dropsTab = async () => {
  let browser
  try {
    browser = await puppeteer.launch();
    const dropsTabData = await getDropsTabData(browser);

    const page = await browser.newPage();
    for (const dropsData of dropsTabData) {
      const coin = await findMatchingCoinDropstab(dropsData.symbol, dropsData.name);
      if (coin) {
        await fetchCoinData(dropsData.url, coin, page);
      }
    }
  } catch(e) {
    throw(e)
  } finally {
    browser?.close();
  }
}

const weekly = async () => {
  const transaction = startTransaction({
    op: "Weekly",
    name: "Weekly",
  });
  try {
    await dropsTab()
  } catch (error) {
    console.log(error)
    captureException(error);
    throw(error)
  } finally {
    transaction.finish();
  }
}

weekly()