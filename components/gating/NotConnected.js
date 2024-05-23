import ConnectButton from '../ConnectButton'

import gatingStyles from '../../styles/gating.module.less'

const NotConnected = () => {
  return (
    <div>
      <span className={gatingStyles.text}>Please connect your wallet to access CoinRotator’s Advanced Data. Don’t have the CoinRotator Key Pass?&nbsp;</span>
      <a className={gatingStyles.link} href="https://coinrotator.medium.com/c126a79ead6c" target="_blank" rel="noopener noreferrer">Learn how to get it!</a>
      <div className={gatingStyles.buttonWrapper}>
        <ConnectButton />
      </div>
    </div>
  )
}

export default NotConnected