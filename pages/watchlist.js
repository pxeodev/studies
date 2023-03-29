import { Table, Layout } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Client, useHydrated } from 'react-hydration-provider'
import axios from 'axios'
import compact from 'lodash/compact'
import classnames from 'classnames'
import Head from 'next/head'

import globalData from '../lib/globalData'
import prisma from '../lib/prisma.mjs'
import { getWatchListCoins } from '../utils/watchlist'
import PageHeader from '../components/PageHeader'
import useIsHoverable from '../hooks/useIsHoverable'
import useVirtualTable from '../hooks/useVirtualTable'
import { dailySuperSuperTrend, dailySuperSuperTrendStreak, weeklySuperSuperTrend, marketCap, exchanges } from '../utils/sharedColumns'

import coinTableStyles from '../styles/coinTable.module.less'
import watchlistStyles from '../styles/watchlist.module.less'

export async function getStaticProps() {
  const appData = await globalData()
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      appData,
      exchangeData
    }
  }
}

const getWatchListFromUrl = (urlPath) => {
  if (!urlPath.includes('?watchlist')) return []
  return new URLSearchParams(urlPath.split('?')[1]).getAll('watchlist')
}

export default function WatchList({ exchangeData, appData }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter()
  const isHoverable = useIsHoverable()
  const hydrated = useHydrated()

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
  }, [])

  const columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'name',
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.coins.name.localeCompare(b.coins.name),
      render: (name, coin) => {
        return (
          (<Link href={`/coin/${coin.id}`} className={coinTableStyles.coin} passHref>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.images.small} alt={name} className={coinTableStyles.image} loading="lazy"/>
            <span className={coinTableStyles.name}>{name}</span>
            <span className={coinTableStyles.symbol}>{coin.symbol}</span>
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
    {
      width: 120,
      ...exchanges(router, isHoverable, exchangeData),
    }
  ]

  return (
    <>
      <Head>
        <title key="title">Crypto Watchlist - CoinRotator</title>
        <meta name="description" key="description" content="Create a personalized watchlist with CoinRotator's Watchlist tool. Track daily and weekly trends of the top 1000 coins in crypto, compare their strength, and monitor the market health."/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title="Crypto Watchlist - CoinRotator" explainer={`### How to Use The Watchlist
Stay up-to-date on the daily and weekly trends of the top 1000 coins in crypto. Add coins to your watchlist by clicking the star icon, and keep a close eye on their strength or weakness.

### Track and Monitor Your Favorite Coins

Select coins of importance based on the recent narrative surrounding their connection to other coins in the same category, coins you own, or coins that you should keep an eye on for a reversal. Keep a close eye on extreme trend readings, coins with too many days in an uptrend or downtrend, and more.

### Measure the Relative Strength of Coins in a Sector

Compare the relative strength or weakness of all coins in a sector by tracking them in your watchlist. Gain valuable insights into which coins are performing well and which ones to avoid.

### Check the Trend Status of Coins in Your Portfolio

Keep track of the trend status of coins in your portfolio by adding them to your watchlist. Quickly and easily see if your coins are gaining strength or losing strength, and make informed decisions about when to buy, hold, or sell.

### General Market Health

If you're unsure about the trend status of the coins in your watchlist, you can check the general health of the market using CoinRotator's [Market Health indicator](https://coinrotator.app/market-health). This tool allows you to see whether the market is strong or weak and whether buying weakness in a range or selling strength in a range is preferable.

### Coins Stay in Your Watchlist Until You Remove Them

Coins will stay in your watchlist until you remove them by clicking the star icon next to the ticker. With CoinRotator's Watchlist, you have full control over the coins you want to track and monitor.`}/>
      <Layout.Content className={watchlistStyles.container}>
        <Client>
          <Table
            columns={columns}
            dataSource={watchlist}
            pagination={false}
            loading={loading}
            className={classnames(coinTableStyles.table, watchlistStyles.table)}
            rowClassName={coinTableStyles.row}
            {...useVirtualTable()}
          />
        </Client>
      </Layout.Content>
    </>
  );
}
