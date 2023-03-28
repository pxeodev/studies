import { Row, Layout } from 'antd'
import Head from 'next/head'

import CoinTable from '../components/CoinTable';
import PageHeader from '../components/PageHeader';
import TableFilters from '../components/TableFilters'
import { SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import prisma from '../lib/prisma.mjs'
import globalData from '../lib/globalData';
import { getSuperTrends } from '../utils/getTrends.mjs'
import chunkedPromiseAll from '../utils/chunkedPromiseAll.mjs'
import useTableFilters from '../hooks/useTableFilters';

import indexStyles from '../styles/index.module.less'

export async function getStaticProps() {
  const appData = await globalData();
  const coinQuery = {
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      symbol: true,
      name: true,
      images: true,
      marketCap: true,
      marketCapRank: true,
      categories: true,
      tickers: true,
      derivatives: true,
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    const [_dailyTrends, dailySuperSuperTrend, dailySuperSuperTrendStreak] = await getSuperTrends(coinData.id)
    const [_weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })
    const [_dailyClassicTrends, dailyClassicSuperSuperTrend, dailyClassicSuperSuperTrendStreak] = await getSuperTrends(coinData.id, { flavor: SUPERTREND_FLAVOR.classic })
    const [_weeklyClassicTrends, weeklyClassicSuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true, flavor: SUPERTREND_FLAVOR.classic })

    const exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    return {
      ...coinData,
      dailySuperSuperTrend,
      weeklySuperSuperTrend,
      dailyClassicSuperSuperTrend,
      weeklyClassicSuperSuperTrend,
      dailySuperSuperTrendStreak,
      dailyClassicSuperSuperTrendStreak,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValue: Number(coinData.fullyDilutedValue),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      exchanges
    }
  })
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      exchangeData,
      appData
    }
  }
}

export default function Home({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)

  return (
    <>
      <Head>
        <title key="title">Screener - CoinRotator</title>
        <meta name="description" key="description" content={`Find early trends with Coinrotator's powerful coin screener, featuring proprietary tracking and valuable metrics. Use it as a tool to stay informed and make smart investments in the dynamic crypto market.`}/>
      </Head>
      <PageHeader
        lastUpdated={appData.lastUpdated}
        title="Crypto&apos;s Best Coin Screener"
        explainer={`## Identify Early Trends: CoinRotator's Proprietary Method
Coinrotator is the ultimate crypto trend analysis tool designed to help you identify early trends before the masses catch on. With its proprietary method, Coinrotator tracks all coins against Bitcoin (BTC), Ethereum (ETH), and Tether (USDT) to signal an uptrend when a coin is on the rise against all three or a downtrend when it is weaker against them. This gives traders a valuable edge in assessing investment opportunities and taking advantage of trends early on.

## CoinRotator Screener Table

This screener table is a treasure trove of data that allows traders to filter the top 1000 coins in the crypto market by various metrics, including market capitalization, exchange, derivatives, and trend freshness. By utilizing CoinRotator's capabilities, traders can save hours of time tracking coins with strong momentum, allowing them to focus on making smart trades and investments in the crypto market.

## Latest Daily Trends

The screener page showcases all of the trend changes each day on the web app, providing an up-to-date overview of the latest trends in the crypto market. If you're only interested in the freshest daily trends, you can easily navigate to that specific page instead. Whether you're an experienced trader or new to the world of cryptocurrency, CoinRotator's screener has got you covered.

## Use CoinRotator as a Tool, Not a Standalone System

 It's important to remember that CoinRotator is a tool and should not be relied on as a standalone system. It's best used in conjunction with other market analysis tools to help make informed decisions.
 However, with its powerful trend analysis capabilities, extensive data offerings, and user-friendly platform, CoinRotator can provide valuable insights to help traders stay ahead of the curve in the ever-changing world of cryptocurrency.

**CoinRotator screener page** is a useful resource for those interested in staying up-to-date with the latest trends in the crypto market. It showcases all the trend changes each day on the web app, and if you're only interested in the freshest daily trends, you can navigate to [Today's trends](https://coinrotator.app/todays-trends) to catch the first day indicatons of a new trend. But we warned, these are not the most stable trends, but when they are correct it provides the highest r:r of any trends.`}
      />
      <Layout.Content className={indexStyles.container}>
        {/* For quick alerts */}
        {/* <Alert message={<span>Win 100 USDT. Please answer our <b>super brief</b> CoinRotator <a href='https://docs.google.com/forms/d/e/1FAIpQLSdaAbzeWl0wUMSnE3RZZEyX-MxqE9XOnVSCyWXg3Gcpv-rzdg/viewform' target='_blank' rel='noreferrer'>survey</a>.</span>} type="info" closable className={indexStyles.message}/> */}
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
        />
        <Row className={indexStyles.tableRow}>
          <CoinTable
            coinsData={coinsData}
            exchangeData={exchangeData}
            marketCapMax={formState.marketCapMax}
            marketCapMin={formState.marketCapMin}
            trendLengthMin={formState.trendLengthMin}
            trendLengthMax={formState.trendLengthMax}
            portfolio={formState.portfolio}
            category={formState.category}
            trendType={formState.trendType}
            defaultCategory={defaultFormState.category}
            exchanges={formState.exchanges}
            derivatives={formState.derivatives}
            showDerivatives={formState.showDerivatives}
            superTrendFlavor={formState.superTrendFlavor}
          />
        </Row>
      </Layout.Content>
    </>
  );
}
