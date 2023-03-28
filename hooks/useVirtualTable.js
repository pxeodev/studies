import { useMemo, useState, useEffect } from 'react'
import { VList } from 'virtuallist-antd'

import useBreakPoint from './useBreakPoint';

const useVirtualTable = () => {
  // The table rows are 57px high, so we show 10 rows for SSR
  const [tableHeight, setTableHeight] = useState(10 * 57)
  const screens = useBreakPoint()
  useEffect(() => {
    const tablePadding = 24 + 16
    const headerHeight = 60
    const tableFilterHeight = 72
    const tableHeaderHeight = 76
    const pageHeaderHeight = 61
    let heightOfElementsOtherThanTable = tablePadding + headerHeight + tableFilterHeight + tableHeaderHeight
    if (!screens.lg || !screens.xl) {
      heightOfElementsOtherThanTable += pageHeaderHeight
    }
    if (!screens.sm) {
      heightOfElementsOtherThanTable -= tablePadding
    }
    setTableHeight(window.innerHeight - heightOfElementsOtherThanTable)
  }, [screens])
  const vComponents = useMemo(() => {
		return VList({
			height: tableHeight
		})
	}, [tableHeight])

  return {
    scroll: {
      y: tableHeight
    },
    components: vComponents
  }
}

export default useVirtualTable;