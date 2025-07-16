import { StarFilled } from '@ant-design/icons';
import classnames from 'classnames'

import styles from "../styles/watchliststar.module.less"

const WatchlistStar = ({ active, ...props }) => {
  return (
    <StarFilled
      className={classnames(styles.star, { [styles.active] : active })}
      {...props}
    />
  );
}

export default WatchlistStar