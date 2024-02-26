import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import prisma from '../lib/prisma.mjs'
import { overrideCoinCategories } from '../utils/categories.mjs';
import findMatchingDropstabUrl from '../utils/findMatchingDropstabUrl.mjs';
import retry from '../utils/retry.mjs';

puppeteer.use(StealthPlugin())

const fetchCoinData = async (url, coin, page) => {
  console.log('Fetch dropstab data for', coin.symbol, 'from', url);
  await retry(
    () => page.goto(url, {waitUntil: 'domcontentloaded'}),
    3
  )

  let launch_date_start
  let [
    is404,
    categories,
    launch_roi_usd,
    launch_roi_btc,
    launch_roi_eth,
  ] = await page.evaluate(() => {
    let data = []
    const is404 = window.find('Error 404')
    data.push(is404)

    if (!is404) {
      const tagsList = Array.from(document.querySelectorAll('h4'))?.find(node => node.innerText === 'Tags')?.nextSibling
      if (tagsList) {
        const tags = Array.from(tagsList.querySelectorAll('li') || []).map(x => x.innerText)
        data.push(tags)
      } else {
        data.push([])
      }

      const roiSection = Array.from(document.querySelectorAll('span'))?.find((span => span.innerText.includes("ROI since ICO")))?.nextSibling
      if (roiSection) {
        const currencySections = Array.from(roiSection.querySelectorAll('div'))
        const rois = currencySections.map((currencySection) => {
          const roi = Number(currencySection.firstChild.innerText.replace('x', ''))
          return isNaN(roi) ? null : roi
        })
        const usdRoi = rois[0]
        const btcRoi = rois[1]
        const ethRoi = rois[2]
        data.push(usdRoi, btcRoi, ethRoi)
      }
    }
    return data
  });

  categories = await overrideCoinCategories(coin.name, coin.symbol, categories)

  if (is404) {
    console.log(coin, 'not found on dropstab')
    return
  } else {
    await retry(
      () => page.goto(`${url}/fundraising`, {waitUntil: 'domcontentloaded'}),
      3
    )
    launch_date_start = await page.evaluate(() => {
      const launchDateSection = Array.from(document.querySelectorAll('dt')).find(node => node.innerText === 'Trade Launch Date')
      if (launchDateSection) {
        return launchDateSection.nextSibling.innerText
      } else {
        return null
      }
    })
  }

  launch_date_start = isNaN(Date.parse(launch_date_start)) ? null : new Date(launch_date_start)
  await prisma.coin.update({
    where: {
      id: coin.id
    },
    data: {
      launch_date_start,
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
      }
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