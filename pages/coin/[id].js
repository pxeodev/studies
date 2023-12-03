import { InfoCircleFilled } from '@ant-design/icons';
import { Card, Layout, Space, Tag, Tooltip, Typography } from 'antd';
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Prisma } from '@prisma/client'
import pick from 'lodash/pick';
import { useCallback, useEffect, useState, useContext, useRef, useMemo } from 'react';
import classnames from 'classnames';

import prisma from '../../lib/prisma.mjs'
import UpTag from '../../components/UpTag';
import DownTag from '../../components/DownTag';
import HodlTag from '../../components/HodlTag';
import PriceDataTab from '../../components/PriceDataTab';
import AnalyticsTab from '../../components/AnalysisTab';
import TradeTab from '../../components/TradeTab';
import PageHeader from '../../components/PageHeader';
import WatchlistStar from '../../components/WatchlistStar';
import { signals } from '../../utils/variables.mjs';
import { getSuperTrends } from '../../utils/getTrends.mjs';
import getChainsData from '../../utils/getChainsData';
import getPlatformData from '../../utils/getPlatformData';
import { getImageSlug, getImageURL } from '../../utils/minifyImageURL.js';
import { getDescriptionByCoin } from '../../utils/coinDescriptions';
import { getWatchListCoins, addToWatchList, removeFromWatchList } from '../../utils/watchlist.js';
import useBreakPoint from '../../hooks/useBreakPoint';
import useIsHoverable from '../../hooks/useIsHoverable';
import useSocketStore from '../../hooks/useSocketStore';
import globalData from '../../lib/globalData';
import { NotificationContext } from '../../layouts/screener.js';

import baseStyles from '../../styles/base.module.less'
import coinStyles from '../../styles/coin.module.less'

const { Content } = Layout;
const { Title } = Typography;
const TABS = {
  'pricedata': 'Price Data',
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
  const notification = useContext(NotificationContext)
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })
  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 9 }), [])
  const coinPriceRef = useRef(null)
  const socket = useSocketStore(state => state.socket)

  useEffect(() => {
    const localPrices = JSON.parse(localStorage.getItem("prices"))
    if (localPrices) {
      const price = localPrices[coin.symbol]
      if (price && coinPriceRef.current) {
        coinPriceRef.current.innerText = currencyFormatter.format(price)
      }
    }
  }, [coin.symbol, currencyFormatter])
  useEffect(() => {
    if (socket) {
      socket.on("i", (prices) => {
        const price = prices[coin.symbol]
        if (price && coinPriceRef.current) {
          coinPriceRef.current.innerText = currencyFormatter.format(price)
        }
        console.debug("Received initial prices", prices);
      });

      socket.on('p', (priceUpdates) => {
        const priceUpdate = priceUpdates[coin.symbol]
        if (priceUpdate && coinPriceRef.current) {
          coinPriceRef.current.innerText = currencyFormatter.format(priceUpdate)
        }
      })
    }
  }, [socket, coin.symbol, currencyFormatter])

  const metaTitle = `${coin.name} (${coin.symbol.toUpperCase()}) | ${dailySignal.toUpperCase()} | Daily Crypto Screener`
  const ogTitle = `${coin.name} | ${dailySignal.toUpperCase()} | ${dateFormatter.format(new Date())} | Coinrotator`
  const metaDescription = `Coinrotator issues a daily trend for ${coin.name}. A coin screener that captures strong momentum in both directions!`

  const router = useRouter();
  const [isWatched, setIsWatched] = useState(false);
  useEffect(() => {
    const watchlistCoins = getWatchListCoins()
    if (watchlistCoins.indexOf(coin.id) !== -1) {
      setIsWatched(true)
    }
  }, [coin.id])
  const toggleWatched = useCallback(() => {
    if (isWatched) {
      removeFromWatchList(coin.id)
      notification.open({
        message: `Removed ${coin.name} from Watchlist`,
        placement: 'topRight',
      })
    } else {
      addToWatchList(coin.id)
      notification.open({
        message: `Added ${coin.name} to Watchlist`,
        placement: 'topRight',
      })
    }
    setIsWatched(!isWatched)
  }, [coin.id, coin.name, isWatched, notification])
  const [activeTab, setActiveTab] = useState(TABS.pricedata)
  useEffect(() => {
    if (router.isReady) {
      let routerTab = router.query.tab
      if (Object.values(TABS).indexOf(routerTab) === -1) {
        routerTab = TABS.pricedata
      }
      setActiveTab(routerTab)
    }
  }, [router])
  const clickTab = useCallback((activeTab) => {
    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        tab: activeTab
      }
    }, null, { shallow: true })
  }, [router])
  let ActiveTabComponent;
  switch (activeTab) {
    case TABS.pricedata:
      ActiveTabComponent = PriceDataTab;
      break;
    case TABS.analysis:
      ActiveTabComponent = AnalyticsTab;
      break;
    case TABS.trade:
      ActiveTabComponent = TradeTab;
      break;
  }

  return <>
    <Head>
      <title key="title">{metaTitle}</title>
      <meta name="description" key="description" content={metaDescription}/>
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={coin.currentUrl} />
      <meta property="og:type" content="app" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={getImageURL(coin.imageSlug)} />
      <meta property="og:image:width" content="250" />
      <meta property="og:image:height" content="250" />
      <meta property="og:image:type" content="image/png" />
    </Head>
    <PageHeader
      title={coin.name}
      prefix={<>
        <WatchlistStar active={isWatched} onClick={toggleWatched} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getImageURL(coin.imageSlug, 'small')} width={24} height={24} alt={`${coin.name} logo`} />
      </>}
      postfix={
        <>
          <Tag className={coinStyles.coinTag}>{coin.symbol.toUpperCase()}</Tag>
          <span ref={coinPriceRef} />
        </>
      }
    />
    <Content className={baseStyles.container}>
      <Card className={classnames(baseStyles.card, coinStyles.sectionParent)}>
        <div className={coinStyles.sectionsDailyAndWeekly}>
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
        </div>
        {Object.values(TABS).map((tab) => {
          return (
            <Card.Grid
              hoverable={false}
              key={tab}
              onClick={() => clickTab(tab)}
              className={classnames(coinStyles.tab, {
                [coinStyles.active]: tab === activeTab,
                [coinStyles.noRightBorder]: tab === TABS.pricedata,
                [coinStyles.noLeftBorder]: tab === TABS.trade
              })}
            >
              <Title
                id={tab}
                level={2}
                className={classnames(coinStyles.tabTitle, { [coinStyles.activeTitle]: tab === activeTab })}
              >
                {tab}
              </Title>
            </Card.Grid>
          );
        })}
        <ActiveTabComponent coin={coin} screens={screens} />
      </Card>
    </Content>
  </>;
}

export async function getStaticPaths() {
  const coinsData = await prisma.coin.findMany({
    select: { id: true },
      orderBy: { marketCapTank: 'asc' },
      take: 1000
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
      id: params.id
    }
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
    similarCoins = similarCoins.map((coin) => {
      coin.imageSlug = getImageSlug(coin.images.large)
      return pick(coin, ['id', 'name', 'imageSlug'])
    })
  }
  const [dailyTrends, dailySuperSuperTrend] = await getSuperTrends(coinData.id)
  const [weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })
  const description = await getDescriptionByCoin(coinData)

  const platforms = await getPlatformData(coinData.platforms, coinData.defaultPlatform)
  const chainsData = await getChainsData();
  coinData.imageSlug = getImageSlug(coinData.images.large)
  coinData = pick(coinData, [
    'id',
    'symbol',
    'name',
    'imageSlug',
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
