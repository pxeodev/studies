import { Layout, Card } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import { useContext } from 'react'
import subDays from 'date-fns/subDays';
import addDays from 'date-fns/addDays';
import Head from 'next/head';
import groupBy from 'lodash/groupBy.js';
import countBy from 'lodash/countBy.js';
import { gql } from '@urql/core'

import { DarkModeContext } from '../layouts/screener.js';
import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import MarketHealthChart from '../components/MarketHealthChart';
import { signals, SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import useBreakPoint from '../hooks/useBreakPoint';
import supersupertrend from '../utils/supersupertrend.mjs';
import prisma from "../lib/prisma.mjs"
import strapi from '../utils/strapi';

import styles from "../styles/market-health.module.less"

const { Content } = Layout;

export default function MarketHealth({ historicDailySuperSuperTrends, appData, pageData }) {
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  return (
    <>
      <Head>
        <title key="title">{pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
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
  let { data } = await strapi.query(
    gql`
      query Pages($slug: String) {
        pages(filters: {slug: {eq: $slug}}) {
          data {
            attributes {
              title
              metaDescription
              content
            }
          }
        }
      }
    `,
    {
      slug: 'market-health',
    }
  )
  data = data.pages.data[0].attributes
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
      historicDailySuperSuperTrends,
      pageData: data
    }
  };
}