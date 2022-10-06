import { Tag } from 'antd'
import classnames from 'classnames'

import variableStyles from '../styles/variables.module.less'
import signalStyles from '../styles/signalTag.module.less'
import { useContext } from 'react'
import { DarkModeContext } from '../pages/_app'

const UpTag = ({ className = '' }) => {
  const [darkMode] = useContext(DarkModeContext);
  return <Tag className={classnames(signalStyles.tag, className)} color={variableStyles.successColor} style={{ color: darkMode ? variableStyles.black : variableStyles.white }}>UP</Tag>
}

export default UpTag