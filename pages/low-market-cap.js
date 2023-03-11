import { Layout, Row } from 'antd';
import Head from 'next/head'

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import TableFilters from '../components/TableFilters'
import CoinTable from '../components/CoinTable';
import { SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import { getSuperTrends } from '../utils/getTrends.mjs'
import useTableFilters from '../hooks/useTableFilters';
import prisma from "../lib/prisma.mjs";

export default function LowMarketCap({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">Low MarketCap Screener</title>
        <meta name="description" key="description" content="Discover undervalued coins with CoinRotator's Low Marketcap screener and customize your search with options such as Supertrend, Trend, Marketcap, Exchanges, and Derivatives. Note the risks of low marketcap coins and consider market health before investing."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Low market cap coins" explainer={`**The Low Marketcap Screener** is to help you identify coins that are currently in an UPTrend or DownTrend, which can potentially lead you to undervalued coins with the potential to increase or decrease in value.

Consider the [Market Health](https://coinrotator.app/market-health). Undervalued coins tend to perform better when markets are strong. When they are weak, they tend to become less volatile and returns are reduced in both directions.

## Risk Considerations for Low Market Cap Coins

 It's important to note that investing in **low market cap coins** can be riskier due to their volatility. While these coins have the potential to increase or decrease at a much greater rate than general market, it's important to remember that the decision to invest ultimately lies with the user of CoinRotator. It's crucial to do your own research and carefully consider your investment strategy before making any decisions.

## Customization of CoinRotator

  From any page on the site, you can always deploy the customized screener and further refine your search by:
  - Supertrend Flavor: This option allows you to adjust the settings of the Supertrend, which is a popular trend-following indicator. CoinRotator's Supertrend is optimized for the crypto market and is much faster than the traditional version.
  - Trend: This option lets you screen for UpTrends, DownTrends, or Hodl status (no trend identified).
  - Marketcap: This option allows you to expand your search for higher marketcap coins, which may be less volatile and therefore less risky.
  - Exchanges: This option enables you to screen coins based on the exchange on which they are traded. This can be helpful if you prefer to invest on a particular exchange or want to diversify your portfolio across multiple exchanges.
  - [Derivatives](https://coinrotator.app/binance-fufures-screener): This option informs you which coins have leverage trading available, which can be useful if you are looking to use leverage in your investment strategy.`} />
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['marketCap']}
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
            reverseMarketCapSort
          />
        </Row>
      </Layout.Content>
    </>
  );
}

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
    },
    where: {
      marketCap: {
        lte: 100000000
      }
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = await Promise.all(
    coinsData.map(async (coinData) => {
      const [dailyTrends, dailySuperSuperTrend, dailySuperSuperTrendStreak] = await getSuperTrends(coinData.id)
      const [weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })
      const [dailyClassicTrends, dailyClassicSuperSuperTrend] = await getSuperTrends(coinData.id, { flavor: SUPERTREND_FLAVOR.classic })
      const [weeklyClassicTrends, weeklyClassicSuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true, flavor: SUPERTREND_FLAVOR.classic })

      const exchanges = convertTickersToExchanges(coinData.tickers)
      delete coinData.tickers

      return {
        ...coinData,
        dailyTrends,
        dailySuperSuperTrend,
        dailySuperSuperTrendStreak,
        weeklyTrends,
        weeklySuperSuperTrend,
        dailyClassicTrends,
        dailyClassicSuperSuperTrend,
        weeklyClassicTrends,
        weeklyClassicSuperSuperTrend,
        ath: Number(coinData.ath),
        atl: Number(coinData.atl),
        fullyDilutedValue: Number(coinData.fullyDilutedValue),
        circulatingSupply: Number(coinData.circulatingSupply),
        totalSupply: Number(coinData.totalSupply),
        exchanges
      }
    })
  )
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      exchangeData,
      appData
    }
  }
}