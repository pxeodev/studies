import { InfoCircleFilled } from '@ant-design/icons';
import { Breadcrumb, Card, Layout, Space, Table, Tag, Tooltip, Typography } from 'antd';
import Link from 'next/link'
import Head from 'next/head'
import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'

import endOfYesterday from 'date-fns/endOfYesterday';
import pick from 'lodash/pick';
import take from 'lodash/take';
import { useEffect, useState } from 'react';

import UpTag from '../../components/UpTag';
import DownTag from '../../components/DownTag';
import HodlTag from '../../components/HodlTag';
import TokenomicsTab from '../../components/TokenomicsTab';
import AnalyticsTab from '../../components/AnalyticsTab';
import TradeTab from '../../components/TradeTab';
import { defaultAtrPeriods, defaultMultiplier, signals } from '../../utils/variables';
import getTrends from '../../utils/getTrends';
import getChainsData from '../../utils/getChainsData';
import getPlatformData from '../../utils/getPlatformData';
import convertToDailySignals from '../../utils/convertToDailySignals';
import { getDescriptionByCoin } from '../../utils/coinDescriptions';
import useBreakPoint from '../../hooks/useBreakPoint';
import useIsHoverable from '../../hooks/useIsHoverable';
import globalData from '../../lib/globalData';
import classnames from 'classnames';

import baseStyles from '../../styles/base.module.less'
import coinStyles from '../../styles/coin.module.less'

const { Content } = Layout;
const { Title } = Typography;
const TABS = {
  'tokenomics': 'Tokenomics',
  'analysis': 'Analysis',
  'trade': 'Trade'
}

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

  const screens = useBreakPoint();
  const isHoverable = useIsHoverable();
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })

  const metaTitle = `${coin.name} (${coin.symbol.toUpperCase()}) | ${dailySignal.toUpperCase()} | Daily Crypto Screener`
  const ogTitle = `${coin.name} | ${dailySignal.toUpperCase()} | ${dateFormatter.format(new Date())} | Coinrotator`
  const metaDescription = `Coinrotator issues a daily trend for ${coin.name}. A coin screener that captures strong momentum in both directions!`

  const [activeTab, setActiveTab] = useState(TABS.tokenomics)
  const preventCopy = (event) => {
    let selection = window.getSelection().toString();
    selection = selection.split(' ').map((piece) => {
      if (Math.random() * 100 < 6) {
        let interference = window.location.href
        const moreRandom = Math.random() * 100
        if (moreRandom < 20) {
          interference = Math.random().toString(36).slice(2)
        } else if (moreRandom < 40) {
          interference = take([';', '.', '?', '\,'], 1)[0]
        }
        piece = `${piece} ${interference} `
      }
      return piece;
    }).join(' ')

    selection = `${selection}\nCopyright ${new Date().getFullYear()} CoinRotator. All rights reserved`
    selection = `${selection}\nThe source of this text is ${window.location.href}`

    event.clipboardData.setData('text/plain', selection);
    event.preventDefault();
  }
  useEffect(() => {
    document.addEventListener('copy', preventCopy)
    return () => {
      document.removeEventListener('copy', preventCopy)
    }
  }, [])

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
                  title="The numbers in parenthesis indicate the trend streak - how many days a coin has been a UP or DOWN trend against ETH, BTC or USD. Daily updated at 1 AM UTC"
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
          {Object.values(TABS).map((tab) => {
            return (
              <Card.Grid
                hoverable={false}
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={classnames(coinStyles.tab, { [coinStyles.active]: tab === activeTab })}
              >
                {tab}
              </Card.Grid>
            );
          })}
          <AnalyticsTab coin={coin} screens={screens} />
          <TokenomicsTab coin={coin} screens={screens}/>
          <TradeTab coin={coin} screens={screens}/>
        </Card>
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
    'maxSupply',
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
    'currentPrice'
  ])
  return {
    props: {
      ...coinData,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValuation: Number(coinData.fullyDilutedValuation),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      maxSupply: Number(coinData.maxSupply),
      launch_price: Number(coinData.launch_price),
      launch_roi_usd: Number(coinData.launch_roi_usd),
      launch_roi_eth: Number(coinData.launch_roi_eth),
      launch_roi_btc: Number(coinData.launch_roi_btc),
      currentPrice: Number(coinData.currentPrice),
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
