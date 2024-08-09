import { useEffect, useState } from 'react';

import useAccount from './useAccount.js';

const useKeyPass = () => {
  const finalWalletAddress = useAccount()
  const [hasKeyPass, setHasKeyPass] = useState(false)

  useEffect(() => {
    async function checkPassKey() {
      if (!finalWalletAddress) {
        setHasKeyPass(false)
        return;
      }
      try {
        const response = await fetch(`/api/verify-keypass?walletAddress=${finalWalletAddress}`)
        const hasKey = await response.json()
        setHasKeyPass(hasKey.ok)
      } catch(e) {
        setHasKeyPass(false)
        console.error(e)
      }
    }
    checkPassKey();
  }, [finalWalletAddress])

  return hasKeyPass
}

export default useKeyPass