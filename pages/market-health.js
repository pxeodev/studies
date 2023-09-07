import { Layout, Card } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import { useContext } from 'react'
import subDays from 'date-fns/subDays';
import addDays from 'date-fns/addDays';
import Head from 'next/head';
import groupBy from 'lodash/groupBy.js';
import countBy from 'lodash/countBy.js';

import { DarkModeContext } from '../layouts/screener.js';
import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import MarketHealthChart from '../components/MarketHealthChart';
import { signals, SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import useBreakPoint from '../hooks/useBreakPoint';
import supersupertrend from '../utils/supersupertrend.mjs';
import prisma from "../lib/prisma.mjs"
import styles from "../styles/market-health.module.less"

const { Content } = Layout;

export default function MarketHealth({ historicDailySuperSuperTrends, appData }) {
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  return (
    <>
      <Head>
        <title key="title">Market Health</title>
        <meta name="description" key="description" content="Assess cryptocurrency total trend status with CoinRotator Market Health Screener. Identify strong markets, predict reversals, and inspect trend totals."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Market Health" explainer={`The CoinRotator **Market Health Screener** assesses the top 1000+ coins, including BTC and ETH, and measures their trend.

The screener categorizes coins as being in an UpTrend against BTC and ETH or a DownTrend against them. Coins in a mixed trend status are considered HODL.

The Market Health trend measures the total health of the trend in one direction or the other.

## Assessing Trend Status

The Market Health Screener can help traders assess the status of a trend. If the largest percentage of coins is in an UpTrend, the Market Health will show this with the color yellow. If the largest percentage of coins is in a Downtrend, it will show this with the color red. If the trend is indecisive, the color blue will be shown above the other two conditions, indicating a HODL trend status.

## Extreme Warning

The screener also has a Market Health Extreme warning. If there are more than 600 trends in one of these states, it's a good indication that the current trend state is getting stale or overheated, and a reversal is imminent. This warning can help to generate caution for fresh screener trends, and traders can reduce their exposure or take smaller positions to minimize losses when trend alerts are issued.

## Predicting Market Reversals

The CoinRotator Market Health Screener is a tool that can identify not just individual coin trends, but also signal potential market reversals. If there are more than 600 coins in one direction (UpTrend or DownTrend), it may indicate that the current trend is becoming overheated and a reversal is possible. This can help traders exercise caution when dealing with today's [fresh screener trends](https://coinrotator.app/todays-trends) and potentially reduce losses by taking smaller positions or reducing exposure.

## Inspect Trend Totals

The graph allows traders to hover over the trend totals each day and determine which trends are strongest or weakest, both visually and numerically. This can help traders stay informed about market trends and make informed decisions about their investments in cryptocurrencies.`} />
      <Content className={baseStyles.container}>
        <Card className={styles.marketHealthCard}>
          <MarketHealthChart
            historicDailySuperSuperTrends={historicDailySuperSuperTrends}
            screens={screens}
            darkMode={darkMode}
          />
        </Card>
      </Content>
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
    }
  }
  let coins
  if (process.env.NODE_ENV === 'development') {
    coins = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coins = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  let historicDailySuperSuperTrends = []
  const dateFormatter = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' })
  for (let i = 0, date = yesterday; i < 30; i++) {
    let superTrends = await prisma.superTrend.findMany({
      select: {
        coinId: true,
        trend: true,
        date: true
      },
      where: {
        coinId: {
          in: coins.map(c => c.id)
        },
        date: date,
        flavor: SUPERTREND_FLAVOR.coinrotator,
        weekly: false
      }
    })
    superTrends = groupBy(superTrends, 'coinId')
    const supersupertrends = Object.values(superTrends).flatMap((trends) => supersupertrend(trends.map(t => t.trend)))

    for (const trend of [signals.buy, signals.hodl, signals.sell]) {
      historicDailySuperSuperTrends.push({
        date,
        amount: countBy(supersupertrends, (st) => st === trend).true,
        trend
      })
    }

    date = subDays(date, 1)
  }
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.reverse()
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.map((historicalDataPoint) => {
    historicalDataPoint.date = dateFormatter.format(addDays(historicalDataPoint.date, 1))

    return historicalDataPoint
  })

  return {
    props: {
      appData,
      historicDailySuperSuperTrends
    }
  };
}