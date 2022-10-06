import classnames from 'classnames';
import { Card, Table, Space, Button, Radio, Typography } from 'antd';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router'

import coinStyles from '../styles/coin.module.less';
import variableStyles from '../styles/variables.module.less'
import cleanupExchangeLink from '../utils/cleanupExchangeLink';

const { Title } = Typography;
const EXCHANGE_FILTER = {
  'all': 'All',
  'spot': 'Spot',
  'dex': 'DEX',
  'derivatives': 'Derivatives'
}

const TradeTab = ({ coin, screens }) => {
  const router = useRouter();
  const [exchangeFilter, setExchangeFilter] = useState(EXCHANGE_FILTER.all)
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
      tableData = coin.tickers;
      break;
    case EXCHANGE_FILTER.spot:
      tableData = coin.tickers.filter(ticker => ticker.centralized && !ticker.derivative);
      break;
    case EXCHANGE_FILTER.dex:
      tableData = coin.tickers.filter(ticker => !ticker.centralized && !ticker.derivative);
      break;
    case EXCHANGE_FILTER.derivatives:
      tableData = coin.tickers.filter(ticker => ticker.derivative);
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
  })
  if (screens.md || isServer) {
    columns.push({
      title: '24h volume',
      dataIndex: 'volume',
      sorter: (a, b) => a.volume - b.volume,
      sortOrder: 'descend',
      render: (volume) => volume ? currencyFormatter.format(volume) : null
    })
    columns.push({
      title: 'Trust score',
      dataIndex: 'trustScore',
      render: (trustScore) => {
        if (trustScore === null) { return null; }
        const good = trustScore === 'green'
        const classNames = {
          [coinStyles.marketTrustScore]: true,
          [coinStyles.marketTrustScorePositive]: good,
          [coinStyles.marketTrustScoreNegative]: !good,
        }
        return <div className={classnames(classNames)} />
      }
    })
  }

  return (
    <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionTrade)}>
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