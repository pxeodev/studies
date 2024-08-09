import { Table, Layout } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Client, useHydrated } from 'react-hydration-provider'
import axios from 'axios'
import compact from 'lodash/compact'
import classnames from 'classnames'
import Head from 'next/head'
import { gql } from '@urql/core'
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs'

import globalData from '../lib/globalData'
import { getWatchListCoins } from '../utils/watchlist'
import PageHeader from '../components/PageHeader'
import useIsHoverable from '../hooks/useIsHoverable'
import useVirtualTable from '../hooks/useVirtualTable'
import { dailySuperSuperTrend, dailySuperSuperTrendStreak, weeklySuperSuperTrend, marketCap } from '../utils/sharedColumns'
import strapi from '../utils/strapi';
import useSocketStore from '../hooks/useSocketStore'

import tableStyles from '../styles/table.module.less'
import watchlistStyles from '../styles/watchlist.module.less'

export async function getStaticProps() {
  const appData = await globalData()
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
      slug: 'watchlist',
    }
  )
  data = data.pages.data[0].attributes
  return {
    props: {
      appData,
      pageData: data
    }
  }
}

const getWatchListFromUrl = (urlPath) => {
  if (!urlPath.includes('?watchlist')) return []
  return new URLSearchParams(urlPath.split('?')[1]).getAll('watchlist')
}

export default function WatchList({ appData, pageData }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocketStore(state => state.socket)
  const router = useRouter()
  const isHoverable = useIsHoverable()
  const hydrated = useHydrated()
  const [trends, setTrends] = useState(null)

  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_trends', {
        flavor: SUPERTREND_FLAVOR.coinrotator
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
  useEffect(() => {
    let watchlistCoins = getWatchListFromUrl(router.asPath)
    if (!watchlistCoins.length) {
      watchlistCoins = getWatchListCoins()
    }
    watchlistCoins = compact(watchlistCoins)

    const fetchData = async () => {
      let coins = (await axios.get('/api/watchlist', { params: { coins: watchlistCoins } })).data.coins;
      coins = coins.map(coin => {
        return {
          ...coin,
          key: coin.id,
        }
      })

      setWatchlist(coins)
      router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          watchlist: watchlistCoins
        }
      }, null, { shallow: true })
      setLoading(false)
    }

    if (!watchlistCoins.length) {
      setLoading(false)
    } else {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'name',
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, coin) => {
        return (
          (<Link href={`/coin/${coin.id}`} className={tableStyles.coin} passHref>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.images.small} alt={name} className={tableStyles.image} loading="lazy"/>
            <span className={tableStyles.name}>{name}</span>
            <span className={tableStyles.symbol}>{coin.symbol}</span>
          </Link>)
        );
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable),
      defaultSortOrder: 'ascend'
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
      width: 100,
      ...marketCap(router, hydrated),
    },
  ]
  const tableData = watchlist.map(coin => {
    const dailyTrend = trends?.daily?.[coin.id]
    const weeklyTrend = trends?.weekly?.[coin.id]
    if (dailyTrend) {
      coin.dailySuperSuperTrend = dailyTrend.supersuperTrend.trend
      coin.dailySuperSuperTrendStreak = dailyTrend.supersuperTrend.streak
      coin.weeklySuperSuperTrend = weeklyTrend.supersuperTrend.trend
    }
    return coin
  })

  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
      <Layout.Content className={watchlistStyles.container}>
        <Client>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            loading={loading}
            className={classnames(tableStyles.table, watchlistStyles.table)}
            rowClassName={tableStyles.row}
            {...useVirtualTable()}
          />
        </Client>
      </Layout.Content>
    </>
  );
}
