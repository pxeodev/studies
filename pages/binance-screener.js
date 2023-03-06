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

export default function BinanceScreener({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">Binance Screener</title>
        <meta name="description" key="description" content="Stay up-to-date with Binance-listed coins using CoinRotator's daily and weekly screener. Sort by marketcap and identify trends on Binance to inform your investment decisions."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Binance screener" explainer={`Tracking trends on Binance with CoinRotator's screener can help inform your decisions on using spot or derivatives insturments.

Here are some features and strategies to consider:

## Binance Screener Capabilities

- Daily updates for all Binance-listed coins' trend status
- Sorting options based on marketcap and derivatives market availability

## Strategies to Consider

- Hedge your spot positions with coin margined or usdt margin features on Binance
- Deposit your spot or stable coins to leverage larger positions.
- Use a pair trade strategy to buy strong coins and short coins of equal value to reduce downside risk

However, it's important to note that these are advanced [Binance Futures](https://coinrotator.app/binance-futures-screener)  strategies and can be risky.

It's crucial to do your own research and carefully consider your investment strategy before making any decisions, as it's easy to get into losing positions on both sides of the trade.`}/>
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
    return coin.exchanges.some((exchange) => exchange[0] === 'Binance')
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