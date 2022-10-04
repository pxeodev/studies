import classnames from 'classnames';
import { Table, Space, Button, Typography } from 'antd';

import coinStyles from '../styles/coin.module.less';
import cleanupExchangeLink from '../utils/cleanupExchangeLink';

const { Title } = Typography;

const TradeTab = ({ coin, screens }) => {
  const notation = screens.sm ? 'standard' : 'compact'
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })
  const tableData = coin.tickers.map((ticker, index) => {
    const baseSymbol = ticker.base.toUpperCase()
    const quoteSymbol = ticker.target.toUpperCase()
    return {
      index: index + 1,
      name: ticker.market.name,
      tradeLink: ticker.trade_url,
      volume: ticker.volume,
      baseSymbol: baseSymbol,
      pair: `${baseSymbol}/${quoteSymbol}`,
      trustScore: ticker.trust_score,
    }
  })

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
              <Button type="primary">Trade</Button>
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
      render: (volume) => currencyFormatter.format(volume)
    })
    columns.push({
      title: 'Trust score',
      dataIndex: 'trustScore',
      render: (trustScore) => {
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
    <>
      <Title
          level={2}
          id="markets"
          className={classnames(coinStyles.title, coinStyles.marketTitle)}
        >
          {coin.symbol.toUpperCase()} Markets
        </Title>
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={{ position: ['none', 'none'], pageSize: 1000 }}
          bordered
          className={coinStyles.marketTable}
        />
    </>
  )
}

export default TradeTab;