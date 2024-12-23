import { Layout, Row, Table, Tag } from 'antd';
import Head from 'next/head'
import { useHydrated } from "react-hydration-provider";
import { useRouter } from 'next/router'
import slugify from 'slugify';
import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';
import { gql } from '@urql/core'

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import useVirtualTable from '../hooks/useVirtualTable';
import { dailySuperSuperTrend, marketCap, dailySuperSuperTrendStreak, weeklySuperSuperTrend } from '../utils/sharedColumns';
import useIsHoverable from '../hooks/useIsHoverable';
import useSocketStore from '../hooks/useSocketStore';
import strapi from '../utils/strapi';

import tableStyles from '../styles/table.module.less'
import coinTableStyles from '../styles/table.module.less';

export default function FourHourAlerts({ appData, pageData }) {
  const [alerts, setAlerts] = useState([])
  const router = useRouter()
  const hydrated = useHydrated()
  const isHoverable = useIsHoverable()
  const socket = useSocketStore(state => state.socket)
  const [trends, setTrends] = useState(null)
  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_trends', {
        flavor: SUPERTREND_FLAVOR.coinrotator,
        intervals: ['1d', '1w']
      }, (trends) => setTrends(trends))
    }
  }, [socket])
  useEffect(() => {
    const fetchAlerts = async () => {
      const res = await fetch('/api/4h-alerts')
      const { alerts } = await res.json()
      setAlerts(alerts)
    }
    fetchAlerts()
  }, [])
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
  const onCellClick = useCallback((record) => {
    return {
      onClick: () => router.push(`/coin/${slugify(record.coin.name)}`)
    }
  }, [router])
  const columns = [
    {
      title: 'Coin',
      dataIndex: 'name',
      width: 200,
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
      title: 'Trend (4h)',
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
    }
  ]
  const tableData = alerts.map(alert => {
    return {
      ...alert,
      dailySuperSuperTrend: trends?.daily[alert.id]?.supersuperTrend?.trend,
      dailySuperSuperTrendStreak: trends?.daily[alert.id]?.supersuperTrend?.streak,
      weeklySuperSuperTrend: trends?.weekly[alert.id]?.supersuperTrend?.trend,
      weeklySuperSuperTrendStreak: trends?.weekly[alert.id]?.supersuperTrend?.streak,
    }
  })
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
      slug: '4h-alerts',
    }
  )
  data = data.pages.data[0].attributes

  return {
    props: {
      appData,
      pageData: data,
    }
  }
}