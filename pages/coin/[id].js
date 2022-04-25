import { Prisma } from '@prisma/client'
import { Breadcrumb, Button, Card, Layout, notification, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import Link from 'next/link'
import Head from 'next/head'
import { TwitterOutlined, GlobalOutlined, InfoCircleFilled } from '@ant-design/icons';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import classnames from 'classnames';
import endOfYesterday from 'date-fns/endOfYesterday';
import round from 'lodash/round';

import prisma from '../../lib/prisma'
import styles from '../../styles/coin.module.less'
import variables from '../../styles/variables.module.less'
import { defaultAtrPeriods, defaultMultiplier, signals } from '../../utils/variables'
import getTrends from '../../utils/getTrends'
import getChainsData from '../../utils/getChainsData'
import getPlatformData from '../../utils/getPlatformData'
import convertToDailySignals from '../../utils/convertToDailySignals'
import useBreakPoint from '../../hooks/useBreakPoint'
import BuyTag from '../../components/BuyTag'
import ContractTagAndMore from '../../components/ContractTagAndMore';
import SellTag from '../../components/SellTag'
import HodlTag from '../../components/HodlTag'
import globalData from '../../lib/globalData';
import cleanupExchangeLink from '../../utils/cleanupExchangeLink';
import useIsHoverable from '../../hooks/useIsHoverable';
import { getDescriptionByCoin } from '../../utils/coinDescriptions';

const { Content } = Layout;
const { Title } = Typography;

export default function Coin(coin) {
  let dailySignal
  let dailySignalTag
  switch (coin.dailySuperSuperTrend) {
    case signals.buy:
      dailySignal = 'UP'
      dailySignalTag = <a href="#markets"><BuyTag /></a>
      break;
    case signals.sell:
      dailySignal = 'DOWN'
      dailySignalTag = <a href="#markets"><SellTag /></a>
      break;
    default:
      dailySignal = 'HODL'
      dailySignalTag = <a href="#markets"><HodlTag /></a>
  }
  let weeklySignalTag
  switch (coin.weeklySuperSuperTrend) {
    case signals.buy:
      weeklySignalTag = <a href="#markets"><BuyTag /></a>
      break;
    case signals.sell:
      weeklySignalTag = <a href="#markets"><SellTag /></a>
      break;
    default:
      weeklySignalTag = <a href="#markets"><HodlTag /></a>
  }
  let url
  try {
    url = new URL(coin.homepage).host
  } catch(e) {}

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

  const screens = useBreakPoint();
  const isHoverable = useIsHoverable();
  const isServer = typeof window === 'undefined';

  const columns = []
  const exchangeColumn = {
    title: 'Exchange',
    dataIndex: 'name',
    render: (name, data) => {
      const tradeLink = cleanupExchangeLink(data.tradeLink, data.baseSymbol)
      return (
        <Space className={styles.exchangeSpace}>
          <b>{name}</b>
          {tradeLink ? (
            <a href={tradeLink} target="_blank" rel="noopener noreferrer">
              <Button type="primary">Trade</Button>
            </a>) : ''
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
      render: (volume) => {
        return new Intl.NumberFormat([], {
          style: 'currency',
          currency: 'USD',
          currencyDisplay: 'symbol'
        }).format(volume)
      }
    })
    columns.push({
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
    })
  }

  let circulatingSupplyPercentage
  if (coin.circulatingSupply && coin.totalSupply) {
    circulatingSupplyPercentage = round(coin.circulatingSupply / coin.totalSupply * 100, 2)
  }
  const notation = screens.sm ? 'standard' : 'compact'

  const metaTitle = `${coin.name} (${coin.symbol.toUpperCase()}) | ${dailySignal.toUpperCase()} | Daily Crypto Screener`
  const ogTitle = `${coin.name} | ${dailySignal.toUpperCase()} | ${new Intl.DateTimeFormat([], { dateStyle: 'medium' }).format(new Date())} | Coinrotator`
  const metaDescription = `Coinrotator issues a daily trend for ${coin.name}. Always be on the right side of the cryptomarket.`

  return (
    <>
      <Head>
        <title key="title">{metaTitle}</title>
        <meta name="description" key="description" content={metaDescription}/>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={coin.currentUrl} />
        <meta property="og:type" content="app" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image" content={coin.images.large} />
        <meta property="og:image:width" content="250" />
        <meta property="og:image:height" content="250" />
        <meta property="og:image:type" content="image/png" />
      </Head>
      <Content className={styles.content}>
        <Breadcrumb className={styles.breadcrumb}>
          <Breadcrumb.Item><Link href="/"><a>Home</a></Link></Breadcrumb.Item>
          <Breadcrumb.Item>{coin.name}</Breadcrumb.Item>
        </Breadcrumb>
        <Card>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.nameCard, styles.smallCard)}>
            <Space>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coin.images.small} width={24} height={24} alt={`${coin.name} logo`} />
              <Title className={styles.h1Title}>{coin.name}</Title>
              <Tag>{coin.symbol.toUpperCase()}</Tag>
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.dailyPriceCard, styles.smallCard)}>
            <Space direction="vertical">
              <Space>
                <b>Daily Trend</b>
                <Tooltip
                  placement={screens.sm ? 'bottom' : 'bottomRight'}
                  overlayClassName={styles.tooltip}
                  trigger={isHoverable ? 'hover' : 'click'}
                  title="The numbers in parenthesis indicate the trend streak - how many days a coin has been a UP or DOWN trend against ETH, BTC or USD."
                >
                  <InfoCircleFilled className={styles.signalWarning} />
                </Tooltip>
              </Space>
              <Space size={12} className={styles.trendTags} wrap>
                {dailySignalTag}
                {Object.keys(coin.dailyTrends).map((trendKey) => {
                  const trend = coin.dailyTrends[trendKey]
                  const trendText = `${trend[0]} (${trend[1]})`
                  return (
                    <Tag key={trendKey}>
                      <span className={styles.trendKey}>{trendKey.toUpperCase()}:&nbsp;</span>
                      {trendText}
                    </Tag>
                  )
                })}
              </Space>
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.weeklyPriceCard, styles.smallCard)}>
            <Space direction="vertical">
              <Space>
                <b>Weekly Trend</b>
                <Tooltip
                  placement={screens.sm ? 'bottom' : 'bottomRight'}
                  overlayClassName={styles.tooltip}
                  trigger={isHoverable ? 'hover' : 'click'}
                  title="The numbers in parenthesis indicate the trend streak - how many weeks a coin has been a UP or DOWN trend against ETH, BTC or USD."
                >
                  <InfoCircleFilled className={styles.signalWarning} />
                </Tooltip>
              </Space>
              <Space size={12} className={styles.trendTags} wrap>
                {weeklySignalTag}
                {Object.keys(coin.weeklyTrends).map((trendKey) => {
                  const trend = coin.weeklyTrends[trendKey]
                  const trendText = `${trend[0]} (${trend[1]})`
                  return (
                    <Tag key={trendKey}>
                      <span className={styles.trendKey}>{trendKey.toUpperCase()}:&nbsp;</span>
                      {trendText}
                    </Tag>
                  )
                })}
              </Space>
            </Space>
          </Card.Grid>
          {coin.description ? (
            <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.descriptionCard)}>
                {coin.description}
            </Card.Grid>
          ) : ''}
          {coin.platforms.length ? (
            <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.contractCard)}>
              <ContractTagAndMore
                images={coin.images}
                platforms={coin.platforms}
                symbol={coin.symbol}
                chainsData={coin.chainsData}
              />
            </Card.Grid>
          ) : <></>}
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.socialCard, styles.smallCard, { [styles.socialSoloCard]: !coin.platforms.length })}>
            <Space wrap>
              <a href={`https://twitter.com/${coin.twitter}`} target="_blank" rel="noreferrer">
                <Tag icon={<TwitterOutlined />} color="#55ACEE" className={styles.linkTag}>
                  @{coin.twitter}&nbsp;({new Intl.NumberFormat([], { notation: 'compact' }).format(coin.twitterFollowers)})
                </Tag>
              </a>
              { url ? (
                <a href={coin.homepage} target="_blank" rel="noreferrer">
                  <Tag icon={<GlobalOutlined />} color={variables.black} className={styles.linkTag}>
                    {url}
                  </Tag>
                </a>
              ) : <></>}
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.dataCard1)}>
            <div className={styles.labelValueGroup}>
              <Title level={3} className={styles.label}>Market Cap</Title>
              <Space wrap>
                <span className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation }).format(coin.marketCap)}</span>
                <Tag>#{coin.marketCapRank}</Tag>
              </Space>
            </div>
            <div className={styles.labelValueGroup}>
              <Title level={3} className={styles.label}>All-Time High</Title>
              <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation }).format(coin.ath)}</div>
            </div>
            <div className={styles.labelValueGroup}>
              <Title level={3} className={styles.label}>All-Time Low</Title>
              <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation }).format(coin.atl)}</div>
            </div>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.dataCard2)}>
            { coin.fullyDilutedValuation ? (
              <div className={styles.labelValueGroup}>
                <Title level={3} className={styles.label}>Fully Diluted Valuation</Title>
                <div className={styles.value}>{new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation }).format(coin.fullyDilutedValuation)}</div>
              </div>
            ) : <></>}
            <div className={styles.labelValueGroup}>
              <Title level={3} className={styles.label}>Circulating Supply</Title>
              <div className={styles.value}>
                {new Intl.NumberFormat([], { notation }).format(coin.circulatingSupply)}
                { circulatingSupplyPercentage ? ` / ${circulatingSupplyPercentage}%` : <></>}
              </div>
            </div>
            { coin.totalSupply ? (
              <div className={styles.labelValueGroup}>
                <Title level={3} className={styles.label}>Total Supply</Title>
                <div className={styles.value}>{new Intl.NumberFormat([], { notation }).format(coin.totalSupply)}</div>
              </div>
            ) : <></>}
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.tagCard)}>
            <Title level={3} className={styles.label}>Tags</Title>
            {
              coin.categories.map((tag) => {
                return (
                  <Link href={`/?category=${tag}`} key={tag}>
                    <a><Tag>{tag}</Tag></a>
                  </Link>
                );
              })
            }
          </Card.Grid>
          {
            coin.similarCoins.length ? (
              <Card.Grid hoverable={false} className={classnames(styles.cardGrid, styles.cardData, styles.similarCoinCard)}>
                <Title level={3} className={styles.label}>Similar Coins</Title>
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  coin.similarCoins.map(coin =>
                    (
                      <Link href={`/coin/${coin.id}`} key={coin.id}>
                        <a>
                          <Tag
                            className={styles.similarCoinLink}
                            // eslint-disable-next-line @next/next/no-img-element
                            icon={<img className={styles.similarCoin} width={14} height={14} src={coin.images.thumb} alt={coin.name} />}
                            key={coin.name}
                          >
                            {coin.name}
                          </Tag>
                        </a>
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
              hide_side_toolbar={!screens.sm}
              container_id={styles.coinChart}
            >
            </AdvancedRealTimeChart>
          </Card.Grid>
        </Card>
        <Title
          level={2}
          id="markets"
          className={classnames(styles.h1Title, styles.exchangeTitle)}
        >
          {coin.symbol.toUpperCase()} Markets
        </Title>
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={{ position: ['none', 'none'], pageSize: 1000 }}
          bordered
          className={styles.exchangesTable}
        />
      </Content>
    </>
  );
}

export async function getStaticPaths() {
  const coinsData = await prisma.coin.findMany({
    select: { id: true }
  })

  return {
    paths: coinsData.map(coin => ({ params: { ...coin }}) ),
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const appData = await globalData();
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
          lte: endOfYesterday(),
        }
      },
      orderBy: { closeTime: 'asc' }
    }}
  })
  let similarCoins = []
  if (coinData.categories.length) {
    similarCoins = await prisma.$queryRaw`
      SELECT id, images, name, count(*)
      FROM "Coin",
      unnest(array[${Prisma.join(coinData.categories)}]) unnested_categories
      WHERE categories @> array[unnested_categories]
      AND id != ${coinData.id}
      GROUP BY id
      ORDER BY 4 desc, 1
      LIMIT 10;
    `;
  }
  let ohlcs = coinData.ohlcs.map(ohlc => ({
    ...ohlc,
    open: Number(ohlc.open),
    high: Number(ohlc.high),
    low: Number(ohlc.low),
    close: Number(ohlc.close),
  }))
  ohlcs = convertToDailySignals(ohlcs)
  const [dailyTrends, dailySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, false)
  const [weeklyTrends, weeklySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true)
  delete coinData.ohlcs
  const description = await getDescriptionByCoin(coinData.symbol)

  const platforms = await getPlatformData(coinData.platforms, coinData.defaultPlatform)
  const chainsData = await getChainsData();
  return {
    props: {
      ...coinData,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValuation: Number(coinData.fullyDilutedValuation),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      dailyChange: Number(coinData.dailyChange),
      weeklyChange: Number(coinData.weeklyChange),
      similarCoins,
      dailyTrends,
      dailySuperSuperTrend,
      weeklyTrends,
      weeklySuperSuperTrend,
      appData,
      description,
      platforms,
      chainsData
    }
  }
}