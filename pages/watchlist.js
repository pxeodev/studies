import { Table, Row, Col, Layout } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Client } from 'react-hydration-provider';
import axios from 'axios'

import { getWatchListCoins } from '../utils/watchlist'
import globalData from '../lib/globalData';

import styles from '../styles/watchlist.module.less'
import indexTableStyles from '../styles/indexTable.module.less'

const { Content } = Layout;

export async function getStaticProps() {
  const appData = await globalData()
  return {
    props: {
      appData
    }
  }
}

export default function WatchList() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter()

  useEffect(() => {
    let watchlistCoins = router.query.watchlist
    if (!watchlistCoins?.length) {
      watchlistCoins = getWatchListCoins()
    }
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        watchlist: watchlistCoins
      }
    }, null, { shallow: true })

    const fetchData = async () => {
      const coins = (await axios.get('/api/watchlist', { params: { coins: watchlistCoins } })).data.coins;

      setWatchlist(coins)
      setLoading(false)
    }

    fetchData()
  }, [router])

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
  ]

  return (
    <Content className={styles.container}>
      <Row className={styles.table}>
        <Col span={24}>
          <Client>
            <Table
              columns={columns}
              dataSource={watchlist}
              pagination={false}
              loading={loading}
            />
          </Client>
        </Col>
      </Row>
    </Content>
  );
}
