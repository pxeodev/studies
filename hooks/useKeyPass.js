import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi'

const useKeyPass = () => {
  const { address: walletAddress } = useAccount()
  const [hasKeyPass, setHasKeyPass] = useState(false)

  useEffect(() => {
    async function checkPassKey() {
      if (!walletAddress) {
        setHasKeyPass(false)
        return;
      }
      try {
        const response = await fetch(`/api/verify-keypass?walletAddress=${walletAddress}`)
        const hasKey = await response.json()
        setHasKeyPass(hasKey.ok)
      } catch(e) {
        setHasKeyPass(false)
        console.error(e)
      }
    }
    checkPassKey();
  }, [walletAddress])

  return hasKeyPass
}

export default useKeyPass