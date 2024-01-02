import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import prisma from '../lib/prisma.mjs'
import { overrideCoinCategories } from '../utils/categories.mjs';
import findMatchingDropstabUrl from '../utils/findMatchingDropstabUrl.mjs';
import retry from '../utils/retry.mjs';

puppeteer.use(StealthPlugin())

const fetchCoinData = async (url, coin, page) => {
  console.log('Fetch dropstab data for', coin.symbol);
  await retry(
    () => page.goto(url, {waitUntil: 'domcontentloaded'}),
    3
  )

  let [
    launch_roi_usd,
    launch_roi_btc,
    launch_roi_eth,
    launch_price,
    launch_date_start,
    launch_date_end,
    categories,
    is404
  ] = await page.evaluate(() => {
    const icoAndRoiSection = Array.from(document.querySelectorAll('h3'))?.find((h3 => h3.innerText.includes("ROI since ICO")))?.nextSibling
    const roiSection = icoAndRoiSection?.firstChild
    const icoSection = icoAndRoiSection?.lastChild

    let data = [null, null, null, null, null, null]
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

      data = [usdRoi, btcRoi, ethRoi, launchPrice, launchDate[0], launchDate[1]]
    }
    const tags = Array.from(document.querySelector('ul[aria-label="Tags"]')?.querySelectorAll('li') || []).map(x => x.innerText)
    data.push(tags)
    data.push(window.find('Error 404'))
    return data
  });

  launch_date_start = Date.parse(launch_date_start);
  launch_date_start = isNaN(launch_date_start) ? null : new Date(launch_date_start);
  launch_date_end = Date.parse(launch_date_end);
  launch_date_end = isNaN(launch_date_end) ? null : new Date(launch_date_end);
  categories = await overrideCoinCategories(coin.name, coin.symbol, categories)

  if (is404) {
    console.log(coin, 'not found on dropstab')
    return
  }

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
      launch_roi_eth,
      categories
    }
  })
}

const dropsTab = async () => {
  let browser
  try {
    browser = await puppeteer.launch({
      timeout: 100000,
      headless: 'new'
    });
    const coins = await prisma.coin.findMany({
      select: {
        id: true,
        name: true,
        symbol: true,
      },
    })

    const page = await browser.newPage();
    for (const coin of coins) {
      const url = await findMatchingDropstabUrl(coin);
      await fetchCoinData(url, coin, page);
    }
  } catch(e) {
    throw(e)
  } finally {
    browser?.close();
  }
}

const weekly = async () => {
  await dropsTab()
}

weekly()