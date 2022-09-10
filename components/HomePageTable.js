import { Table, Tooltip, Tag } from 'antd'
import { QuestionCircleFilled } from '@ant-design/icons';
import { VList } from 'virtuallist-antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useMemo } from 'react';
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import classnames from 'classnames'

import UpTag from './UpTag'
import DownTag from './DownTag'
import HodlTag from './HodlTag'
import useBreakPoint from '../hooks/useBreakPoint'
import useIsHoverable from '../hooks/useIsHoverable';
import getTrends from '../utils/getTrends'
import { signals, preferredExchanges } from '../utils/variables'

import indexTableStyles from '../styles/indexTable.module.less';
import baseStyles from '../styles/base.module.less'

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
    atrPeriods,
    multiplier,
    exchanges,
    derivatives,
  }) => {

  const router = useRouter()
  const isHoverable = useIsHoverable()
  const superTrends = useMemo(() => {
    const cache = {}
    coinsData.forEach(coin => {
      cache[coin.id] = getTrends(coin.ohlcs, atrPeriods, multiplier, false)
    })
    return cache
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atrPeriods, multiplier])
  const weeklySuperTrends = useMemo(() => {
    const cache = {}
    coinsData.forEach(coin => {
      cache[coin.id] = getTrends(coin.ohlcs, atrPeriods, multiplier, true)
    })
    return cache
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atrPeriods, multiplier])
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
  displayedCoinData = displayedCoinData.map((coinData) => {
    const [weeklyTrends, weeklySuperSuperTrend] = weeklySuperTrends[coinData.id]
    const [dailyTrends, dailySuperSuperTrend] = superTrends[coinData.id]

    return {
      ...coinData,
      dailyTrends,
      dailySuperSuperTrend,
      weeklyTrends,
      weeklySuperSuperTrend,
    }
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
    let shownExchanges = coinData.exchanges.sort((exchange) => preferredExchanges.includes(exchange[0]) ? -1 : 1)
    shownExchanges = shownExchanges.slice(0, 5)
    return {
      key: `${coinData.id}-${coinData.name}`,
      coinData: {
        id: coinData.id,
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
  const numberFormatter = new Intl.NumberFormat([], {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  let columns = [
    {
      title: 'Coin',
      width: 200,
      dataIndex: 'coinData',
      fixed: screens.lg ? null : 'left',
      sorter: (a, b) => a.coinData.name.localeCompare(b.coinData.name),
      render: (coinData) => {
        return (
          <Link href={`/coin/${coinData.id}`}>
            <a className={indexTableStyles.coin}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinData.images.large} alt={coinData.name} className={indexTableStyles.image} loading="lazy"/>
              <span className={indexTableStyles.name}>{coinData.name}</span>
              <span className={indexTableStyles.symbol}>{coinData.symbol}</span>
            </a>
          </Link>
        )
      }
    },
    {
      width: 100,
      title: <span className={indexTableStyles.columnTitle}>
        <span>Trend (24h)</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily at 7AM UTC. NFA."
        >
          <QuestionCircleFilled className={baseStyles.tooltipIcon} />
        </Tooltip>
      </span>,
      dataIndex: 'dailySuperSuperTrend',
      sorter: {
        compare: (a, b, sortOrder) => {
          if (a.dailySuperSuperTrend === b.dailySuperSuperTrend) {
            if (sortOrder === 'ascend') {
              return a.marketCap < b.marketCap ? 1 : -1
            } else {
              return b.marketCap < a.marketCap ? 1 : -1
            }
          } else {
            if (a.dailySuperSuperTrend === signals.sell) {
              return 1
            } else if (a.dailySuperSuperTrend === signals.hodl) {
              if (b.dailySuperSuperTrend === signals.sell) {
                return -1
              } else {
                return 1
              }
            } else {
              return -1
            }
          }
        },
        multiple: 1,
      },
      render: (dailySuperSupertrend) => {
        let tag;
        switch (dailySuperSupertrend) {
          case signals.buy:
            tag = <UpTag className={indexTableStyles.tag} />
            break
          case signals.sell:
            tag = <DownTag className={indexTableStyles.tag} />
            break
          default:
            tag = <HodlTag className={indexTableStyles.tag} />
        }

        return (
          <>
            {tag}

          </>
        )
      }
    },
    {
      width: 100,
      title: <span className={indexTableStyles.columnTitle}>
        <span>Trend (7d)</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily at 7AM UTC. NFA."
        >
          <QuestionCircleFilled className={baseStyles.tooltipIcon} />
        </Tooltip>
      </span>,
      dataIndex: 'weeklySuperSuperTrend',
      sorter: {
        compare: (a, b) => {
          if (a.weeklySuperSuperTrend === b.weeklySuperSuperTrend) {
            return 0
          } else if (a.weeklySuperSuperTrend === signals.sell) {
            return 1
          } else if (a.weeklySuperSuperTrend === signals.hodl) {
            if (b.weeklySuperSuperTrend === signals.sell) {
              return -1
            } else {
              return 1
            }
          } else {
            return -1
          }
        },
        multiple: 2,
      },
      render: (weeklySuperSuperTrend) => {
        let tag;
        switch (weeklySuperSuperTrend) {
          case signals.buy:
            tag = <UpTag className={indexTableStyles.tag} />
            break
          case signals.sell:
            tag = <DownTag className={indexTableStyles.tag} />
            break
          default:
            tag = <HodlTag className={indexTableStyles.tag} />
        }

        return (
          <>
            {tag}

          </>
        )
      }
    }
  ];

  columns.push(
  {
    title: 'Market Cap',
    dataIndex: 'marketCap',
    width: 90,
    sorter: (a, b) => Number(a.marketCap) - Number(b.marketCap),
    render: (marketCap) => {
      return (
        <>
          {numberFormatter.format(Number(marketCap))}
        </>
      )
    }
  },
  {
    title: <span className={indexTableStyles.columnTitle}>
      <span>Exchanges</span>
      <Tooltip
          placement={'right'}
          trigger={isHoverable ? 'hover' : 'click'}
          title="All the exchanges this coin is traded on"
      >
        <QuestionCircleFilled className={baseStyles.tooltipIcon} />
      </Tooltip>
    </span>,
    dataIndex: 'exchanges',
    width: 120,
    className: indexTableStyles.unclickableCell,
    onCell: () => ({ onClick: (e) => {
      e.stopPropagation();
    }}),
    render: (exchanges, data) => {
      return <span title="Top 5 exchanges. Click to see more.">
        {exchanges.map((exchange) => {
          const matchingExchange = exchangeData.find(ex => ex.name === exchange[0])
          const onTagClick = (e) => {
            e.stopPropagation()
            router.push(`/coin/${data.coinData.id}#markets`)
          }
          // eslint-disable-next-line @next/next/no-img-element
          return <img
            src={matchingExchange.image}
            alt={exchange[0]}
            title={exchange[0]}
            loading="lazy"
            key={exchange[0]}
            onClick={onTagClick}
            className={classnames(indexTableStyles.clickableTag, indexTableStyles.image)}
          />
        })}
      </span>;
    }
  },
  {
    title: 'Derivatives',
    dataIndex: 'derivatives',
    width: 250,
    className: indexTableStyles.unclickableCell,
    onCell: () => ({ onClick: (e) => {
      e.stopPropagation();
    }}),
    render: (derivatives, data) => {
      return <span title="Top derivatives. Click to see more.">
        {derivatives.map((derivative) => {
          const onTagClick = (e) => {
            // e.stopPropagation()
            router.push(`/coin/${data.coinData.id}#markets`)
          }
          return <Tag
            key={derivative.symbol}
            onClick={onTagClick}
            className={indexTableStyles.clickableTag}
          >{derivative.symbol}</Tag>
        })}
      </span>;
    }
  }
  )

  // The table rows are 56px high.
  const tableHeight = 9 * 56;
  const vComponents = useMemo(() => {
		return VList({
			height: tableHeight
		})
	}, [tableHeight])

  return (
    <Table
      columns={columns}
      dataSource={tableData}
      onRow={(coin) => ({ onClick: () => {
        router.push(`/coin/${coin.coinData.id}`);
      }}) }
      rowClassName={indexTableStyles.row}
      pagination={{ position: ['none', 'none'], pageSize: 1000 }}
      bordered
      className={indexTableStyles.table}
      scroll={{
				y: tableHeight
			}}
      components={vComponents}
    />
  )
}

export default HomePageTable
