import { Layout, Row, Table } from 'antd';
import Head from 'next/head'
import { useHydrated } from "react-hydration-provider";
import { useRouter } from 'next/router'
import slugify from 'slugify';
import classnames from 'classnames';
import { useCallback, useState, useEffect } from 'react';
import { gql } from '@urql/core'
import pick from 'lodash/pick';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';

import baseStyles from '../../styles/base.module.less'
import indexStyles from '../../styles/index.module.less'
import globalData from '../../lib/globalData';
import PageHeader from '../../components/PageHeader'
import sql from "../../lib/database.mjs";
import useVirtualTable from '../../hooks/useVirtualTable';
import { dailySuperSuperTrend, weeklySuperSuperTrend, marketCap, dailySuperSuperTrendStreak, weeklySuperSuperTrendStreak } from '../../utils/sharedColumns';
import useIsHoverable from '../../hooks/useIsHoverable';
import useSocketStore from '../../hooks/useSocketStore';
import strapi from 'coinrotator-utils/strapi.mjs'

import tableStyles from '../../styles/table.module.less'

export default function Categories({ categoryData, appData, pageData }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const isHoverable = useIsHoverable()
  const onCellClick = useCallback((record) => {
    return {
      onClick: () => router.push(`/category/${slugify(record.name)}`)
    }
  }, [router])
  const socket = useSocketStore(state => state.socket)
  const [trends, setTrends] = useState(null)
  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_category_trends', {
        flavor: SUPERTREND_FLAVOR.coinrotator,
      }, (trends) => setTrends(trends))
    }
  }, [socket])
  useEffect(() => {
    console.log('useeffect fetch trends')
    fetchTrends()
  }, [fetchTrends])
  useEffect(() => {
    if (socket) {
      socket.on('new_trends', fetchTrends)
    }
    return () => {
      if (socket) {
        socket.off('new_trends')
      }
    }
  }, [socket, fetchTrends])
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
      defaultSortOrder: 'ascend',
      onCell: onCellClick
    },
    {
      width: 90,
      ...dailySuperSuperTrendStreak(router, isHoverable),
      onCell: onCellClick
    },
    {
      width: 100,
      ...weeklySuperSuperTrend(router, isHoverable),
      onCell: onCellClick
    },
    {
      width: 150,
      ...weeklySuperSuperTrendStreak(router, isHoverable),
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
  let tableData = categoryData.map((category) => {
    if (trends) {
      const matchingDailyCategory = trends.daily?.[category.name] || trends['1d']?.[category.name]
      const matchingWeeklyCategory = trends.weekly?.[category.name] || trends['1w']?.[category.name]
      category.dailySuperSuperTrend = matchingDailyCategory?.trend
      category.dailySuperSuperTrendStreak = matchingDailyCategory?.streak
      category.weeklySuperSuperTrend = matchingWeeklyCategory?.trend
      category.weeklySuperSuperTrendStreak = matchingWeeklyCategory?.streak
    }

    return category
  })
  tableData = tableData.filter(category => !trends || category.dailySuperSuperTrend)
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
      <Layout.Content className={baseStyles.container}>
        <Row className={indexStyles.tableRow}>
          <Table
            columns={columns}
            dataSource={tableData}
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
  let { data } = await strapi.query(
    gql`
      query Pages($slug: String) {
        pages(filters: {slug: {eq: $slug}}) {
          data {
            attributes {
              title
              metaTitle
              metaDescription
              content
            }
          }
        }
      }
    `,
    {
      slug: 'categories',
    }
  )
  data = data.pages.data[0].attributes
  let coinsData = await sql`
    SELECT id, name, images, "marketCap", "marketCapRank", categories, "coingeckoCategories"
    FROM "Coin"
    ORDER BY "marketCapRank" ASC
    LIMIT ${process.env.NODE_ENV === 'development' ? 20 : 1000}
  `
  const categoryData = []
  for (const coin of coinsData) {
    coin.image = coin.images.small
    delete coin.images
    coin.categories ||= []
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
    for (const category of coin.coingeckoCategories) {
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
    category.marketCap = category.coins.reduce((acc, coin) => acc + Number(coin.marketCap), 0)
    category.coins = category.coins.sort((a, b) => a.marketCapRank - b.marketCapRank).slice(0, 5)
    category.coins = category.coins.map(coin => pick(coin, ['id', 'name', 'image']))
  }
  return {
    props: {
      categoryData,
      appData,
      pageData: data
    }
  }
}