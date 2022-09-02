import { Table, Tooltip, Tag } from 'antd'
import { QuestionCircleFilled } from '@ant-design/icons';
import { VList } from 'virtuallist-antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useMemo } from 'react';
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'

import UpTag from './UpTag'
import DownTag from './DownTag'
import HodlTag from './HodlTag'
import useBreakPoint from '../hooks/useBreakPoint'
import useIsHoverable from '../hooks/useIsHoverable';
import getTrends from '../utils/getTrends'
import { signals } from '../utils/variables'

import indexTableStyles from '../styles/indexTable.module.less';

const HomePageTable = ({
    coinsData,
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
    showWeeklySignals,
    showExchanges,
    exchanges,
    showDerivatives
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
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesPortfolio &&
           matchesCategory &&
           matchesExchanges
  })
  displayedCoinData = displayedCoinData.map((coinData) => {
    if (showWeeklySignals) {
      const [weeklyTrends, weeklySuperSuperTrend] = weeklySuperTrends[coinData.id]
      coinData = {
        ...coinData,
        weeklyTrends,
        weeklySuperSuperTrend,
      }
    }
    const [dailyTrends, dailySuperSuperTrend] = superTrends[coinData.id]

    return {
      ...coinData,
      dailyTrends,
      dailySuperSuperTrend,
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
    return {
      key: `${coinData.id}-${coinData.name}`,
      coinData: {
        id: coinData.id,
        symbol: coinData.symbol,
        images: coinData.images,
        name: coinData.name
      },
      exchanges: coinData.exchanges,
      derivatives: coinData.derivatives,
      marketCap: coinData.marketCap,
      dailySuperSuperTrend: coinData.dailySuperSuperTrend,
      weeklySuperSuperTrend: coinData.weeklySuperSuperTrend,
    }
  })

  const screens = useBreakPoint();
  const numberFormatter = new Intl.NumberFormat([], {
    notation: 'compact',
    compactDisplay: 'long',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  let columns = [
    {
      title: 'Coin',
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
      width: 120,
      title: <span className={indexTableStyles.columnTitle}>
        <span>{showWeeklySignals ? 'Daily ' : ''}Trend</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily at 7AM UTC. NFA."
        >
          <QuestionCircleFilled className={indexTableStyles.columnTooltip} />
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
    }
  ];

  if (showWeeklySignals) {
    columns.push({
      width: 120,
      title: 'Weekly Trend',
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
    })
  }

  columns.push(
  {
    title: 'Market Cap',
    dataIndex: 'marketCap',
    width: 150,
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
    title: 'Exchanges',
    dataIndex: 'exchanges',
    render: (exchanges) => {
      return <>
        {exchanges.map((exchange) => {
          return <Tag key={exchange[0]}>{exchange[0]}</Tag>
        })}
      </>;
    }
  },
  {
    title: 'Derivatives',
    dataIndex: 'derivatives',
    render: (derivatives) => {
      return <>
        {derivatives.map((derivative) => {
          return <Tag key={derivative.symbol}>{derivative.symbol}</Tag>
        })}
      </>;
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
