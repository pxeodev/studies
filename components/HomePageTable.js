import { Table, Tooltip } from 'antd'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { QuestionCircleFilled } from '@ant-design/icons';

import BuyTag from './BuyTag'
import SellTag from './SellTag'
import HodlTag from './HodlTag'
import styles from '../styles/index.module.less'
import { signals } from '../utils/variables'
import getTrends from '../utils/getTrends'
import useIsHoverable from '../utils/useIsHoverable';

const HomePageTable = ({
    coinsData,
    marketCapMin,
    marketCapMax,
    trendLengthMin,
    trendLengthMax,
    trendType,
    coinNameFilter,
    coinsFilter,
    category,
    defaultCategory,
    atrPeriods,
    multiplier,
  }) => {

  const router = useRouter()
  const isHoverable = useIsHoverable()

  let displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    const coinSymbolLower = coinData.symbol.toLowerCase()
    const coinNameLower = coinData.name.toLowerCase()
    const matchesNameFilter = coinNameFilter === '' || coinsFilter.some((coinName) => coinNameLower.includes(coinName) || coinSymbolLower.includes(coinName))
    const matchesCategory = category === defaultCategory || coinData.categories.includes(category)
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesNameFilter &&
           matchesCategory
  })
  displayedCoinData = displayedCoinData.map((coinData) => {
    const [trends, superSupertrend] = getTrends(coinData.ohlcs, atrPeriods, multiplier)

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
    } else if (trendType === signals.sell) {
      return coinData.superSupertrend === signals.sell
    }
  })

  const tableData = displayedCoinData.map((coinData) => {
    const data = {
      coinData: {
        id: coinData.id,
        symbol: coinData.symbol,
        images: coinData.images,
        name: coinData.name
      },
      marketCap: coinData.marketCap,
      superSupertrend: coinData.superSupertrend,
    }

    for (const [quoteSymbol, trend] of Object.entries(coinData.trends)) {
      if (trend[0] === '') {
        data[quoteSymbol] = '-'
      } else {
        data[quoteSymbol] = `${trend[0]} (${trend[1]})`
      }
    }

    return data
  })

  const columns = [
    {
      title: 'Coin',
      dataIndex: 'coinData',
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
      title: <>
        <span>Signal</span>
        <Tooltip
            placement={'right'}
            trigger={isHoverable ? 'hover' : 'click'}
            title="Coinrotator signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include Buy, Sell and Hodl. They are updated once daily. NFA."
        >
          <QuestionCircleFilled className={styles.signalExplanation} />
        </Tooltip>
      </>,
      dataIndex: 'superSupertrend',
      width: 100,
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
      title: 'USD',
      dataIndex: 'usd',
      responsive: ['sm'],
    },
    {
      title: 'ETH',
      dataIndex: 'eth',
      responsive: ['sm'],
    },
    {
      title: 'BTC',
      dataIndex: 'btc',
      responsive: ['sm'],
    },
  ];

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
    />
  )
}

export default HomePageTable