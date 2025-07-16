import { Tag, Tooltip } from 'antd'
import classnames from 'classnames'

import variableStyles from '../styles/variables.module.less'
import signalStyles from '../styles/signalTag.module.less'
import { useContext } from 'react'
import { DarkModeContext } from '../layouts/screener.js'
import useIsHoverable from '../hooks/useIsHoverable';

const UnavailableTag = () => {
  const [darkMode] = useContext(DarkModeContext);
  const isHoverable = useIsHoverable();
  return (
    <Tooltip
      trigger={isHoverable ? 'hover' : 'click'}
      title="Unvailable"
    >
      <Tag
        color={darkMode ? variableStyles.crGray4 : variableStyles.crGray9}
        className={classnames(signalStyles.tag, signalStyles.unavailable)}
      >NA</Tag>
    </Tooltip>
  )
}

export default UnavailableTag