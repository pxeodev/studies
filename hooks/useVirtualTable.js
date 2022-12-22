import { useMemo } from 'react'
import { VList } from 'virtuallist-antd'

const useVirtualTable = () => {
  // The table rows are 56px high.
  const tableHeight = 9 * 56;
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