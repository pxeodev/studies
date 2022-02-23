import { Tag } from 'antd'
import classnames from 'classnames'

import styles from '../styles/signalTags.module.less'
import variables from '../styles/variables.module.less'

const HodlTag = ({ className = '' }) => <Tag className={classnames(styles.tag, className)} color={variables.primaryColor}>HODL</Tag>

export default HodlTag