import { Layout, Row } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import subWeeks from 'date-fns/subWeeks';
import isSameDay from 'date-fns/isSameDay/index.js';
import Head from 'next/head'

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

export default function TodaysTrends({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">Today&apos;s Trends - CoinRotator</title>
        <meta name="description" key="description" content="Unlock the power of cryptocurrency trading with CoinRotator's Today's Trends Table. Spot new trade conditions and identify the strongest and weakest coins in the market. Stay informed with the latest trends and maximize your success."/>
      </Head>
      <PageHeader title="Today's Trends" explainer={`## Identifying New Trends Today

Today's Trends table lists all coins that have shifted from one trade status to another, indicating whether they are in an UPtrend or DOWNtrend or have gone neutral with a HODL status. By monitoring this information, traders can identify the strongest and weakest coins in the market and make informed investment decisions.

## Build A Watchlist for Easy Tracking

Advanced traders can use the Today's Trends screener to build a [watchlist of coins](https://coinrotator.app/watchlist) that are in the strongest or weakest trends right now.

By clicking on the star next to the coin, they can save these coins in their watchlist for easy tracking over time.

This allows traders to monitor changes in the market and identify potential opportunities for buying or selling.

## Creating a Long-Short Basket for Advanced Trading

For those who are comfortable with derivatives trading, the **Today's Trends** screener can be used to create a long-short basket. This involves taking a long position in the strongest trends and a short position in the weakest trends, with the goal of profiting from the spread between the two.

**Additional Advanced strategies for use with the CoinRotator Screener**

 - Use trailing stop-loss orders to maximize profits and minimize
   losses.
 - Apply position sizing strategies such as the Kelly    criterion to
   optimize risk management.
 - Monitor market sentiment through social media and news sources to
   identify potential catalysts that could affect trends.
 - Consider using options at [Binance](https://coinrotator.app/binance-screener) or Deribit to hedge against potential losses or to benefit from high volatility in the market.`} />
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['trendLength']}
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
    let yesterdaysOhcls = coinData.ohlcs.filter(ohlc => !isSameDay(ohlc.closeTime, yesterday))
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    yesterdaysOhcls = convertToDailySignals(yesterdaysOhcls)
    const [dailyTrends, dailySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, false)
    const [_yesterdayTrends, yesterdaySuperSuperTrend] = getTrends(yesterdaysOhcls, defaultAtrPeriods, defaultMultiplier)
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
      yesterdaySuperSuperTrend,
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
  coinsData = coinsData.filter((coinData) => coinData.todaySuperSuperTrend !== coinData.yesterdaySuperSuperTrend)
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      exchangeData,
      appData
    }
  }
}