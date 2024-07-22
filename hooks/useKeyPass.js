import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi'
import { useCookies } from 'react-cookie';

const useKeyPass = () => {
  const { address: walletAddress } = useAccount()
  const [cookies] = useCookies(['user']);
  const telegramWalletAddress = cookies?.user?.walletAddress
  const finalWalletAddress = walletAddress || telegramWalletAddress
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