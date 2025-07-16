import { signals } from 'coinrotator-utils/variables.mjs'

export default function tableSort(reverseMarketCapSort) {
  return function(a, b, sortOrder) {
    if (a.dailySuperSuperTrend === b.dailySuperSuperTrend) {
      let sorting = Number(b.marketCap) < Number(a.marketCap) ? 1 : -1
      if (sortOrder === 'ascend') {
        sorting *= -1
      }
      if (reverseMarketCapSort) {
        sorting *= -1
      }
      return sorting
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
  }
}