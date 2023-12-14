import { Table, Tag } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import { useHydrated } from "react-hydration-provider";
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';

import WatchlistStar from './WatchlistStar';
import useIsHoverable from '../hooks/useIsHoverable';
import useVirtualTable from '../hooks/useVirtualTable';
import useSocketStore from '../hooks/useSocketStore';
import { signals, preferredExchanges } from 'coinrotator-utils/variables.mjs'
import { getWatchListCoins, addToWatchList, removeFromWatchList } from '../utils/watchlist';
import { getImageURL } from '../utils/minifyImageURL';
import { dailySuperSuperTrend, dailySuperSuperTrendStreak, weeklySuperSuperTrend, marketCap, exchanges as exchangesCol } from '../utils/sharedColumns';
import { NotificationContext } from '../layouts/screener.js';

import coinTableStyles from '../styles/table.module.less';

const CoinTable = ({
    coinsData,
    exchangeData,
    marketCapMin,
    marketCapMax,
    trendLengthMin,
    trendLengthMax,
    trendType,
    portfolio,
    category,
    defaultCategory,
    exchanges,
    derivatives,
    showDerivatives,
    superTrendFlavor,
    reverseMarketCapSort = false,
    showTrendStreak = true,
    showExchanges = true,
    defaultSort = ['dailySuperSuperTrend', 'ascend'],
  }) => {

  const router = useRouter()
  const isHoverable = useIsHoverable()
  const hydrated = useHydrated()
  const notification = useContext(NotificationContext)
  const [watchlistCoins, setWatchlistCoins] = useState([])
  const socket = useSocketStore(state => state.socket)
  const [prices, setPrices] = useState({})
  const [trends, setTrends] = useState(null)

  const currencyFormatter = useMemo(() => new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 9 }), [])
  useEffect(() => {
    const prices = JSON.parse(localStorage.getItem("prices"))
    if (prices) {
      setPrices(prices)
    }
  }, [])
  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_trends', {
        flavor: superTrendFlavor,
      })
    }
  }, [socket, superTrendFlavor])
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

      socket.on('trends', (trends) => setTrends(trends))
      socket.on('new_trends', fetchTrends)
    }
    return () => {
      if (socket) {
        socket.off('i')
        socket.off('p')
        socket.off('trends')
        socket.off('new_trends')
      }
    }
  }, [socket, fetchTrends])
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

  let displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    const coinSymbolLower = coinData.symbol.toLowerCase()
    const coinNameLower = coinData.name.toLowerCase()
    const matchesPortfolio = portfolio === '' || portfolioFilter.some((coinName) => coinNameLower.includes(coinName) || coinSymbolLower.includes(coinName))
    const matchesCategory = category === defaultCategory || coinData.categories.includes(category)
    const exchangeNames = coinData.exchanges.map(exchangeData => exchangeData[0])
    const matchesExchanges = isEmpty(exchanges) || Boolean(intersection(exchanges, exchangeNames).length)
    const derivativeNames = coinData.derivatives?.map(derivative => derivative.market) || []
    const matchesDerivatives = isEmpty(derivatives) || Boolean(intersection(derivatives, derivativeNames).length)
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesPortfolio &&
           matchesCategory &&
           matchesExchanges &&
           matchesDerivatives
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    let min = parseInt(trendLengthMin)
    min = isFinite(min) ? min : 0
    let max = parseInt(trendLengthMax)
    max = isFinite(max) ? max : Number.POSITIVE_INFINITY

    if (coinData.dailySuperSuperTrendStreak) {
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

  const tableData = displayedCoinData.map((coinData) => {
    let shownDerivatives = coinData.derivatives || []
    if (!isEmpty(derivatives)) {
      shownDerivatives = coinData.derivatives.filter(derivative => derivatives.includes(derivative.market))
    }
    shownDerivatives = shownDerivatives.sort((derivativeA, derivativeB) => {
      return preferredExchanges.includes(derivativeA.market) ? 1 : derivativeA.market.localeCompare(derivativeB.market)
    })
    let shownExchanges = coinData.exchanges.sort((exchangeA, exchangeB) => {
      if (preferredExchanges.includes(exchangeA[0])) {
        if (preferredExchanges.includes(exchangeB[0])) {
          return exchangeB[1] - exchangeA[1]
        } else {
          return -1
        }
      } else if (preferredExchanges.includes(exchangeB[0])) {
        return 1;
      } else {
        return exchangeB[1] - exchangeA[1]
      }
    })
    shownExchanges = shownExchanges.slice(0, 5)
    if (trends) {
      const dailyTrend = trends.daily[coinData.id].supersuperTrend
      if (dailyTrend) {
        coinData.dailySuperSuperTrend = dailyTrend.trend
        coinData.dailySuperSuperTrendStreak = dailyTrend.streak
      }
      const weeklyTrend = trends.weekly[coinData.id].supersuperTrend
      if (weeklyTrend) {
        coinData.weeklySuperSuperTrend = weeklyTrend.trend
        coinData.weeklySuperSuperTrendStreak = weeklyTrend.streak
      }
    }
    return {
      key: `${coinData.id}-${coinData.name}`,
      id: coinData.id,
      price: prices[coinData.symbol],
      coinData: {
        symbol: coinData.symbol,
        imageSlug: coinData.imageSlug,
        name: coinData.name
      },
      exchanges: shownExchanges,
      derivatives: shownDerivatives,
      marketCap: coinData.marketCap,
      dailySuperSuperTrend: coinData.dailySuperSuperTrend,
      dailySuperSuperTrendStreak: coinData.dailySuperSuperTrendStreak,
      weeklySuperSuperTrend: coinData.weeklySuperSuperTrend,
      weeklySuperSuperTrendStreak: coinData.weeklySuperSuperTrendStreak,
    }
  })

  let columns = [
    {
      title: () => `Coin (${tableData.length})`,
      width: 200,
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
              <span className={coinTableStyles.name}>{coinData.name}</span>
              <span className={coinTableStyles.symbol}>{coinData.symbol}</span>
            </Link>
            <Link href={`/coin/${data.id}#chart`} onClick={(e) => e.stopPropagation()}>
              <BarChartOutlined
                className={coinTableStyles.chart}
                alt="Real time chart"
                title="Real time chart"
              />
            </Link>
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
        width: 90,
        ...dailySuperSuperTrendStreak(router, isHoverable),
      }
    )
  }

  columns.push(
    {
      width: 100,
      ...weeklySuperSuperTrend(router, isHoverable),
    }
  )

  columns.push({
    width: 125,
    title: 'Live Price',
    dataIndex: 'price',
    render: (price) => price ? currencyFormatter.format(price) : null
  })

  columns.push(
  {
    width: 90,
    ...marketCap(router, hydrated)
  }
  )
  if (showExchanges) {
    columns.push(
      {
        width: 120,
        ...exchangesCol(router, isHoverable, exchangeData)
      }
    )
  }
  if (showDerivatives) {
    columns.push(
      {
        title: 'Derivatives',
        dataIndex: 'derivatives',
        width: 250,
        className: coinTableStyles.unclickableCell,
        render: (derivatives, data) => {
          return <span title="Top derivatives. Click to see more.">
            {derivatives.map((derivative) => {
              const onTagClick = () => {
                router.push(`/coin/${data.id}?tab=Trade&filter=Derivatives`)
              }
              return <Tag
                key={`${derivative.market}${derivative.symbol}`}
                onClick={onTagClick}
                className={coinTableStyles.clickableTag}
              >{derivative.symbol}</Tag>
            })}
          </span>;
        }
      }
    )
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
