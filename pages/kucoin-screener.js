import { Layout, Row } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import subWeeks from 'date-fns/subWeeks';
import Head from 'next/head';

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import TableFilters from '../components/TableFilters'
import CoinTable from '../components/CoinTable';
import { defaultAtrPeriods, defaultMultiplier } from '../utils/variables.mjs'
import convertToDailySignals from '../utils/convertToDailySignals';
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import getTrends from '../utils/getTrends.mjs'
import useTableFilters from '../hooks/useTableFilters';
import prisma from "../lib/prisma.mjs";

export default function KucoinScreener({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">Kucoin Screener</title>
        <meta name="description" key="description" content="Explore the potential of KuCoin - a Seychelles-based crypto exchange with over 700 coins. Discover advanced strategies & features with CoinRotator."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="KuCoin screener" explainer={`KuCoin offers trading for over 700 coins, many of which are not available on other exchanges.

The exchange is primarily focused on the Asian market, as its founder is originally from China. KuCoin is registered in Seychelles, which is a common location for offshore exchanges.

If you're considering trading on KuCoin, tracking trends with CoinRotator's screener can help inform your decisions.

Here are some features and strategies to consider:

## KuCoin Screener Capabilities
 Daily updates on the trend status of all KuCoin-listed coins
 -  Sorting options based on market cap and volume

## Strategies to Consider on KuCoin

 - Hedge your positions with futures trading on KuCoin
 - Deposit your coins to leverage larger positions
 - Use a pair trade strategy to reduce downside risk.

 It's important to note that these are advanced trading strategies and can be risky. It's crucial to do your own research and carefully consider your investment strategy before making any decisions, as it's easy to end up with losing positions in crypto.

**Similiar Exchanges** - [Binance](https://coinrotator.app/?exchanges=Binance) - [Huobi](https://coinrotator.app/?exchanges=Huobi) - [Gate](https://coinrotator.app/?exchanges=Gate.io)`}/>
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['exchanges']}
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

export async function getStaticProps() {
  const appData = await globalData();
  const yesterday = endOfYesterday();
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
      ohlcs: {
        select: {
          closeTime: true,
          open: true,
          high: true,
          low: true,
          close: true,
          quoteSymbol: true
        },
        where: {
          closeTime: {
            lte: yesterday,
            gte: subWeeks(yesterday, 6)
          }
        },
        orderBy: { closeTime: 'asc' }
      }
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = coinsData.map((coinData) => {
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    const [dailyTrends, dailySuperSuperTrend, dailySuperSuperTrendStreak] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, false)
    const [weeklyTrends, weeklySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true)
    const [dailyClassicTrends, dailyClassicSuperSuperTrend] = getTrends(ohlcs, 10, 3, false)
    const [weeklyClassicTrends, weeklyClassicSuperSuperTrend] = getTrends(ohlcs, 10, 3, true)
    delete coinData.ohlcs

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
  coinsData = coinsData.filter((coin) => {
    return coin.exchanges.some((exchange) => exchange[0] === 'KuCoin')
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