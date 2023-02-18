import { Layout, Card } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import { useContext } from 'react'
import subDays from 'date-fns/subDays';
import isEqualDate from 'date-fns/isEqual';
import subWeeks from 'date-fns/subWeeks';

import { DarkModeContext } from './_app';
import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import MarketHealthChart from '../components/MarketHealthChart';
import { signals, defaultAtrPeriods, defaultMultiplier } from '../utils/variables.mjs'
import useBreakPoint from '../hooks/useBreakPoint';
import convertToDailySignals from '../utils/convertToDailySignals';
import getTrends from '../utils/getTrends.mjs'
import prisma from "../lib/prisma.mjs"

const { Content } = Layout;

export default function MarketHealth({ historicDailySuperSuperTrends }) {
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  return (
    <>
      <PageHeader title="Market Health" />
      <Content className={baseStyles.container}>
        <Card>
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
            gte: subWeeks(yesterday, 15)
          }
        },
        orderBy: { closeTime: 'asc' }
      }
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
    for (const trend of [signals.buy, signals.hodl, signals.sell]) {
      historicDailySuperSuperTrends.push({
        date,
        amount: 0,
        trend
      })
    }
    date = subDays(date, 1)
  }
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.reverse()
  for (const coin of coins) {
    for (let i = 0, date = yesterday; i < 30; i++) {
      const dateOhlcs = coin.ohlcs.filter(ohlc => ohlc.closeTime.getTime() <= date.getTime())
      const dateDailyOhlcs = convertToDailySignals(dateOhlcs)
      const [_dailyTrends, dateSuperSuperTrend] = getTrends(dateDailyOhlcs, defaultAtrPeriods, defaultMultiplier, false)
      const historicIndex = historicDailySuperSuperTrends.findIndex((historicDataPoint) => {
        return isEqualDate(historicDataPoint.date, date) && historicDataPoint.trend === dateSuperSuperTrend
      })
      historicDailySuperSuperTrends[historicIndex].amount++

      date = subDays(date, 1)
    }
  }
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.map((historicalDataPoint) => {
    historicalDataPoint.date = dateFormatter.format(historicalDataPoint.date)

    return historicalDataPoint
  })

  return {
    props: {
      appData,
      historicDailySuperSuperTrends
    }
  };
}