import { useHydrated } from 'react-hydration-provider';
import Web3AuthConnectButton from '../Web3AuthConnectButton'

import gatingStyles from '../../styles/gating.module.less'

const NotConnected = ({feature = 'Advanced Data'}) => {
  const hydrated = useHydrated();

  return (
    <div>
      <span className={gatingStyles.text}>Please connect your wallet to access {feature}.</span>
      <div className={gatingStyles.buttonWrapper}>
        {hydrated && <Web3AuthConnectButton />}
      </div>
    </div>
  )
}

export default NotConnected