import { Tooltip } from 'antd'
import { QuestionCircleFilled } from '@ant-design/icons'
import classnames from 'classnames'

import UpTag from '../components/UpTag'
import DownTag from '../components/DownTag'
import HodlTag from '../components/HodlTag'
import { signals } from 'coinrotator-utils/variables.mjs'
import tableSort from '../utils/tableSort'

import coinTableStyles from '../styles/table.module.less'
import baseStyles from '../styles/base.module.less'
import LoadingTag from '../components/LoadingTag'

export function dailySuperSuperTrend(router, isHoverable, reverseMarketCapSort, dataIndex = 'dailySuperSuperTrend') {
  return {
    onCell: (data) => ({ onClick: () => router.push(`/coin/${data.id}`) }),
    title: <span className={coinTableStyles.columnTitle}>
      <span>Trend (24h)</span>
      <Tooltip
          placement={'right'}
          trigger={isHoverable ? 'hover' : 'click'}
          title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily at 1AM UTC. NFA."
          >
        <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)}  />
      </Tooltip>
    </span>,
    dataIndex,
    sorter: {
      compare: tableSort(reverseMarketCapSort),
      multiple: 1,
    },
    render: (dailySuperSupertrend, data) => {
      if (!data?.dailySuperSuperTrendStreak) {
        return null
      }
      let tag;
      switch (dailySuperSupertrend) {
        case signals.buy:
          tag = <UpTag className={coinTableStyles.tag} />
          break
        case signals.sell:
          tag = <DownTag className={coinTableStyles.tag} />
          break
        case signals.hodl:
          tag = <HodlTag className={coinTableStyles.tag} />
          break
        default:
          tag = <LoadingTag />
      }

      return <>{tag}</>
    }
  }
}

export function dailySuperSuperTrendStreak(router, isHoverable) {
  return {
    width: 150,
    onCell: (data) => ({ onClick: () => router.push(`/coin/${data.id}`) }),
    title: <span className={coinTableStyles.columnTitle}>
      <span>Streak</span>
      <Tooltip
          placement={'right'}
          trigger={isHoverable ? 'hover' : 'click'}
          title="The Trend Streak is the number of consecutive days that the trend has been in an UP, HODL or DOWNtrend."
      >
        <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
      </Tooltip>
    </span>,
    dataIndex: 'dailySuperSuperTrendStreak',
    sorter: (a, b) => Number(a.dailySuperSuperTrendStreak) - Number(b.dailySuperSuperTrendStreak),
    render: (dailySuperSuperTrendStreak) => {
      return dailySuperSuperTrendStreak ? dailySuperSuperTrendStreak : null
    }
  }
}

export function weeklySuperSuperTrendStreak(router, isHoverable) {
  return {
    onCell: (data) => ({ onClick: () => router.push(`/coin/${data.id}`) }),
    title: <span className={coinTableStyles.columnTitle}>
      <span>Streak</span>
      <Tooltip
          placement={'right'}
          trigger={isHoverable ? 'hover' : 'click'}
          title="The Trend Streak is the number of consecutive weeks that the trend has been in an UP, HODL or DOWNtrend."
      >
        <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
      </Tooltip>
    </span>,
    dataIndex: 'weeklySuperSuperTrendStreak',
    sorter: (a, b) => Number(a.weeklySuperSuperTrendStreak) - Number(b.weeklySuperSuperTrendStreak),
    render: (weeklySuperSuperTrendStreak) => {
      return weeklySuperSuperTrendStreak
    }
  }
}

export function weeklySuperSuperTrend(router, isHoverable) {
  return {
    onCell: (data) => ({ onClick: () => router.push(`/coin/${data.id}`) }),
    title: <span className={coinTableStyles.columnTitle}>
      <span>Trend (7d)</span>
      <Tooltip
          placement={'right'}
          trigger={isHoverable ? 'hover' : 'click'}
          title="CoinRotator trend signals are based on SuperTrend and a proprietary sorting algorithm. Possible values include UP, DOWN and HODL. They are updated once daily at 1AM UTC. NFA."
      >
        <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
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
    render: (weeklySuperSuperTrend, data) => {
      if (!data?.weeklySuperSuperTrendStreak) {
        return null
      }
      let tag;
      switch (weeklySuperSuperTrend) {
        case signals.buy:
          tag = <UpTag className={coinTableStyles.tag} />
          break
        case signals.sell:
          tag = <DownTag className={coinTableStyles.tag} />
          break
        case signals.hodl:
          tag = <HodlTag className={coinTableStyles.tag} />
          break
        default:
          tag = <LoadingTag />
      }

      return (
        <>
          {tag}
        </>
      )
    }
  }
}

export function marketCap(router, hydrated) {
  const numberFormatter = new Intl.NumberFormat([], {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return {
    title: 'Market Cap',
    dataIndex: 'marketCap',
    onCell: (data) => ({ onClick: () => router.push(`/coin/${data.id}`) }),
    sorter: (a, b) => Number(a.marketCap) - Number(b.marketCap),
    render: (marketCap) => {
      if (!marketCap) { return null }
      return (
        <div className={coinTableStyles.value}>
          {hydrated ? numberFormatter.format(Number(marketCap)) : Number(marketCap)}
        </div>
      )
    }
  }
}