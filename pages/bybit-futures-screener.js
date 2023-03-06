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

export default function ByBitFuturesScreener({ coinsData, appData, exchangeData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData, true)
  return (
    <>
      <Head>
        <title key="title">Bybit Futures Screener</title>
        <meta name="description" key="description" content="Explore the exciting world of Bybit futures trading with CoinRotator's screener. Discover strong trends and trade alts on high leverage without KYC."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="ByBit Futures screener" explainer={`Bybit is a newer exchange that models itself as a one-stop exchange in the tradition of [Binance](https://coinrotator.app/binance-screener).

Its futures screener on CoinRotator sorts the strongest trends on the Bybit futures exchange.

Bybit offers no-KYC leverage trading, enabling traders from jurisdictions where futures trading has been banned to trade alts on high leverage. Known for blowing out stops and heavy open interest against the trend, Bybit is one of the most exciting places in crypto to trade these days. However, be very wary as liquidity can be an issue at times.

## Bybit Futures Screener Capabilities

 - Daily updates on the trend status of all Bybit-listed coins
 - Sorting options based on market cap and derivatives market availability (check table below).

## Strategies to Consider on Bybit Futures

 - Hedge your positions with coin-margined or USDT-margined features on Bybit -
 - Deposit your coins to leverage larger positions (they offer margin on most major coins you deposit)
 - Use a pair trade strategy to reduce downside risk

However, it's important to note that these are advanced **Bybit Futures strategies** and can be risky. It's crucial to do your own research and carefully consider your investment strategy before making any decisions. As with all trading, there are inherent risks involved, so be sure to practice proper position sizing and keep leverage to a minimum.`}/>
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['derivatives', 'exchanges']}
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
  coinsData = coinsData.filter((coinData) => {
    return coinData.derivatives?.some((derivative) => {
      return derivative.market === 'Bybit'
    })
  })
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