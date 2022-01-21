import { Button, Breadcrumb, Card, Layout, Typography, Space, Tag, Table } from 'antd';
import Link from 'next/link'
import { TwitterOutlined, GlobalOutlined } from '@ant-design/icons';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import classnames from 'classnames';
import endOfYesterday from 'date-fns/endOfYesterday';
import endOfDay from 'date-fns/endOfDay';
import subDays from 'date-fns/subDays';

import prisma from '../../lib/prisma'
import styles from '../../styles/coin.module.css'
import { defaultAtrPeriods, defaultMultiplier, signals } from '../../utils/variables'
import getTrends from '../../utils/getTrends'
import convertToDailySignals from '../../utils/convertToDailySignals'

const { Content } = Layout;
const { Text } = Typography;

export default function Coin(coin) {
  const [_trends, superSuperTrend] = getTrends(coin.ohlcs, defaultAtrPeriods, defaultMultiplier)
  let signalTag
  switch (superSuperTrend) {
    case signals.buy:
      signalTag = <Tag color="#52C41A">Buy</Tag>
      break;
    case signals.sell:
      signalTag = <Tag color="#F5222D">Sell</Tag>
      break;
    default:
      signalTag = <Tag color="#2F54EB">HODL</Tag>
  }
  let url
  try {
    url = new URL(coin.homepage).host
  } catch(e) {}

  const tableData = coin.tickers.map((ticker, index) => {
    return {
      index: index + 1,
      name: ticker.market.name,
      tradeLink: ticker.trade_url,
      volume: ticker.volume,
      pair: `${ticker.base.toUpperCase()}/${ticker.target.toUpperCase()}`,
      trustScore: ticker.trust_score,
    }
  })

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
    },
    {
      title: 'Exchange',
      dataIndex: 'name',
      render: (name, data) => {
        return (
          <Space className={styles.exchangeSpace}>
            <b>{name}</b>
            <a href={data.tradeLink} target="_blank" rel="noopener noreferrer">
              <Button type="primary">Trade</Button>
            </a>
          </Space>
        )
      }
    },
    {
      title: 'Pair',
      dataIndex: 'pair',
    },
    {
      title: '24h volume',
      dataIndex: 'volume',
      render: (volume) => {
        return new Intl.NumberFormat([], {
          style: 'currency',
          currency: 'USD',
          currencyDisplay: 'narrowSymbol'
        }).format(volume)
      }
    },
    {
      title: 'Trust score',
      dataIndex: 'trustScore',
      render: (trustScore) => {
        const good = trustScore === 'green'
        const classNames = {
          [styles.trustScore]: true,
          [styles.trustScoreGreen]: good,
          [styles.trustScoreRed]: !good,
        }
        return <div className={classnames(classNames)} />
      }
    },
  ];

  return <Content className={styles.content}>
    <Breadcrumb className={styles.breadcrumb}>
      <Breadcrumb.Item><Link href="/">Home</Link></Breadcrumb.Item>
      <Breadcrumb.Item>{coin.name}</Breadcrumb.Item>
    </Breadcrumb>
    <Card>
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.nameCard)}>
        <Space>
          {/* // eslint-disable-next-line @next/next/no-img-element */}
          <img src={coin.images.small} width={24} height={24} alt={`${coin.name} logo`} />
          <Text className={styles.cardHeader}>{coin.name}</Text>
          <Tag>{coin.symbol.toUpperCase()}</Tag>
        </Space>
      </Card.Grid>
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.socialCard)}>
        <Space>
          <a href={`https://twitter.com/${coin.twitter}`} target="_blank" rel="noreferrer">
            <Tag icon={<TwitterOutlined />} color="#55ACEE" className={styles.linkTag}>
              @{coin.twitter}&nbsp;({new Intl.NumberFormat([], { notation: 'compact' }).format(coin.twitterFollowers)})
            </Tag>
          </a>
          { url ? (
            <a href={coin.homepage} target="_blank" rel="noreferrer">
              <Tag icon={<GlobalOutlined />} color="#262626" className={styles.linkTag}>
                {url}
              </Tag>
            </a>
          ) : <></>}
        </Space>
      </Card.Grid>
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.dataCard1)}>
        <div className={styles.labelValueGroup}>
          <div className={styles.label}>Market Cap</div>
          <Space>
            <span className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol' }).format(coin.marketCap)}</span>
            <Tag>#{coin.marketCapRank}</Tag>
          </Space>
        </div>
        <div className={styles.labelValueGroup}>
          <div className={styles.label}>All-Time High</div>
          <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 20 }).format(coin.ath)}</div>
        </div>
        <div className={styles.labelValueGroup}>
          <div className={styles.label}>All-Time Low</div>
          <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 20 }).format(coin.atl)}</div>
        </div>
      </Card.Grid>
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.dataCard2)}>
        { coin.fullyDilutedValuation ? (
          <div className={styles.labelValueGroup}>
            <div className={styles.label}>Fully Diluted Valuation</div>
            <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol' }).format(coin.fullyDilutedValuation)}</div>
          </div>
        ) : <></>}
        <div className={styles.labelValueGroup}>
          <div className={styles.label}>Circulating Supply</div>
          <div className={styles.value}>{new Intl.NumberFormat([]).format(coin.circulatingSupply)}</div>
        </div>
      </Card.Grid>
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.tagCard)}>
        <div className={styles.label}>Tags</div>
        {
          coin.categories.map(tag => <Tag key={tag}>{tag}</Tag>)
        }
      </Card.Grid>
      {
        coin.similarCoins.length ? (
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.similarCoinCard)}>
            <div className={styles.label}>Similar Coins</div>
            {
              // eslint-disable-next-line @next/next/no-img-element
              coin.similarCoins.map(coin =>
                (
                  <Link href={`/coin/${coin.id}`} key={coin.id} passHref>
                    <Tag
                      className={styles.similarCoinLink}
                      // eslint-disable-next-line @next/next/no-img-element
                      icon={<img className={styles.similarCoin} width={14} height={14} src={coin.images.thumb} alt={coin.name} />}
                      key={coin.name}
                    >
                      {coin.name}
                    </Tag>
                  </Link>
                )
              )
            }
          </Card.Grid>
        ) : <></>
      }
      <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.chartGrid)}>
        <AdvancedRealTimeChart
          autosize
          interval="D"
          symbol={`${coin.symbol.toUpperCase()}USDT`}
        >
        </AdvancedRealTimeChart>
      </Card.Grid>
    </Card>
    <Table
      columns={columns}
      dataSource={tableData}
      pagination={{ position: ['none', 'none'], pageSize: 1000 }}
      bordered
      className={styles.exchangesTable}
    />
  </Content>
}

export async function getStaticPaths() {
  const coinsData = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    take: 1000,
    select: { id: true }
  })

  return {
    paths: coinsData.map(coin => ({ params: { ...coin }}) ),
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const coinData = await prisma.coin.findUnique({
    where: {
      id: params.id,
    },
    include: { ohlcs: {
      select: {
        closeTime: true,
        open: true,
        high: true,
        low: true,
        close: true,
        quoteSymbol: true
      },
      where: {
        closeTime: {
          gte: endOfDay(subDays(new Date(), 30)),
          lte: endOfYesterday(),
        }
      },
      orderBy: { closeTime: 'desc' }
    }}
  })
  const similarCoins = await prisma.coin.findMany({
    where: {
      categories: {
        hasSome: coinData.categories
      },
      id: {
        not: coinData.id
      }
    },
    take: 10,
    select: {
      id: true,
      name: true,
      images: true,
    }
  })
  let ohlcs = coinData.ohlcs.map(ohlc => ({
    ...ohlc,
    open: Number(ohlc.open),
    high: Number(ohlc.high),
    low: Number(ohlc.low),
    close: Number(ohlc.close),
  }))
  ohlcs = convertToDailySignals(ohlcs)
  return {
    props: {
      ...coinData,
      currentPriceUsd: Number(coinData.currentPriceUsd),
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValuation: Number(coinData.fullyDilutedValuation),
      circulatingSupply: Number(coinData.circulatingSupply),
      similarCoins,
      ohlcs,
    }
  }
}