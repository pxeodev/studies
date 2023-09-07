import { Tag } from 'antd'
import classnames from 'classnames'
import { useContext } from 'react';

import variableStyles from '../styles/variables.module.less'
import signalStyles from '../styles/signalTag.module.less'
import { DarkModeContext } from '../layouts/screener';

const HodlTag = ({ className = '' }) => {
  const [darkMode] = useContext(DarkModeContext);
  return (
    <Tag
      className={classnames(signalStyles.tag, className)}
      color={darkMode ? variableStyles.primaryColor : variableStyles.geekBlue7 }
    >HODL</Tag>
  );
}

export default HodlTag