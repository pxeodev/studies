import classnames from 'classnames';
import { Card, Table, Space, Button, Radio, Typography } from 'antd';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router'

import coinStyles from '../styles/coin.module.less';
import variableStyles from '../styles/variables.module.less'
import { cleanupExchangeLink } from '../utils/cleanupLinks';

const { Title } = Typography;
const EXCHANGE_FILTER = {
  'all': 'All',
  'spot': 'Spot',
  'dex': 'DEX',
  'derivatives': 'Derivatives'
}

const TradeTab = ({ coin, screens, shown }) => {
  const router = useRouter();
  const [exchangeFilter, setExchangeFilter] = useState(EXCHANGE_FILTER.all)
  const [isLoading, setLoading] = useState(true)
  const [tickers, setTickers] = useState([])
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/coin-tickers?id=${coin.id}`)
      const { tickers } = await res.json()
      setTickers(tickers)
      setLoading(false)
    }
    fetchData()
  }, [coin.id])
  useEffect(() => {
    if (router.isReady) {
      let routerFilter = router.query.filter
      if (Object.values(EXCHANGE_FILTER).indexOf(routerFilter) === -1) {
        routerFilter = EXCHANGE_FILTER.all
      }
      setExchangeFilter(routerFilter)
    }
  }, [router])
  const clickFilter = useCallback((activeFilter) => {
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        filter: activeFilter
      }
    }, null, { shallow: true })
  }, [router])

  const notation = screens.sm ? 'standard' : 'compact'
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })

  let tableData;
  switch(exchangeFilter) {
    case EXCHANGE_FILTER.all:
      tableData = tickers;
      break;
    case EXCHANGE_FILTER.spot:
      tableData = tickers.filter(ticker => ticker.centralized && !ticker.derivative);
      break;
    case EXCHANGE_FILTER.dex:
      tableData = tickers.filter(ticker => !ticker.centralized && !ticker.derivative);
      break;
    case EXCHANGE_FILTER.derivatives:
      tableData = tickers.filter(ticker => ticker.derivative);
      break;
  }

  const isServer = typeof window === 'undefined';
  const columns = []
  const exchangeColumn = {
    title: 'Exchange',
    dataIndex: 'name',
    render: (name, data) => {
      const tradeLink = cleanupExchangeLink(data.tradeLink, data.baseSymbol)
      return (
        <Space className={coinStyles.marketSpace}>
          <b>{name}</b>
          {tradeLink ? (
            <a href={tradeLink} target="_blank" rel="noopener noreferrer">
              <Button type="primary" style={{ backgroundColor: variableStyles.primaryColor }} >Trade</Button>
            </a>) : <></>
          }

        </Space>
      )
    }
  }
  if (!screens.sm) {
    exchangeColumn.width = 200
  }
  columns.push(exchangeColumn)
  columns.push({
    title: 'Pair',
    dataIndex: 'pair',
    render: (pair) => {
      if (!pair.includes('/')) {
        return pair
      }
      const [base, quote] = pair.split('/')
      return <span>{base}&nbsp;&nbsp;<b>/</b>&nbsp;&nbsp;{quote}</span>
    }
  })
  if (screens.md || isServer) {
    columns.push({
      title: '24h volume',
      dataIndex: 'volume',
      sorter: (a, b) => a.volume - b.volume,
      sortOrder: 'descend',
      render: (volume) => volume ? currencyFormatter.format(volume) : null
    })
  }

  return (
    <Card.Grid
      hoverable={false}
      className={classnames(coinStyles.section, coinStyles.sectionTrade)}
      style={{ display: shown ? 'block' : 'none' }}
    >
      <Title
        level={3}
        id="markets"
        className={classnames(coinStyles.title, coinStyles.marketTitle)}
      >
        {coin.symbol.toUpperCase()} Markets
      </Title>
      <Radio.Group
        optionType="button"
        onChange={(e) => clickFilter(e.target.value) }
        value={exchangeFilter}
        className={coinStyles.marketFilter}
      >
        {Object.keys(EXCHANGE_FILTER).map((filterKey) => {
          const value = EXCHANGE_FILTER[filterKey]
          return (
            <Radio.Button
              key={filterKey}
              value={value}
            >{value}</Radio.Button>
          )
        })}
      </Radio.Group>
      <Table
        isLoading={isLoading}
        columns={columns}
        dataSource={tableData}
        pagination={{ position: ['none', 'none'], pageSize: 1000 }}
        bordered
        className={coinStyles.marketTable}
      />
    </Card.Grid>
  )
}

export default TradeTab;