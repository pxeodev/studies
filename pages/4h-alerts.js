import { Layout, Row, Table } from 'antd';
import Head from 'next/head'
import { useHydrated } from "react-hydration-provider";
import { useRouter } from 'next/router'
import slugify from 'slugify';
import { useCallback } from 'react';
import Link from 'next/link'

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import prisma from "../lib/prisma.mjs";
import useVirtualTable from '../hooks/useVirtualTable';
import { dailySuperSuperTrend, marketCap } from '../utils/sharedColumns';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals } from '../utils/variables';

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
  const dateFormatter = new Intl.DateTimeFormat([], { day: 'numeric', month: 'numeric', hour: 'numeric', minute: 'numeric' })
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
      ...dailySuperSuperTrend(router, isHoverable),
      title: 'Trend',
      onCell: onCellClick
    },
    {
      title: 'Timestamp',
      width: 150,
      onCell: onCellClick,
      dataIndex: 'timestamp',
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      defaultSortOrder: 'descend',
      render: (timestamp) => {
        return dateFormatter.format(new Date(timestamp))
      }
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
  const coins = await prisma.Coin.findMany({
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
      marketCap: true
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
    switch (alert.trend) {
      case 'BULL':
      case 'MEAN REV BULL':
        alert.dailySuperSuperTrend = signals.buy
        break;
      case 'BEAR':
      case 'MEAN REV BEAR':
        alert.dailySuperSuperTrend = signals.sell
        break;
      default:
        alert.dailySuperSuperTrend = signals.hodl
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