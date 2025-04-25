import { useHydrated } from 'react-hydration-provider';
import ConnectButton from '../ConnectButton'

import gatingStyles from '../../styles/gating.module.less'

const NotConnected = ({feature = 'Advanced Data'}) => {
  const hydrated = useHydrated();

  return (
    <div>
      <span className={gatingStyles.text}>Please connect your wallet to access {feature}. Don’t have the CoinRotator Key Pass?&nbsp;</span>
      <a className={gatingStyles.link} href="https://coinrotator.medium.com/coinrotator-key-pass-guide-to-unlocking-v3-c126a79ead6c" target="_blank" rel="noopener noreferrer">Learn how to get it!</a>
      <div className={gatingStyles.buttonWrapper}>
        {hydrated && <ConnectButton />}
      </div>
    </div>
  )
}

export default NotConnected