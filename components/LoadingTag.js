import { Skeleton } from 'antd'

import variableStyles from '../styles/variables.module.less'

const LoadingTag = () => {
  return <Skeleton.Button size="small" color={variableStyles.crGray9} style={{ height: 22 }} active>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  </Skeleton.Button>
}

export default LoadingTag