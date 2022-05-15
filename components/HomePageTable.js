import { Table, Tooltip } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { QuestionCircleFilled } from '@ant-design/icons';
import { useMemo } from 'react';
import { VList } from 'virtuallist-antd'

import UpTag from './UpTag'
import DownTag from './DownTag'
import HodlTag from './HodlTag'
import styles from '../styles/index.module.less'
import { signals } from '../utils/variables'
import getTrends from '../utils/getTrends'
import useBreakPoint from '../hooks/useBreakPoint'
import useIsHoverable from '../hooks/useIsHoverable';
import classNames from 'classnames';

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
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesPortfolio &&
           matchesCategory
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
      dailyChange: coinData.dailyChange,
      weeklyChange: coinData.weeklyChange,
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
            <a className={styles.fakeLink}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinData.images.large} alt={coinData.name} className={styles.tableCoinThumb} loading="lazy"/>
              <span className={styles.tableCoinName}>{coinData.name}</span>
              <span className={styles.tableCoinSymbol}>{coinData.symbol}</span>
            </a>
          </Link>
        )
      }
    },
    {
      width: 120,
      title: <span className={styles.signalTitle}>
        <span>{showWeeklySignals ? 'Daily ' : ''}Trend</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily. NFA."
        >
          <QuestionCircleFilled className={styles.signalExplanation} />
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
            tag = <UpTag className={styles.tableTag} />
            break
          case signals.sell:
            tag = <DownTag className={styles.tableTag} />
            break
          default:
            tag = <HodlTag className={styles.tableTag} />
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
            tag = <UpTag className={styles.tableTag} />
            break
          case signals.sell:
            tag = <DownTag className={styles.tableTag} />
            break
          default:
            tag = <HodlTag className={styles.tableTag} />
        }

        return (
          <>
            {tag}

          </>
        )
      }
    })
  }

  columns.push({
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
    title: '24h Change',
    dataIndex: 'dailyChange',
    width: 130,
    sorter: (a, b) => a.dailyChange - b.dailyChange,
    render: (dailyChange) => {
      return (<span className={classNames(styles.tableNumberNegative, { [styles.tableNumberPositive]: dailyChange >= 0 })}>{numberFormatter.format(dailyChange)}%</span>)
    }
  },
  {
    title: '7d Change',
    dataIndex: 'weeklyChange',
    width: 130,
    sorter: (a, b) => a.weeklyChange - b.weeklyChange,
    render: (weeklyChange) => {
      return (<span className={classNames(styles.tableNumberNegative, { [styles.tableNumberPositive]: weeklyChange >= 0 })}>{numberFormatter.format(weeklyChange)}%</span>)
    }
  })

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
      rowClassName={styles.tableRow}
      pagination={{ position: ['none', 'none'], pageSize: 1000 }}
      bordered
      className={styles.coinsTable}
      scroll={{
				y: tableHeight
			}}
      components={vComponents}
    />
  )
}

export default HomePageTable