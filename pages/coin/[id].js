import { TwitterOutlined, GlobalOutlined, InfoCircleFilled } from '@ant-design/icons';
import { Breadcrumb, Button, Card, Layout, notification, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import Link from 'next/link'
import Head from 'next/head'
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import ReactMarkdown from 'react-markdown'

import endOfYesterday from 'date-fns/endOfYesterday';
import pick from 'lodash/pick';
import round from 'lodash/round';
import { useCallback } from 'react';

import UpTag from '../../components/UpTag'
import PlatformSelect from '../../components/PlatformSelect';
import DownTag from '../../components/DownTag'
import HodlTag from '../../components/HodlTag'
import { defaultAtrPeriods, defaultMultiplier, signals } from '../../utils/variables'
import getTrends from '../../utils/getTrends'
import getChainsData from '../../utils/getChainsData'
import getPlatformData from '../../utils/getPlatformData'
import convertToDailySignals from '../../utils/convertToDailySignals'
import cleanupExchangeLink from '../../utils/cleanupExchangeLink';
import { getDescriptionByCoin } from '../../utils/coinDescriptions';
import useBreakPoint from '../../hooks/useBreakPoint'
import useIsHoverable from '../../hooks/useIsHoverable';
import globalData from '../../lib/globalData';
import classnames from 'classnames';

import baseStyles from '../../styles/base.module.less'
import coinStyles from '../../styles/coin.module.less'
import variableStyles from '../../styles/variables.module.less'

const { Content } = Layout;
const { Title } = Typography;

export default function Coin(coin) {
  let dailySignal
  let dailySignalTag
  switch (coin.dailySuperSuperTrend) {
    case signals.buy:
      dailySignal = 'UP'
      dailySignalTag = <a href="#markets"><UpTag /></a>
      break;
    case signals.sell:
      dailySignal = 'DOWN'
      dailySignalTag = <a href="#markets"><DownTag /></a>
      break;
    default:
      dailySignal = 'HODL'
      dailySignalTag = <a href="#markets"><HodlTag /></a>
  }
  let weeklySignalTag
  switch (coin.weeklySuperSuperTrend) {
    case signals.buy:
      weeklySignalTag = <a href="#markets"><UpTag /></a>
      break;
    case signals.sell:
      weeklySignalTag = <a href="#markets"><DownTag /></a>
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

  let circulatingSupplyPercentage
  if (coin.circulatingSupply && coin.totalSupply) {
    circulatingSupplyPercentage = round(coin.circulatingSupply / coin.totalSupply * 100, 2)
  }
  const percentageFromAth = (coin.currentPrice / coin.ath) * 100
  const percentageFromAtl = (coin.currentPrice / coin.atl) * 100
  const priceAppreciationToAthPercentage = (coin.ath / coin.currentPrice) * 100
  const notation = screens.sm ? 'standard' : 'compact'
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })
  const preciseCurrencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation })
  const numberFormatter = new Intl.NumberFormat([], { notation })
  const compactNumberFormatter = new Intl.NumberFormat([], { notation: 'compact' })
  const today = new Date()

  const metaTitle = `${coin.name} (${coin.symbol.toUpperCase()}) | ${dailySignal.toUpperCase()} | Daily Crypto Screener`
  const ogTitle = `${coin.name} | ${dailySignal.toUpperCase()} | ${dateFormatter.format(new Date())} | Coinrotator`
  const metaDescription = `Coinrotator issues a daily trend for ${coin.name}. A coin screener that captures strong momentum in both directions!`
  const interpolatedCoinDescription = (coin.description || '')
    .replaceAll('{{ath}}', preciseCurrencyFormatter.format(coin.ath))
    .replaceAll('{{atl}}', preciseCurrencyFormatter.format(coin.atl))
    .replaceAll('{{marketcap}}', currencyFormatter.format(coin.marketCap))
    .replaceAll('{{fdv}}', currencyFormatter.format(coin.fullyDilutedValuation))
    .replaceAll('{{launchprice}}', currencyFormatter.format(coin.launch_price))
    .replaceAll('{{currentprice}}', currencyFormatter.format(coin.currentPrice))
    .replaceAll('{{percentagefromath}}', numberFormatter.format(percentageFromAth))
    .replaceAll('{{percentagefromatl}}', numberFormatter.format(percentageFromAtl))
    .replaceAll('{{circulatingsupply}}', currencyFormatter.format(coin.circulatingSupply))
    .replaceAll('{{percentagecirculatingsupply}}', numberFormatter.format(coin.circulatingSupplyPercentage))
    .replaceAll('{{totalsupply}}', numberFormatter.format(coin.totalSupply))
    .replaceAll('{{percentageappreciationtoath}}', numberFormatter.format(priceAppreciationToAthPercentage))
    .replaceAll('{{ranking}}', coin.marketCapRank)
    .replaceAll('{{day}}', today.getDate())
    .replaceAll('{{month}}', new Intl.DateTimeFormat([], { month: 'long' }).format(today))
    .replaceAll('{{year}}', today.getFullYear())

  const renderRoi = useCallback((multiple) => {
    if (multiple === null || multiple === 1 ) { return null }

    const roi = round((multiple - 1) * 100, 2);
    return <span className={roi > 0 ? coinStyles.greenRoi : coinStyles.redRoi}>{numberFormatter.format(roi)}%</span>
  }, [numberFormatter])

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
      <Content className={baseStyles.container}>
        <Breadcrumb className={baseStyles.breadcrumbs}>
          <Breadcrumb.Item><Link href="/"><a>Home</a></Link></Breadcrumb.Item>
          <Breadcrumb.Item><Link href={`/coin/${coin.id}`}><a>{coin.name}</a></Link></Breadcrumb.Item>
        </Breadcrumb>
        <Card>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionHeader, coinStyles.sectionFlex)}>
            <Space>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coin.images.small} width={24} height={24} alt={`${coin.name} logo`} />
              <Title className={coinStyles.title}>{coin.name}</Title>
              <Tag>{coin.symbol.toUpperCase()}</Tag>
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionDailyTrend, coinStyles.sectionFlex)}>
            <Space direction="vertical">
              <Space>
                <b>Daily Trend</b>
                <Tooltip
                  placement={screens.sm ? 'bottom' : 'bottomRight'}
                  overlayClassName={coinStyles.tooltip}
                  trigger={isHoverable ? 'hover' : 'click'}
                  title="The numbers in parenthesis indicate the trend streak - how many days a coin has been a UP or DOWN trend against ETH, BTC or USD. Daily updated at 7 AM UTC"
                >
                  <InfoCircleFilled className={coinStyles.signalExplainer} />
                </Tooltip>
              </Space>
              <Space size={12} className={coinStyles.trendTag} wrap>
                {dailySignalTag}
                {Object.keys(coin.dailyTrends).map((trendKey) => {
                  const trend = coin.dailyTrends[trendKey]
                  const trendText = `${trend[0]} (${trend[1]})`
                  return (
                    <Tag key={trendKey}>
                      <span className={coinStyles.trendKey}>{trendKey.toUpperCase()}:&nbsp;</span>
                      {trendText}
                    </Tag>
                  )
                })}
              </Space>
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionWeeklyTrend, coinStyles.sectionFlex)}>
            <Space direction="vertical">
              <Space>
                <b>Weekly Trend</b>
                <Tooltip
                  placement={screens.sm ? 'bottom' : 'bottomRight'}
                  overlayClassName={coinStyles.tooltip}
                  trigger={isHoverable ? 'hover' : 'click'}
                  title="The numbers in parenthesis indicate the trend streak - how many weeks a coin has been a UP or DOWN trend against ETH, BTC or USD."
                >
                  <InfoCircleFilled className={coinStyles.signalExplainer} />
                </Tooltip>
              </Space>
              <Space size={12} className={coinStyles.trendTag} wrap>
                {weeklySignalTag}
                {Object.keys(coin.weeklyTrends).map((trendKey) => {
                  const trend = coin.weeklyTrends[trendKey]
                  const trendText = `${trend[0]} (${trend[1]})`
                  return (
                    <Tag key={trendKey}>
                      <span className={coinStyles.trendKey}>{trendKey.toUpperCase()}:&nbsp;</span>
                      {trendText}
                    </Tag>
                  )
                })}
              </Space>
            </Space>
          </Card.Grid>
          {coin.description ? (
            <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionDescription)}>
                <ReactMarkdown>{interpolatedCoinDescription}</ReactMarkdown>
            </Card.Grid>
          ) : <></>}
          {coin.platforms.length ? (
            <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionContract)}>
              <PlatformSelect
                images={coin.images}
                platforms={coin.platforms}
                symbol={coin.symbol}
                chainsData={coin.chainsData}
              />
            </Card.Grid>
          ) : <></>}
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionOnline, coinStyles.sectionFlex, { [coinStyles.sectionOnlineFW]: !coin.platforms.length })}>
            <Space wrap>
              { coin.twitter ? (
                <a href={`https://twitter.com/${coin.twitter}`} target="_blank" rel="noreferrer">
                  <Tag icon={<TwitterOutlined />} color="#55ACEE" className={coinStyles.button}>
                  @{coin.twitter}&nbsp;({compactNumberFormatter.format(coin.twitterFollowers)})
                  </Tag>
                </a>
              ) : <></> }
              { url ? (
                <a href={coin.homepage} target="_blank" rel="noreferrer">
                  <Tag icon={<GlobalOutlined />} color={variableStyles.black} className={coinStyles.button}>
                    {url}
                  </Tag>
                </a>
              ) : <></>}
            </Space>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionTokenomicsHeader)}>
            <Title level={2}>{coin.name} Tokenomics</Title>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionDataC1)}>
            <div className={coinStyles.data}>
              <Title level={3} className={coinStyles.label}>Market Cap</Title>
              <Space wrap>
                <span className={coinStyles.value}>{currencyFormatter.format(coin.marketCap)}</span>
                <Tag>#{coin.marketCapRank}</Tag>
              </Space>
            </div>
            <div className={coinStyles.data}>
              <Title level={3} className={coinStyles.label}>All-Time High</Title>
              <div className={coinStyles.value}>{preciseCurrencyFormatter.format(coin.ath)}</div>
            </div>
            <div className={coinStyles.data}>
              <Title level={3} className={coinStyles.label}>All-Time Low</Title>
              <div className={coinStyles.value}>{preciseCurrencyFormatter.format(coin.atl)}</div>
            </div>
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionDataC2)}>
            { coin.fullyDilutedValuation ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>Fully Diluted Valuation</Title>
                <div className={coinStyles.value}>{currencyFormatter.format(coin.fullyDilutedValuation)}</div>
              </div>
            ) : <></>}
            <div className={coinStyles.data}>
              <Title level={3} className={coinStyles.label}>Circulating Supply</Title>
              <div className={coinStyles.value}>
                {numberFormatter.format(coin.circulatingSupply)}
                { circulatingSupplyPercentage ? ` / ${circulatingSupplyPercentage}%` : <></>}
              </div>
            </div>
            { coin.totalSupply ? (
              <div className={coinStyles.data}>
                <Title level={3} className={coinStyles.label}>Total Supply</Title>
                <div className={coinStyles.value}>{numberFormatter.format(coin.totalSupply)}</div>
              </div>
            ) : <></>}
          </Card.Grid>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionTags)}>
            <Title level={3} className={coinStyles.label}>Tags</Title>
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
              <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionData, coinStyles.sectionSimilarCoins)}>
                <Title level={3} className={coinStyles.label}>Similar Coins</Title>
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  coin.similarCoins.map(coin =>
                    (
                      <Link href={`/coin/${coin.id}`} key={coin.id}>
                        <a>
                          <Tag
                            className={coinStyles.similarCoin}
                            // eslint-disable-next-line @next/next/no-img-element
                            icon={<img className={coinStyles.similarCoin} width={14} height={14} src={coin.images.thumb} alt={coin.name} />}
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
          {
            (coin.launch_price || coin.launch_date_start || coin.launch_roi_usd) ? (
              <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionIco)}>
                {
                  coin.launch_price ? (
                    <div className={coinStyles.data}>
                      <Title level={3} className={coinStyles.label}>ICO Price</Title>
                      <span className={coinStyles.value}>{currencyFormatter.format(coin.launch_price)}</span>
                    </div>
                  ) : <></>
                }
                {
                  coin.launch_date_start ? (
                    <div className={coinStyles.data}>
                      <Title level={3} className={coinStyles.label}>ICO Date</Title>
                      {
                        coin.launch_date_start?.getTime() == coin.launch_date_end?.getTime() ? (
                          <span className={coinStyles.value}>{dateFormatter.format(coin.launch_date_start)}</span>
                        ) : (
                          <>
                            <span className={coinStyles.value}>{dateFormatter.format(coin.launch_date_start)}</span>
                            {` - `}
                            <span className={coinStyles.value}>{dateFormatter.format(coin.launch_date_end)}</span>
                          </>
                        )
                      }
                    </div>
                  ) : (
                    <div className={coinStyles.data}>
                      <Title level={3} className={coinStyles.label}>Performance since ICO</Title>
                    </div>
                  )
                }
                {
                  coin.launch_roi_usd ? (
                    <Table
                      className={coinStyles.valueTable}
                      bordered
                      dataSource={[
                        {
                          key: 'values',
                          usd: coin.launch_roi_usd,
                          eth: coin.launch_roi_eth,
                          btc: coin.launch_roi_btc
                        },
                      ]}
                      columns={[
                        {
                          title: 'Currency',
                          render: () => 'ROI'
                        },
                        {
                          title: 'USD',
                          dataIndex: 'usd',
                          render: renderRoi
                        },
                        {
                          title: 'BTC',
                          dataIndex: 'btc',
                          render: renderRoi
                        },
                        {
                          title: 'ETH',
                          dataIndex: 'eth',
                          render: renderRoi
                        },
                      ]}
                      pagination={{ position: ['none', 'none'] }}
                    />
                  ) : <></>
                }
              </Card.Grid>
            ) : <></>
          }
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionChart)}>
            <AdvancedRealTimeChart
              autosize
              interval="D"
              symbol={`${coin.symbol.toUpperCase()}USDT`}
              hide_side_toolbar={!screens.sm}
              container_id={coinStyles.chart}
            >
            </AdvancedRealTimeChart>
          </Card.Grid>
        </Card>
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
  let coinData = await prisma.coin.findUnique({
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
  const description = await getDescriptionByCoin(coinData.symbol)

  const platforms = await getPlatformData(coinData.platforms, coinData.defaultPlatform)
  const chainsData = await getChainsData();

  coinData = pick(coinData, [
    'id',
    'symbol',
    'name',
    'images',
    'categories',
    'defaultPlatform',
    'marketCap',
    'marketCapRank',
    'ath',
    'atl',
    'fullyDilutedValuation',
    'circulatingSupply',
    'totalSupply',
    'tickers',
    'twitter',
    'twitterFollowers',
    'homepage',
    'launch_price',
    'launch_date_start',
    'launch_date_end',
    'launch_roi_usd',
    'launch_roi_eth',
    'launch_roi_btc',
  ])
  return {
    props: {
      ...coinData,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValuation: Number(coinData.fullyDilutedValuation),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      launch_price: Number(coinData.launch_price),
      launch_roi_usd: Number(coinData.launch_roi_usd),
      launch_roi_eth: Number(coinData.launch_roi_eth),
      launch_roi_btc: Number(coinData.launch_roi_btc),
      platforms,
      chainsData,
      dailyTrends,
      dailySuperSuperTrend,
      weeklyTrends,
      weeklySuperSuperTrend,
      description,
      similarCoins,
      appData,
    }
  }
}
