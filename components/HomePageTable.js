import { Table, Tag } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react';
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import { useHydrated } from "react-hydration-provider";

import WatchlistStar from './WatchlistStar';
import useBreakPoint from '../hooks/useBreakPoint'
import useIsHoverable from '../hooks/useIsHoverable';
import useVirtualTable from '../hooks/useVirtualTable';
import { signals, preferredExchanges, SUPERTREND_FLAVOR } from '../utils/variables'
import { getWatchListCoins, addToWatchList, removeFromWatchList } from '../utils/watchlist';
import { dailySuperSuperTrend, weeklySuperSuperTrend, marketCap, exchanges as exchangesCol } from '../utils/sharedColumns';

import indexTableStyles from '../styles/indexTable.module.less';

const HomePageTable = ({
    coinsData,
    exchangeData,
    marketCapMin,
    marketCapMax,
    trendLengthMin,
    trendLengthMax,
    trendType,
    portfolio,
    portfolioFilter,
    category,
    defaultCategory,
    exchanges,
    derivatives,
    superTrendFlavor
  }) => {

  const router = useRouter()
  const isHoverable = useIsHoverable()
  const hydrated = useHydrated()
  const [watchlistCoins, setWatchlistCoins] = useState([])
  useEffect(() => {
    setWatchlistCoins(getWatchListCoins())
  }, [])
  const toggleCoin = useCallback((coinId) => {
    if (watchlistCoins.includes(coinId)) {
      const newWatchlistCoins = watchlistCoins.filter(coin => coin !== coinId)
      setWatchlistCoins(newWatchlistCoins)
      removeFromWatchList(coinId)
    } else {
      setWatchlistCoins([...watchlistCoins, coinId])
      addToWatchList(coinId)
    }
  }, [watchlistCoins])

  if (superTrendFlavor === SUPERTREND_FLAVOR.classic) {
    coinsData = coinsData.map((coinData) => {
      coinData.dailyTrends = coinData.dailyClassicTrends
      coinData.dailySuperSuperTrend = coinData.dailyClassicSuperSuperTrend
      coinData.weeklyTrends = coinData.weeklyClassicTrends
      coinData.weeklySuperSuperTrend = coinData.weeklyClassicSuperSuperTrend

      return coinData
    })
  }
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

    const trendValues = Object.values(coinData.dailyTrends)
    const trends = trendValues.filter(trend => trend[0].length)
    if (trends.length === 0) {
      return false;
    }

    return trends
      .map(trend => trend[1])
      .every(trendLength => trendLength >= min && trendLength <= max)
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
    shownDerivatives = shownDerivatives.sort((derivative) => preferredExchanges.includes(derivative.market) ? -1 : 1)
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
    return {
      key: `${coinData.id}-${coinData.name}`,
      id: coinData.id,
      coinData: {
        symbol: coinData.symbol,
        images: coinData.images,
        name: coinData.name
      },
      exchanges: shownExchanges,
      derivatives: shownDerivatives,
      marketCap: coinData.marketCap,
      dailySuperSuperTrend: coinData.dailySuperSuperTrend,
      weeklySuperSuperTrend: coinData.weeklySuperSuperTrend,
    }
  })

  const screens = useBreakPoint();

  let columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'coinData',
      fixed: hydrated ? (screens.lg ? null : 'left') : null,
      sorter: (a, b) => a.coinData.name.localeCompare(b.coinData.name),
      render: (coinData, data) => {
        const isCoinWatched = watchlistCoins.includes(data.id)
        return (
          <span>
            <WatchlistStar active={isCoinWatched} onClick={() => toggleCoin(data.id)} />
            <Link href={`/coin/${data.id}`} className={indexTableStyles.coin} passHref>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinData.images.small} alt={coinData.name} className={indexTableStyles.image} loading="lazy"/>
              <span className={indexTableStyles.name}>{coinData.name}</span>
              <span className={indexTableStyles.symbol}>{coinData.symbol}</span>
            </Link>
          </span>
        );
      }
    },
    {
      width: 100,
      ...dailySuperSuperTrend(router, isHoverable),
    },
    {
      width: 100,
      ...weeklySuperSuperTrend(router, isHoverable),
    }
  ];

  columns.push(
  {
    width: 90,
    ...marketCap(router, hydrated)
  },
  {
    width: 120,
    ...exchangesCol(router, isHoverable, exchangeData)
  },
  {
    title: 'Derivatives',
    dataIndex: 'derivatives',
    width: 250,
    className: indexTableStyles.unclickableCell,
    render: (derivatives, data) => {
      return <span title="Top derivatives. Click to see more.">
        {derivatives.map((derivative) => {
          const onTagClick = () => {
            router.push(`/coin/${data.id}?tab=Trade&filter=Derivatives`)
          }
          return <Tag
            key={`${derivative.market}${derivative.symbol}`}
            onClick={onTagClick}
            className={indexTableStyles.clickableTag}
          >{derivative.symbol}</Tag>
        })}
      </span>;
    }
  }
  )

  return (
    <Table
      columns={columns}
      dataSource={tableData}
      rowClassName={indexTableStyles.row}
      pagination={{ position: ['none', 'none'], pageSize: 1000 }}
      bordered
      className={indexTableStyles.table}
      {...useVirtualTable()}
    />
  )
}

export default HomePageTable
