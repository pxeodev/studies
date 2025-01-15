import { Table } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import round from 'lodash/round'
import uniq from 'lodash/uniq'
import isFinite from 'lodash/isFinite'
import { useHydrated } from "react-hydration-provider";
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import classnames from 'classnames';
import { formatDistanceToNowStrict } from 'date-fns'

import WatchlistStar from './WatchlistStar';
import useIsHoverable from '../hooks/useIsHoverable';
import useVirtualTable from '../hooks/useVirtualTable';
import useSocketStore from '../hooks/useSocketStore';
import useBreakPoint from '../hooks/useBreakPoint.js';
import { signals, preferredExchanges } from 'coinrotator-utils/variables.mjs'
import { getWatchListCoins, addToWatchList, removeFromWatchList } from '../utils/watchlist';
import { getImageURL } from '../utils/minifyImageURL';
import { categories, dailySuperSuperTrend, dailySuperSuperTrendStreak, weeklySuperSuperTrend, marketCap } from '../utils/sharedColumns';
import { NotificationContext } from '../layouts/screener.js';

import coinTableStyles from '../styles/table.module.less';

const CoinTable = ({
    coinsData,
    hiddenCoins,
    exchangeData,
    formState,
    defaultFormState,
    reverseMarketCapSort = false,
    showTrendStreak = true,
    showWeeklySuperSuperTrend = true,
    showLivePrice = true,
    showCategories = false,
    showCreatedAt = false,
    defaultSort = ['dailySuperSuperTrend', 'ascend'],
    filter,
    passTrends,
  }) => {

  const {
    marketCapMax,
    marketCapMin,
    trendLengthMin,
    trendLengthMax,
    portfolio,
    category,
    trendType,
    exchanges,
    derivatives,
    cexdex,
    superTrendFlavor,
    showCirculatingSupplyPercentage,
    show24hVolumeByMarketCap,
    showPercentageFromATH,
    showPercentageFromATL,
    showMarketCapRank,
    showOpenInterest,
    showFundingRate,
    showVolume24h,
    showFuturesVolume,
    showATH,
    showATL,
  } = formState
  const {
    category: defaultCategory,
  } = defaultFormState

  const FUTURES_COLUMNS_SHOWN = showOpenInterest || showFundingRate || showVolume24h || showFuturesVolume

  const router = useRouter()
  const isHoverable = useIsHoverable()
  const screens = useBreakPoint()
  const hydrated = useHydrated()
  const notification = useContext(NotificationContext)
  const [watchlistCoins, setWatchlistCoins] = useState([])
  const socket = useSocketStore(state => state.socket)
  const [prices, setPrices] = useState({})
  const [trends, setTrends] = useState(null)
  const [liveCoinData, setLiveCoinData] = useState([])
  const updateTrends = useCallback((trends) => {
    setTrends(trends)
    if (passTrends) {
      passTrends(trends)
    }
  }, [passTrends])

  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 9 }), [])
  const numberFormatter = useMemo(() => new Intl.NumberFormat([], { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 3 }), [])
  useEffect(() => {
    const prices = JSON.parse(localStorage.getItem("prices"))
    if (prices) {
      setPrices(prices)
    }
  }, [])
  const fetchTrends = useCallback(() => {
    if (socket) {
      let cache = sessionStorage.getItem(`trends_${superTrendFlavor}`)
      cache = JSON.parse(cache)
      if (cache) {
        updateTrends(cache)
        socket.emit('get_trends', {
          flavor: superTrendFlavor,
          intervals: ['1d', '1w']
        }, (trends) => {
          sessionStorage.setItem(`trends_${superTrendFlavor}`, JSON.stringify(trends))
          updateTrends(trends)
        })
      } else {
        socket.emit('get_trends', {
          flavor: superTrendFlavor,
          intervals: ['1d', '1w']
        }, (trends) => {
          sessionStorage.setItem(`trends_${superTrendFlavor}`, JSON.stringify(trends))
          updateTrends(trends)
        })
      }
    }
  }, [socket, superTrendFlavor, updateTrends])
  useEffect(() => {
    console.log('useeffect fetch trends')
    fetchTrends()
  }, [fetchTrends])
  useEffect(() => {
    if (socket) {
      socket.on("i", (prices) => {
        setPrices(prices)
        localStorage.setItem("prices", JSON.stringify(prices))
        console.debug("Received initial prices", prices);
      });

      socket.on('p', (priceUpdates) => {
        setPrices((prevPrices) => {
          const newPrices = { ...prevPrices }
          Object.entries(priceUpdates).forEach(([coinSymbol, price]) => {
            newPrices[coinSymbol] = price
          })
          return newPrices
        })
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
  }, [socket, fetchTrends, updateTrends, superTrendFlavor])
  const fetchLiveCoinData = useCallback(() => {
    socket.emit('get_live_coin_data', (liveCoinData) => {
      const data = liveCoinData.data
      sessionStorage.setItem(`live_coin_data`, JSON.stringify(data))
      setLiveCoinData(data)
    })
  }, [socket])
  useEffect(() => {
    if (FUTURES_COLUMNS_SHOWN) {
      if (socket) {
        socket.on('new_live_coin_data', fetchLiveCoinData)
      }
      const cache = JSON.parse(sessionStorage.getItem('live_coin_data'))
      if (cache) {
        setLiveCoinData(cache)
      } else if (socket) {
        fetchLiveCoinData()
      }
    }
    return () => {
      if (socket) {
        socket.off('new_live_coin_data')
      }
    }
  }, [FUTURES_COLUMNS_SHOWN, socket, fetchLiveCoinData])
  useEffect(() => {
    setWatchlistCoins(getWatchListCoins())
  }, [])
  const portfolioFilter = portfolio
    .replace(/\s/g, '')
    .split(',')
    .map((coinName) => coinName.toLowerCase())
    .filter((coinName) => coinName.length)
  const toggleWatchlistCoin = useCallback((e, coinId, coinName) => {
    e.stopPropagation()
    if (watchlistCoins.includes(coinId)) {
      const newWatchlistCoins = watchlistCoins.filter(coin => coin !== coinId)
      setWatchlistCoins(newWatchlistCoins)
      removeFromWatchList(coinId)
      notification.open({
        message: `Removed ${coinName} from Watchlist`,
        placement: 'topRight',
      })
    } else {
      setWatchlistCoins([...watchlistCoins, coinId])
      addToWatchList(coinId)
      notification.open({
        message: `Added ${coinName} to Watchlist`,
        placement: 'topRight',
      })
    }
  }, [watchlistCoins, notification])

  let displayedCoinData = coinsData.map((coinData) => {
    if (trends) {
      const dailyTrend = trends.daily?.[coinData.id]?.supersuperTrend || trends['1d']?.[coinData.id]?.supersuperTrend
      if (dailyTrend) {
        coinData.dailySuperSuperTrend = dailyTrend.trend
        coinData.dailySuperSuperTrendStreak = dailyTrend.streak
      }
      const weeklyTrend = trends.weekly?.[coinData.id]?.supersuperTrend || trends['1w']?.[coinData.id]?.supersuperTrend
      if (weeklyTrend) {
        coinData.weeklySuperSuperTrend = weeklyTrend.trend
        coinData.weeklySuperSuperTrendStreak = weeklyTrend.streak
      }
    }
    return coinData
  })
  displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    const coinSymbolLower = coinData.symbol.toLowerCase()
    const coinNameLower = coinData.name.toLowerCase()
    const matchesPortfolio = portfolio === '' || portfolioFilter.some((coinName) => coinNameLower.includes(coinName) || coinSymbolLower.includes(coinName))
    const matchesCategory = category === defaultCategory || coinData.categories?.includes(category) || coinData.coingeckoCategories?.includes(category)
    const exchangeNames = coinData.exchanges.map(exchangeData => exchangeData[0])
    const matchesExchanges = isEmpty(exchanges) || Boolean(intersection(exchanges, exchangeNames).length)
    const matchesDerivatives = isEmpty(derivatives) || Boolean(intersection(derivatives, coinData.derivatives || []).length)
    const marketCapNumber = Number(coinData.marketCap)
    const matchesCexDex = coinData.exchanges.some((exchange) => {
      if (cexdex.length === 2 || cexdex.length === 0) {
        return true
      } else {
        const matchingExchange = exchangeData.find(exchangeData => exchangeData.name === exchange[0])
        if (!matchingExchange) {
          return false
        }
        if (cexdex[0] === 'cex') {
          return matchingExchange.centralized
        } else if (cexdex[0] === 'dex') {
          return !matchingExchange.centralized
        }
      }
    })
    const hasDailyOrWeekly = trends ? (coinData.dailySuperSuperTrend !== undefined || coinData.weeklySuperSuperTrend !== undefined) : true
    return marketCapNumber <= max &&
           marketCapNumber >= min &&
           matchesPortfolio &&
           matchesCategory &&
           matchesExchanges &&
           matchesDerivatives &&
           matchesCexDex &&
           hasDailyOrWeekly &&
           !hiddenCoins.includes(coinData.slug)
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    let min = parseInt(trendLengthMin)
    min = isFinite(min) ? min : 0
    let max = parseInt(trendLengthMax)
    max = isFinite(max) ? max : Number.POSITIVE_INFINITY

    if (coinData.dailySuperSuperTrendStreak !== undefined) {
      return coinData.dailySuperSuperTrendStreak >= min && coinData.dailySuperSuperTrendStreak <= max
    } else {
      return true
    }
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    if (trendType === signals.all) {
      return true
    } else if (trendType === signals.buy) {
      return coinData.dailySuperSuperTrend === signals.buy
    } else if (trendType === signals.hodl) {
      return coinData.dailySuperSuperTrend === signals.hodl
    } else if (trendType === signals.sell) {
      return coinData.dailySuperSuperTrend === signals.sell
    }
  })

  if (filter) {
    displayedCoinData = displayedCoinData.filter(filter)
  }

  const tableData = displayedCoinData.map((coinData) => {
    let shownDerivatives = coinData.derivatives || []
    if (!isEmpty(derivatives)) {
      shownDerivatives = coinData.derivatives.filter(derivative => derivatives.includes(derivative))
    }
    shownDerivatives = shownDerivatives.sort((derivativeA, derivativeB) => {
      return preferredExchanges.includes(derivativeA) ? 1 : derivativeA.localeCompare(derivativeB)
    })
    let percentageFromATH, percentageFromATL
    const livePrice = prices[coinData.symbol]
    if (livePrice) {
      percentageFromATH = round(((coinData.ath - livePrice) / coinData.ath * 100), 2) + '%'
      percentageFromATL = round((livePrice / coinData.atl) * 100, 2) + '%'
    }
    let openInterest, fundingRate, openInterestByFuturesVolume24h, openInterestByfuturesVolume24hChangePercent24h, openInterestChangePercent1h, openInterestChangePercent24h, twentyFourHourVolumeByMarketCap, futuresVolume24h
    if (liveCoinData) {
      const matchingCoinData = liveCoinData.find(coin => coin.id === coinData.id)
      if (matchingCoinData) {
        openInterest = matchingCoinData.openInterest
        fundingRate = matchingCoinData.fundingRate ? round(matchingCoinData.fundingRate, 5) : null
        futuresVolume24h = matchingCoinData.futuresVolume24h
        openInterestByFuturesVolume24h = matchingCoinData.openInterestByfuturesVolume24h
        openInterestByfuturesVolume24hChangePercent24h = matchingCoinData.openInterestByfuturesVolume24hChangePercent24h
        if (matchingCoinData.volume24h && coinData.marketCap) {
          twentyFourHourVolumeByMarketCap = matchingCoinData.volume24h / parseFloat(coinData.marketCap)
        }
        openInterestChangePercent1h = round(matchingCoinData.openInterestChangePercent1h, 2)
        openInterestChangePercent24h = round(matchingCoinData.openInterestChangePercent24h, 2)
      }
    }
    let circulatingSupplyPercentage
    if (coinData.totalSupply) { // Some coins have infinite supply and totalSupply is NULL for them
      circulatingSupplyPercentage = `${round((Number(coinData.circulatingSupply) / Number(coinData.totalSupply) * 100), 2)}%`
    }
    const cat = coinData.categories || []
    const cgCat = coinData.coingeckoCategories || []
    const categories = uniq([...cat, ...cgCat])
    return {
      key: `${coinData.id}-${coinData.name}`,
      id: coinData.id,
      price: prices[coinData.symbol],
      coinData: {
        symbol: coinData.symbol,
        imageSlug: coinData.imageSlug,
        name: coinData.name
      },
      categories,
      createdAt: coinData.createdAt,
      derivatives: shownDerivatives,
      marketCap: coinData.marketCap,
      marketCapRank: coinData.marketCapRank,
      dailySuperSuperTrend: coinData.dailySuperSuperTrend,
      dailySuperSuperTrendStreak: coinData.dailySuperSuperTrendStreak,
      weeklySuperSuperTrend: coinData.weeklySuperSuperTrend,
      weeklySuperSuperTrendStreak: coinData.weeklySuperSuperTrendStreak,
      ath: coinData.ath,
      atl: coinData.atl,
      circulatingSupplyPercentage,
      twentyFourHourVolumeByMarketCap,
      percentageFromATH,
      percentageFromATL,
      openInterest,
      fundingRate,
      futuresVolume24h,
      openInterestByFuturesVolume24h,
      openInterestByfuturesVolume24hChangePercent24h,
      openInterestChangePercent1h,
      openInterestChangePercent24h,
    }
  })

  let coinColumnWidth = 140
  if (screens.sm) {
    coinColumnWidth = 220
  }
  if (screens.md) {
    coinColumnWidth = 240
  }
  let columns = [
    {
      title: () => `Coin`,
      width: coinColumnWidth,
      dataIndex: 'coinData',
      onCell: ({ id }) => {
        return {
          onClick: () => router.push(`/coin/${id}`)
        }
      },
      fixed: hydrated ? 'left' : null,
      sorter: (a, b) => a.coinData.name.localeCompare(b.coinData.name),
      render: (coinData, data) => {
        const isCoinWatched = watchlistCoins.includes(data.id)
        return (
          <>
            <WatchlistStar active={isCoinWatched} onClick={(e) => toggleWatchlistCoin(e, data.id, coinData.name)} />
            <Link href={`/coin/${data.id}`} className={coinTableStyles.coin}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getImageURL(coinData.imageSlug, 'small')} alt={coinData.name} className={coinTableStyles.image} loading="lazy"/>
              {screens.sm && <span className={coinTableStyles.name}>{coinData.name}</span>}
              <span className={coinTableStyles.symbol}>{coinData.symbol}</span>
            </Link>
            { screens.sm ? (
              <Link href={`/coin/${data.id}#chart`} onClick={(e) => e.stopPropagation()}>
                <BarChartOutlined
                  className={coinTableStyles.chart}
                  alt="Real time chart"
                  title="Real time chart"
                />
              </Link>
            ) : null}
          </>
        );
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable, reverseMarketCapSort),
    }
  ];

  if (showTrendStreak) {
    columns.push(
      {
        ...dailySuperSuperTrendStreak(router, isHoverable),
      }
    )
  }

  if (showWeeklySuperSuperTrend) {
    columns.push(
      {
        ...weeklySuperSuperTrend(router, isHoverable),
        width: 100,
      }
    )
  }

  if (showCategories) {
    columns.push(
      {
        width: 300,
        ...categories(),
      }
    )
  }

  if (showLivePrice) {
    columns.push({
      width: 125,
      title: 'Live Price',
      dataIndex: 'price',
      render: (price) => price ? currencyFormatter.format(price) : null
    })
  }

  columns.push(
  {
    width: 100,
    ...marketCap(router, hydrated)
  }
  )
  if (showMarketCapRank) {
    columns.push(
      {
        title: 'Market Cap #',
        dataIndex: 'marketCapRank',
        width: 100,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.marketCapRank) - Number(b.marketCapRank)
      }
    )
  }
  if (showCirculatingSupplyPercentage) {
    columns.push(
      {
        title: 'Circulating supply',
        dataIndex: 'circulatingSupplyPercentage',
        width: 120,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.circulatingSupplyPercentage?.slice(0, -1)) - Number(b.circulatingSupplyPercentage?.slice(0, -1))
      }
    )
  }
  if (show24hVolumeByMarketCap) {
    columns.push(
      {
        title: '24h Volume / Market Cap',
        dataIndex: 'twentyFourHourVolumeByMarketCap',
        width: 120,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.twentyFourHourVolumeByMarketCap) - Number(b.twentyFourHourVolumeByMarketCap),
        render: (twentyFourHourVolumeByMarketCap) => twentyFourHourVolumeByMarketCap ? round(twentyFourHourVolumeByMarketCap * 100, 2) + '%' : null
      }
    )
  }
  if (showATH) {
    columns.push(
      {
        title: 'ATH',
        dataIndex: 'ath',
        width: 150,
        className: coinTableStyles.unclickableCell,
        render: (ath) => ath ? currencyFormatter.format(ath) : null,
        sorter: (a, b) => Number(a.ath) - Number(b.ath)
      }
    )
  }
  if (showPercentageFromATH) {
    columns.push(
      {
        title: 'Percentage from ATH',
        dataIndex: 'percentageFromATH',
        width: 120,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.percentageFromATH?.slice(0, -1)) - Number(b.percentageFromATH?.slice(0, -1))
      }
    )
  }
  if (showATL) {
    columns.push(
      {
        title: 'ATL',
        dataIndex: 'atl',
        width: 150,
        className: coinTableStyles.unclickableCell,
        render: (atl) => atl ? currencyFormatter.format(atl) : null,
        sorter: (a, b) => Number(a.atl) - Number(b.atl)
      }
    )
  }
  if (showPercentageFromATL) {
    columns.push(
      {
        title: 'Percentage from ATL',
        dataIndex: 'percentageFromATL',
        width: 150,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.percentageFromATL?.slice(0, -1)) - Number(b.percentageFromATL?.slice(0, -1))
      }
    )
  }
  if (showOpenInterest) {
    columns.push(
      {
        title: 'Open Interest',
        dataIndex: 'openInterest',
        width: 170,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.openInterest) - Number(b.openInterest),
        render: (openInterest) => {
          if (openInterest) {
            return currencyFormatter.format(openInterest)
          } else {
            return null
          }
        }
      }
    )
    columns.push(
      {
        title: 'Open Interest (1h%)',
        dataIndex: 'openInterestChangePercent1h',
        width: 170,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.openInterestChangePercent1h) - Number(b.openInterestChangePercent1h),
        render: (openInterestChangePercent1h) => {
          if (isFinite(openInterestChangePercent1h)) {
            return (
              <>
                {!isNaN(openInterestChangePercent1h) ? (
                  <span className={classnames(coinTableStyles.changePercentage, { [coinTableStyles.changePercentageNegative]: openInterestChangePercent1h < 0 })}>
                    {openInterestChangePercent1h > 0 ? '+' : ''}
                    {openInterestChangePercent1h}%
                  </span>
                ) : null}
              </>
            )
          } else {
            return null
          }
        }
      }
    )
    columns.push(
      {
        title: 'Open Interest (24h%)',
        dataIndex: 'openInterestChangePercent24h',
        width: 170,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.openInterestChangePercent24h) - Number(b.openInterestChangePercent24h),
        render: (openInterestChangePercent24h) => {
          if (isFinite(openInterestChangePercent24h)) {
            return (
              <>
                {!isNaN(openInterestChangePercent24h) ? (
                  <span className={classnames(coinTableStyles.changePercentage, { [coinTableStyles.changePercentageNegative]: openInterestChangePercent24h < 0 })}>
                    {openInterestChangePercent24h > 0 ? '+' : ''}
                    {openInterestChangePercent24h}%
                  </span>
                ) : null}
              </>
            )
          } else {
            return null
          }
        }
      }
    )
  }
  if (showFundingRate) {
    columns.push(
      {
        title: 'Funding Rate',
        dataIndex: 'fundingRate',
        width: 120,
        sorter: (a, b) => Number(a.fundingRate) - Number(b.fundingRate),
        className: coinTableStyles.unclickableCell,
        render: (fundingRate) => {
          if (isFinite(fundingRate)) {
            return (
              <span className={classnames(coinTableStyles.changePercentage, { [coinTableStyles.changePercentageNegative]: fundingRate > 0 })}>
                {fundingRate > 0 ? '+' : ''}
                {fundingRate}
              </span>
            )
          } else {
            return null
          }
        }
      }
    )
  }
  if (showVolume24h) {
    columns.push(
      {
        title: 'Futures Volume (24h)',
        dataIndex: 'futuresVolume24h',
        width: 150,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.futuresVolume24h) - Number(b.futuresVolume24h),
        render: (futuresVolume24h) => {
          return futuresVolume24h ? currencyFormatter.format(futuresVolume24h) : null
        }
      }
    )
  }
  if (showFuturesVolume) {
    columns.push(
      {
        title: 'OI / 24h Volume',
        dataIndex: 'openInterestByFuturesVolume24h',
        width: 160,
        className: coinTableStyles.unclickableCell,
        sorter: (a, b) => Number(a.openInterestByFuturesVolume24h) - Number(b.openInterestByFuturesVolume24h),
        render: (openInterestByFuturesVolume24h, data) => {
          if (isFinite(openInterestByFuturesVolume24h)) {
            return (
              <>
                <>{numberFormatter.format(openInterestByFuturesVolume24h)}</>
                {data.openInterestByfuturesVolume24hChangePercent24h ? (
                  <span className={classnames(coinTableStyles.changePercentage, { [coinTableStyles.changePercentageNegative]: data.openInterestByfuturesVolume24hChangePercent24h < 0 })}>
                    &nbsp;(
                      {data.openInterestByfuturesVolume24hChangePercent24h > 0 ? '+' : ''}
                      {round(data.openInterestByfuturesVolume24hChangePercent24h, 2)}%
                    )
                  </span>
                ) : null}
              </>
            )
          } else {
            return null
          }
        }
      }
    )
  }
  if (showCreatedAt) {
    columns.push({
      title: 'Added',
      dataIndex: 'createdAt',
      width: 140,
      className: coinTableStyles.unclickableCell,
      sorter: (a, b) => Number(a.createdAt) - Number(b.createdAt),
      render: (createdAt) => {
        if (!createdAt) { return null }
        // 1732688654000 is when we added the createdAt column
        if (createdAt.valueOf() <= 1732688654000) {
          return `> ${formatDistanceToNowStrict(createdAt)} ago`
        }
        return `${formatDistanceToNowStrict(createdAt)} ago`
      }
    })
  }
  columns.find(column => column.dataIndex === defaultSort[0]).defaultSortOrder = defaultSort[1]

  return (
    <Table
      columns={columns}
      dataSource={tableData}
      rowClassName={coinTableStyles.row}
      pagination={{ position: ['none', 'none'], pageSize: 1000 }}
      className={coinTableStyles.table}
      {...useVirtualTable()}
    />
  )
}

export default CoinTable
