import { Layout, Row, Table } from 'antd';
import Head from 'next/head'
import { useHydrated } from "react-hydration-provider";
import { useRouter } from 'next/router'
import slugify from 'slugify';
import classnames from 'classnames';
import { useCallback } from 'react';

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import { getSuperTrends } from '../utils/getTrends.mjs'
import chunkedPromiseAll from '../utils/chunkedPromiseAll.mjs'
import prisma from "../lib/prisma.mjs";
import useVirtualTable from '../hooks/useVirtualTable';
import mode from '../utils/mode';
import { dailySuperSuperTrend, weeklySuperSuperTrend, marketCap } from '../utils/sharedColumns';
import useIsHoverable from '../hooks/useIsHoverable';

import tableStyles from '../styles/table.module.less'

export default function Categories({ categoryData, appData }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const isHoverable = useIsHoverable()
  const onCellClick = useCallback((record) => {
    return {
      onClick: () => router.push(`/category/${slugify(record.name)}`)
    }
  }, [router])
  // TODO: Fix default sorting
  const columns = [
    {
      title: 'Category',
      dataIndex: 'name',
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.name.localeCompare(b.name),
      onCell: onCellClick
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable),
      onCell: onCellClick
    },
    {
      width: 100,
      ...weeklySuperSuperTrend(router, isHoverable),
      onCell: onCellClick
    },
    {
      width: 100,
      ...marketCap(router, hydrated),
      onCell: onCellClick
    },
    {
      title: 'Top coins',
      width: 200,
      dataIndex: 'coins',
      render: (coins) => {
        return coins.map((coin) => {
          // eslint-disable-next-line @next/next/no-img-element
          return <img
            src={coin.image}
            alt={coin.name}
            title={coin.name}
            loading="lazy"
            key={coin.name}
            onClick={() => router.push(`/coin/${coin.id}`)}
            className={classnames(tableStyles.image, tableStyles.clickableTag)}
          />
        })
      }
    }
  ]
  return (
    <>
      <Head>
        <title key="title">Categories</title>
        <meta name="description" key="description" content="Discover all categories and their trends on CoinRotator."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Categories" />
      <Layout.Content className={baseStyles.container}>
        <Row className={indexStyles.tableRow}>
          <Table
            columns={columns}
            dataSource={categoryData}
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
  const coinQuery = {
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      name: true,
      images: true,
      marketCap: true,
      marketCapRank: true,
      categories: true,
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    const [_dailyTrends, dailySuperSuperTrend, _dailySuperSuperTrendStreak] = await getSuperTrends(coinData.id)
    const [_weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })

    return {
      ...coinData,
      dailySuperSuperTrend,
      weeklySuperSuperTrend,
    }
  })
  const categoryData = []
  for (const coin of coinsData) {
    coin.image = coin.images.small
    delete coin.images
    for (const category of coin.categories) {
      const categoryIndex = categoryData.findIndex(cat => cat.name === category)
      if (categoryIndex === -1) {
        categoryData.push({
          name: category,
          slug: slugify(category),
          coins: [coin]
        })
      } else {
        categoryData[categoryIndex].coins.push(coin)
      }
    }
  }
  for (const category of categoryData) {
    category.dailySuperSuperTrend = mode(category.coins.map(coin => coin.dailySuperSuperTrend))
    category.weeklySuperSuperTrend = mode(category.coins.map(coin => coin.weeklySuperSuperTrend))
    category.marketCap = category.coins.reduce((acc, coin) => acc + Number(coin.marketCap), 0)
    category.coins = category.coins.sort((a, b) => a.marketCapRank - b.marketCapRank).slice(0, 5)
  }
  return {
    props: {
      categoryData,
      appData
    }
  }
}