import { Tag } from 'antd'
import { useContext, useEffect, useState } from 'react';

import variableStyles from '../styles/variables.module.less'
import { DarkModeContext } from '../layouts/screener'

const LoadingTag = () => {
  const [darkMode] = useContext(DarkModeContext);
  let [colorIndex, setColorIndex] = useState(0)
  let colors = [variableStyles.geekBlue7, variableStyles.successColor, variableStyles.errorColor]
  if (darkMode) {
    colors = [variableStyles.primaryColor, variableStyles.successColor, variableStyles.errorColor]
  }
  useEffect(() => {
    const i = setInterval(() => {
      setColorIndex(colorIndex++)
    }, 500)
    return () => {
      clearInterval(i)
    }
  }, [])
  return <Tag size="small" color={colors[colorIndex % colors.length]} style={{filter: 'opacity(0.7)'}}>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  </Tag>
}

export default LoadingTag