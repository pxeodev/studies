import { Table, Tooltip } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { QuestionCircleFilled } from '@ant-design/icons';
import { useMemo } from 'react';
import { VList } from 'virtuallist-antd'

import BuyTag from './BuyTag'
import SellTag from './SellTag'
import HodlTag from './HodlTag'
import styles from '../styles/index.module.less'
import { signals } from '../utils/variables'
import getTrends from '../utils/getTrends'
import useBreakPoint from '../utils/useBreakPoint';
import useIsHoverable from '../utils/useIsHoverable';
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
    let trends, superSupertrend;
    if (showWeeklySignals) {
      [trends, superSupertrend] = weeklySuperTrends[coinData.id]
    } else {
      [trends, superSupertrend] = superTrends[coinData.id]
    }

    return {
      ...coinData,
      trends,
      superSupertrend,
    }
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    let min = parseInt(trendLengthMin)
    min = isFinite(min) ? min : 0
    let max = parseInt(trendLengthMax)
    max = isFinite(max) ? max : Number.POSITIVE_INFINITY

    const trendValues = Object.values(coinData.trends)
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
      return coinData.superSupertrend === signals.buy
    } else if (trendType === signals.hodl) {
      return coinData.superSupertrend === signals.hodl
    } else if (trendType === signals.sell) {
      return coinData.superSupertrend === signals.sell
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
      superSupertrend: coinData.superSupertrend,
    }
  })

  const screens = useBreakPoint();

  const columns = [
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
      title: <>
        <span>Signal</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="CoinRotator signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include Buy, Sell and HODL. They are updated once daily. NFA."
        >
          <QuestionCircleFilled className={styles.signalExplanation} />
        </Tooltip>
      </>,
      dataIndex: 'superSupertrend',
      sorter: (a, b, sortOrder) => {
        if (a.superSupertrend === b.superSupertrend) {
          if (sortOrder === 'ascend') {
            return a.marketCap < b.marketCap ? 1 : -1
          } else {
            return b.marketCap < a.marketCap ? 1 : -1
          }
        } else {
          if (a.superSupertrend === signals.sell) {
            return -1
          } else if (a.superSupertrend === signals.hodl) {
            if (b.superSupertrend === signals.sell) {
              return 1
            } else {
              return -1
            }
          } else {
            return 1
          }
        }
      },
      render: (superSupertrend) => {
        let tag;
        switch (superSupertrend) {
          case signals.buy:
            tag = <BuyTag className={styles.tableTag} />
            break
          case signals.sell:
            tag = <SellTag className={styles.tableTag} />
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
    },
    {
      title: 'Market Cap',
      dataIndex: 'marketCap',
      width: 150,
      sorter: (a, b) => Number(a.marketCap) - Number(b.marketCap),
      render: (marketCap) => {
        const formatter = new Intl.NumberFormat([], {
          notation: 'compact',
          compactDisplay: 'long',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        return (
          <>
            {formatter.format(marketCap)}
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
        const formatter = new Intl.NumberFormat([], {
          notation: 'compact',
          compactDisplay: 'long',
          minimumFractionDigits: 1,
          maximumFractionDigits: 2
        })
        return (<span className={classNames(styles.tableNumberNegative, { [styles.tableNumberPositive]: dailyChange >= 0 })}>{formatter.format(dailyChange)}%</span>)
      }
    },
    {
      title: '7d Change',
      dataIndex: 'weeklyChange',
      width: 130,
      sorter: (a, b) => a.weeklyChange - b.weeklyChange,
      render: (weeklyChange) => {
        const formatter = new Intl.NumberFormat([], {
          notation: 'compact',
          compactDisplay: 'long',
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        })
        return (<span className={classNames(styles.tableNumberNegative, { [styles.tableNumberPositive]: weeklyChange >= 0 })}>{formatter.format(weeklyChange)}%</span>)
      }
    }
  ];

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