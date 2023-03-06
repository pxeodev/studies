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

export default function SolanaScreener({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">Solana Screener</title>
        <meta name="description" key="description" content="Discover the latest trends on Solana with CoinRotator's screener. Filter by trend streak 1-5 and learn to trade with proper position sizing."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Solana screener" explainer={`Discover the Latest Trends on Solana Screener

The Solana blockchain has a high TPS but is not without growing pains. Despite this, many notable protocols on Solana offer huge percentage moves.

CoinRotator's screener effectively alerts you to new trends on Solana but it's fraught with controversy these days.

If you are looking for a high volatility environment on a centralized exchange, Bybit an provide excellent leverage opportunities without the uncertainty of trading on a new chain with multiple and frequent outages.  [check out the Bybit futures screener](https://coinrotator.app/bybit-futures-screener)

## Filter by Trend Streak 1-5
- Filtering by trend streak  to the fastest setting will catch the freshest trends.

## Other Ways to Use Solana Screener

Here are additional ways to use the screener:
- Look for coins with high trading volume for liquidity
- Pay attention to the market cap to avoid thinly traded coins
- Check for coins that recently formed uptrends with trend streaks of 1-5 Remember, trading carries inherent risk, so practice proper position sizing and minimize leverage.

While CoinRotator's screener can help inform your trades, it's still essential to conduct your own research and make wise investment decisions, never go full ape on any one trade.`} />
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
    },
    where: {
      categories: {
        hasSome: 'Solana Ecosystem'
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
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      exchangeData,
      appData
    }
  }
}