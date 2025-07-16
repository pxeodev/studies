import { Button } from 'antd'

import gatingStyles from '../../styles/gating.module.less'

const NoKeyPass = () => {
  return (
    <div>
      <span className={gatingStyles.text}>CoinRotator Key Pass hasn&apos;t been found in this wallet.</span>
      <div className={gatingStyles.buttonWrapper}>
        <a href="https://tally.so/r/wbLre0" rel="noopener noreferrer" target="_blank">
          <Button type="primary">Get your Key Pass</Button>
        </a>
      </div>
    </div>
  )
}

export default NoKeyPass