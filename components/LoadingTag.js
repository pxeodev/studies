import { Tag } from 'antd'
import classnames from 'classnames'

import variableStyles from '../styles/variables.module.less'
import signalStyles from '../styles/signalTag.module.less'
import { useContext } from 'react'
import { DarkModeContext } from '../layouts/screener.js'

const LoadingTag = ({ className = '' }) => {
  const [darkMode] = useContext(DarkModeContext);
  return <Tag className={classnames(signalStyles.tag, className)} color={variableStyles.crGray9} style={{ color: darkMode ? variableStyles.black : variableStyles.white }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Tag>
}

export default LoadingTag