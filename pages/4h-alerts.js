import { Layout, Row, Table, Tag } from 'antd';
import Head from 'next/head'
import { useHydrated } from "react-hydration-provider";
import { useRouter } from 'next/router'
import slugify from 'slugify';
import { useCallback } from 'react';
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import prisma from "../lib/prisma.mjs";
import useVirtualTable from '../hooks/useVirtualTable';
import { dailySuperSuperTrend, marketCap, dailySuperSuperTrendStreak, weeklySuperSuperTrend } from '../utils/sharedColumns';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals } from '../utils/variables';
import chunkedPromiseAll from '../utils/chunkedPromiseAll.mjs'
import { getSuperTrends } from '../utils/getTrends.mjs'
import { SUPERTREND_FLAVOR } from '../utils/variables.mjs'

import tableStyles from '../styles/table.module.less'
import coinTableStyles from '../styles/table.module.less';

export default function FourHourAlerts({ alerts, appData }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const isHoverable = useIsHoverable()
  const onCellClick = useCallback((record) => {
    return {
      onClick: () => router.push(`/coin/${slugify(record.coin.name)}`)
    }
  }, [router])
  const columns = [
    {
      title: 'Coin',
      dataIndex: 'name',
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.coin.name.localeCompare(b.coin.name),
      onCell: onCellClick,
      render: (name, alert) => {
        return (
          <Link href={`/coin/${alert.id}`} className={coinTableStyles.coin} passHref>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={alert.image} alt={name} className={coinTableStyles.image} loading="lazy"/>
            <span className={coinTableStyles.name}>{name}</span>
            <span className={coinTableStyles.symbol}>{alert.symbol}</span>
          </Link>
        );
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable, false, 'fourHourTrend'),
      title: 'Trend',
      onCell: onCellClick
    },
    {
      title: 'Timestamp',
      width: 120,
      onCell: onCellClick,
      dataIndex: 'timestamp',
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      defaultSortOrder: 'descend',
      render: (timestamp) => {
        return `${formatDistanceToNowStrict(new Date(timestamp))} ago`
      }
    },
    {
      title: 'Categories',
      width: 350,
      dataIndex: 'categories',
      render: (categories) => {
        return categories.map((category) => {
          const categorySlug = slugify(category);
          return (
            <Link href={`/category/${categorySlug}`} key={category} prefetch={false}>
              <Tag>{category}</Tag>
            </Link>
          );
        });
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable),
    },
    {
      width: 90,
      ...dailySuperSuperTrendStreak(router, isHoverable),
    },
    {
      width: 100,
      ...weeklySuperSuperTrend(router, isHoverable),
    },
    {
      width: 130,
      ...marketCap(router, hydrated)
    }
  ]
  return (
    <>
      <Head>
        <title key="title">4h Alerts</title>
        <meta name="description" key="description" content="4h Alerts as seen on our Discord"/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="4h Discord Alerts" />
      <Layout.Content className={baseStyles.container}>
        <Row className={indexStyles.tableRow}>
          <Table
            columns={columns}
            dataSource={alerts}
            rowClassName={tableStyles.row}
            pagination={{ position: ['none', 'none'], pageSize: 1000 }}
            className={tableStyles.table}
            {...useVirtualTable()}
          />
        </Row>
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();
  const alerts = await prisma.FourHourTrends.findMany();
  let coinSymbols = new Set()
  for (const alert of alerts) {
    coinSymbols.add(alert.coinSymbol.toLowerCase())
  }
  let coins = await prisma.Coin.findMany({
    where: {
      symbol: {
        in: [...coinSymbols]
      }
    },
    select: {
      id: true,
      name: true,
      symbol: true,
      categories: true,
      images: true,
      marketCap: true,
      categories: true
    }
  })
  coins = await chunkedPromiseAll(coins, 5, async (coinData) => {
    const [_dailyTrends, dailySuperSuperTrend, dailySuperSuperTrendStreak] = await getSuperTrends(coinData.id)
    const [_weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })
    const [_dailyClassicTrends, dailyClassicSuperSuperTrend, dailyClassicSuperSuperTrendStreak] = await getSuperTrends(coinData.id, { flavor: SUPERTREND_FLAVOR.classic })
    const [_weeklyClassicTrends, weeklyClassicSuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true, flavor: SUPERTREND_FLAVOR.classic })

    return {
      ...coinData,
      dailySuperSuperTrend,
      weeklySuperSuperTrend,
      dailyClassicSuperSuperTrend,
      weeklyClassicSuperSuperTrend,
      dailySuperSuperTrendStreak,
      dailyClassicSuperSuperTrendStreak,
    }
  })
  const alertsToDelete = []
  for (const [i, alert] of alerts.entries()) {
    const coin = coins.find(coin => coin.symbol.toLowerCase() === alert.coinSymbol.toLowerCase())
    if (!coin) {
      alertsToDelete.push(i)
      continue;
    }
    alert.name = coin.name
    alert.categories = coin.categories
    alert.image = coin.images.small
    alert.id = coin.id
    alert.marketCap = coin.marketCap
    alert.dailySuperSuperTrend = coin.dailySuperSuperTrend
    alert.weeklySuperSuperTrend = coin.weeklySuperSuperTrend
    alert.dailyClassicSuperSuperTrend = coin.dailyClassicSuperSuperTrend
    alert.weeklyClassicSuperSuperTrend = coin.weeklyClassicSuperSuperTrend
    alert.dailySuperSuperTrendStreak = coin.dailySuperSuperTrendStreak
    alert.dailyClassicSuperSuperTrendStreak = coin.dailyClassicSuperSuperTrendStreak
    switch (alert.trend) {
      case 'BULL':
      case 'MEAN REV BULL':
        alert.fourHourTrend = signals.buy
        break;
      case 'BEAR':
      case 'MEAN REV BEAR':
        alert.fourHourTrend = signals.sell
        break;
      default:
        alert.fourHourTrend = signals.hodl
    }
  }
  for (const i of alertsToDelete.reverse()) {
    alerts.splice(i, 1)
  }

  return {
    props: {
      alerts,
      appData
    }
  }
}