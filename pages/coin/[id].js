import { InfoCircleFilled } from '@ant-design/icons';
import { Card, Layout, Space, Tag, Tooltip, Typography } from 'antd';
import Head from 'next/head'
import { useRouter } from 'next/router'
import pick from 'lodash/pick';
import uniq from 'lodash/uniq';
import { useCallback, useEffect, useState, useContext, useRef, useMemo } from 'react';
import classnames from 'classnames';

import sql from '../../lib/database.mjs'
import UpTag from '../../components/UpTag';
import DownTag from '../../components/DownTag';
import HodlTag from '../../components/HodlTag';
import PriceDataTab from '../../components/PriceDataTab';
import AnalyticsTab from '../../components/AnalysisTab';
import TradeTab from '../../components/TradeTab';
import PageHeader from '../../components/PageHeader';
import WatchlistStar from '../../components/WatchlistStar';
import { SUPERTREND_FLAVOR, signals } from 'coinrotator-utils/variables.mjs';
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
import LoadingTag from '../../components/LoadingTag.js';

const { Content } = Layout;
const { Title } = Typography;
const TABS = {
  'pricedata': 'Price Data',
  'analysis': 'Analysis',
  'trade': 'Trade'
}

export default function Coin(coin) {
  let dailySignalTag
  const [trends, setTrends] = useState(null)
  const [liveCoinData, setLiveCoinData] = useState([])
  const dailyData = trends?.daily?.supersuperTrend?.trend || trends?.['1d']?.supersuperTrend?.trend
  switch (dailyData) {
    case signals.buy:
      dailySignalTag = <a href="#markets"><UpTag /></a>
      break;
    case signals.sell:
      dailySignalTag = <a href="#markets"><DownTag /></a>
      break;
    case signals.hodl:
      dailySignalTag = <a href="#markets"><HodlTag /></a>
      break;
    default:
      dailySignalTag = <a href="#markets"><LoadingTag /></a>
  }
  let weeklySignalTag
  const weeklyData = trends?.weekly?.supersuperTrend?.trend || trends?.['1w']?.supersuperTrend?.trend
  switch (weeklyData) {
    case signals.buy:
      weeklySignalTag = <a href="#markets"><UpTag /></a>
      break;
    case signals.sell:
      weeklySignalTag = <a href="#markets"><DownTag /></a>
      break;
    case signals.hodl:
      weeklySignalTag = <a href="#markets"><HodlTag /></a>
      break;
    default:
      weeklySignalTag = <a href="#markets"><LoadingTag /></a>
  }

  const screens = useBreakPoint();
  const isHoverable = useIsHoverable();
  const notification = useContext(NotificationContext)
  const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium' })
  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 15 }), [])
  const socket = useSocketStore(state => state.socket)

  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_trends', {
        coinId: coin.id,
        flavor: SUPERTREND_FLAVOR.coinrotator,
        intervals: ['1d', '1w']
      }, (trends) => setTrends(trends))
    }
  }, [socket, coin.id])
  const [price, setPrice] = useState(null)
  useEffect(() => {
    console.log('useeffect fetch trends')
    fetchTrends()
  }, [fetchTrends])
  useEffect(() => {
    const localPrices = JSON.parse(localStorage.getItem("prices"))
    if (localPrices) {
      const price = localPrices[coin.id] || localPrices[coin.symbol]
      if (price) {
        setPrice(price)
      }
    }
  }, [coin.symbol, coin.id, currencyFormatter])
  useEffect(() => {
    if (socket) {
      socket.on("i", (prices) => {
        const price = prices[coin.symbol]
        if (price) {
          setPrice(price)
        }
        console.debug("Received initial prices", prices);
      });

      socket.on('p', (priceUpdates) => {
        const priceUpdate = priceUpdates[coin.symbol]
        if (priceUpdate) {
          setPrice(priceUpdate)
        }
      })

      socket.on('new_trends', fetchTrends)
    }
    return () => {
      if (socket) {
        socket.off('i')
        socket.off('p')
        socket.off('new_trends')
      }
    }
  }, [socket, coin.symbol, currencyFormatter, fetchTrends])
  const fetchLiveCoinData = useCallback(() => {
    socket.emit('get_live_coin_data', (liveCoinData) => {
      const data = liveCoinData.data
      sessionStorage.setItem(`live_coin_data`, JSON.stringify(data))
      setLiveCoinData(data)
    })
  }, [socket])
  useEffect(() => {
    const cache = JSON.parse(sessionStorage.getItem('live_coin_data'))
    if (cache) {
      setLiveCoinData(cache)
    } else if (socket) {
      fetchLiveCoinData()
      socket.on('new_live_coin_data', fetchLiveCoinData)
    }
    return () => {
      if (socket) {
        socket.off('new_live_coin_data')
      }
    }
  }, [socket, fetchLiveCoinData])

  const metaTitle = `${coin.name} (${coin.symbol.toUpperCase()}) | Daily Crypto Trend Screener`
  const metaDescription = `Daily insights on ${coin.name} (${coin.symbol.toUpperCase()})! Discover Coinrotator's comprehensive trend analysis for multiple timeframes.`
  const ogTitle = `${coin.name} trends for ${dateFormatter.format(new Date())}`
  const ogDescription = `CoinRotator shows daily insights on ${coin.symbol} trends!`

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
      <meta property="og:description" content={ogDescription} />
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
          <span>{currencyFormatter.format(price)}</span>
        </>
      }
    />
    <Content className={baseStyles.container}>
      <Card className={classnames(baseStyles.card, coinStyles.sectionParent)}>
        <div className={coinStyles.sectionsDailyAndWeekly}>
          <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionDailyTrend, coinStyles.sectionFlex)}>
            <Space direction="vertical">
              <Space>
                <b>Trend (24h)</b>
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
                {Object.keys(trends?.daily || trends?.['1d'] || {}).filter(key => !['supersuperTrend', 'historical'].includes(key)).map((trendKey) => {
                  const trend = trends.daily?.[trendKey] || trends['1d']?.[trendKey]
                  const trendText = `${trend.trend} (${trend.streak})`
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
                <b>Trend (7d)</b>
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
                {Object.keys(trends?.weekly || trends?.['1w'] || {}).filter(key => !['supersuperTrend', 'historical'].includes(key)).map((trendKey) => {
                  const trend = trends.weekly?.[trendKey] || trends['1w']?.[trendKey]
                  const trendText = `${trend.trend} (${trend.streak})`
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
        <ActiveTabComponent coin={coin} screens={screens} liveCoinData={liveCoinData} price={price} />
      </Card>
    </Content>
  </>;
}

export async function getStaticPaths() {
  const coinsData = await sql`SELECT id FROM "Coin"`

  return {
    paths: coinsData.map(coin => ({ params: { ...coin }}) ),
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const appData = await globalData();
  let coinData = (await sql`SELECT * FROM "Coin" WHERE id = ${params.id}`)[0]
  let similarCoins = []
  coinData.categories ||= []
  coinData.coingeckoCategories ||= []
  if (coinData.categories.length || coinData.coingeckoCategories.length) {
    const safeCategories = coinData.categories.length ? coinData.categories : ['xxxxxxxxxxxxx']
    const safeCoingeckoCategories = coinData.coingeckoCategories.length ? coinData.coingeckoCategories : ['xxxxxxxxxxxxx']
    similarCoins = await sql`
      SELECT id, images, name, count(*)
      FROM "Coin",
      unnest(${sql.array(safeCategories)}) unnested_categories,
      unnest(${sql.array(safeCoingeckoCategories)}) unnested_coingecko_categories
      WHERE (categories @> array[unnested_categories] OR "coingeckoCategories" @> array[unnested_coingecko_categories])
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
  const [description, TVChart] = await getDescriptionByCoin(coinData)
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
    'homepage',
    'launch_price',
    'launch_date_start',
    'launch_date_end',
    'launch_roi_usd',
    'launch_roi_eth',
    'launch_roi_btc',
    'coingeckoCategories',
  ])
  const categories = uniq([...coinData.categories, ...coinData.coingeckoCategories])
  const chart = TVChart || `${coinData.symbol.toUpperCase()}USDT`
  return {
    props: {
      ...coinData,
      categories,
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
      platforms,
      chainsData,
      description,
      similarCoins,
      appData,
      chart,
    }
  }
}
