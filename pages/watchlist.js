import { Table, Row, Col, Layout } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Client, useHydrated } from 'react-hydration-provider'
import axios from 'axios'

import globalData from '../lib/globalData'
import { getWatchListCoins } from '../utils/watchlist'
import PageHeader from '../components/PageHeader'
import useIsHoverable from '../hooks/useIsHoverable'
import useVirtualTable from '../hooks/useVirtualTable'
import { dailySuperSuperTrend, weeklySuperSuperTrend, marketCap, exchanges } from '../utils/sharedColumns'

import indexTableStyles from '../styles/indexTable.module.less'
import watchlistStyles from '../styles/watchlist.module.less'

const { Content } = Layout;

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

export default function WatchList({ exchangeData }) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter()
  const isHoverable = useIsHoverable()
  const hydrated = useHydrated()

  useEffect(() => {
    let watchlistCoins = router.query.watchlist
    if (!watchlistCoins?.length) {
      watchlistCoins = getWatchListCoins()
    }

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

    fetchData()
  }, [])

  const columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'name',
      sorter: (a, b) => a.coins.name.localeCompare(b.coins.name),
      render: (name, coin) => {
        return (
          (<Link href={`/coin/${coin.id}`} className={indexTableStyles.coin} passHref>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coin.images.small} alt={name} className={indexTableStyles.image} loading="lazy"/>
            <span className={indexTableStyles.name}>{name}</span>
            <span className={indexTableStyles.symbol}>{coin.symbol}</span>
          </Link>)
        );
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable),
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
      <PageHeader title="Watchlist" />
      <Content className={watchlistStyles.container}>
        <Row className={watchlistStyles.table}>
          <Col span={24}>
            <Client>
              <Table
                columns={columns}
                dataSource={watchlist}
                pagination={false}
                loading={loading}
                {...useVirtualTable()}
              />
            </Client>
          </Col>
        </Row>
      </Content>
    </>
  );
}
