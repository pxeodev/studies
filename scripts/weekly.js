import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

import sql from '../lib/database.mjs'
import { overrideCoinCategories, createCategoriesPromptInLangfuse } from '../utils/categories.mjs';
import findMatchingDropstabUrl from '../utils/findMatchingDropstabUrl.mjs';
import retry from '../utils/retry.mjs';

puppeteer.use(StealthPlugin())

const fetchCoinData = async (url, coin, page) => {
  console.log('Fetch dropstab data for', coin.symbol, 'from', `${url}`);
  await retry(() => page.goto(`${url}`, { waitUntil: 'domcontentloaded' }), 5)
  const is404 = await page.evaluate(() => window.find('Error 404'))
  if (is404) {
    console.log(coin, 'not found on dropstab')
    return
  }

  let categories = [];
  let launch_date_start, launch_roi_usd, launch_roi_btc, launch_roi_eth;

  try {
    await page.waitForSelector('ul[aria-label="Tags"]', { timeout: 3000 })
  } catch(e) {}
  const hasTags = await page.evaluate(() => {
    const tagsList = Array.from(document.querySelectorAll('ul'))?.find(node => node.ariaLabel === 'Tags')
    tagsList?.lastChild?.firstChild?.click()
    return Boolean(tagsList)
  })

  if (hasTags) {
    await page.waitForSelector('section[aria-modal="true"]')

    categories = await page.evaluate(() => {
      const tagsList = document.querySelectorAll('section[aria-modal="true"] a')
      if (tagsList?.length) {
        return Array.from(tagsList || []).map(x => x.innerText)
      } else {
        return null
      }
    })
  }

  categories = await overrideCoinCategories(coin.name, coin.symbol, categories)

  const hasRoiSection = await page.evaluate(() => {
    let roiSection = Array.from(document.querySelectorAll('h3'))?.find((title => title.innerText.includes("Fundraising")))
    roiSection = roiSection?.parentElement?.nextElementSibling
    return Boolean(roiSection)
  })

  if (hasRoiSection) {
    const result = await page.evaluate(() => {
      const data = {};
      let roiSection = Array.from(document.querySelectorAll('h3'))?.find((title => title.innerText.includes("Fundraising")))
      roiSection = roiSection?.parentElement?.nextElementSibling
      const currencySections = Array.from(roiSection.firstChild.firstChild.children)
      const rois = currencySections.map((currencySection) => {
        const roi = Number(currencySection.firstChild.innerText.replace('x', ''))
        return isNaN(roi) ? null : roi
      })
      data.usdRoi = rois[0]
      data.btcRoi = rois[1]
      data.ethRoi = rois[2]
      return data
    })
    launch_roi_usd = result.usdRoi
    launch_roi_btc = result.btcRoi
    launch_roi_eth = result.ethRoi

    // Unclear which date to use for the correct ROI
    // await retry(() => page.goto(`${url}/fundraising`), 5)

    // const hasIcoSection = await page.evaluate(() => {
    //   const icoSection = Array.from(document.querySelectorAll('h2'))?.find((title => title.innerText.includes("Fundraising")))?.nextSibling
    //   icoSection?.querySelector('button')?.click()
    //   return Boolean(icoSection)
    // })

    // if (hasIcoSection) {
    //   launch_date_start = await page.evaluate(() => {
    //     const icoTitle = Array.from(document.querySelectorAll('h2')).find(title => title.innerText.includes("ICO"));
    //     const icoMetaSection = icoTitle?.parentElement?.nextElementSibling;
    //     if (icoMetaSection) {
    //       return icoMetaSection.firstChild?.innerText;
    //     }

    //     return null;
    //   });
    // }

    // launch_date_start = isNaN(Date.parse(launch_date_start)) ? null : new Date(launch_date_start)
  }

  console.log(coin.id, coin.name, coin.symbol, launch_date_start, launch_roi_usd, launch_roi_btc, launch_roi_eth, categories)
  await sql`UPDATE "Coin" SET "launch_date_start" = ${launch_date_start ?? null}, "launch_roi_usd" = ${launch_roi_usd ?? null}, "launch_roi_btc" = ${launch_roi_btc ?? null}, "launch_roi_eth" = ${launch_roi_eth ?? null}, "categories" = ${categories ?? null} WHERE id = ${coin.id}`
}

const dropsTab = async () => {
  let browser, page
  try {
    browser = await puppeteer.launch({
      timeout: 100000,
      headless: 'new'
    });
    const coins = await sql`SELECT id, name, symbol FROM "Coin"`

    page = await browser.newPage();
    console.log('Opened browser')
    for (const coin of coins) {
      const url = await findMatchingDropstabUrl(coin);
      await fetchCoinData(url, coin, page);
    }
    console.log('Done')
  } catch(e) {
    console.error(e)
    throw(e)
  } finally {
    console.log('Closing browser')
    await page?.close();
    await browser?.close();
    console.log('Closed browser')
    process.exit(0)
  }
}

const weekly = async () => {
  await dropsTab()

  if (process.env.NODE_ENV === 'production') {
    try {
      const promptResult = await createCategoriesPromptInLangfuse();
      console.log('Langfuse categories prompt created:', promptResult?.id || promptResult);
    } catch (e) {
      console.error('Failed to create categories prompt in Langfuse:', e);
    }
  }
}

weekly()