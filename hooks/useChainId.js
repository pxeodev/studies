import detectEthereumProvider from '@metamask/detect-provider'
import { useState, useEffect } from 'react';

const useChainId = () => {
  const [currentChainId, setCurrentChainId] = useState(null)
  useEffect(() => {
    detectEthereumProvider().then((provider) => {
      const getCurrentId = async () => {
        const chainId = await provider.request({
          method: 'eth_chainId',
        })

        setCurrentChainId(parseInt(chainId))
      }

      getCurrentId();

      const changeHandler = (chainId) => setCurrentChainId(parseInt(chainId))
      provider.on('chainChanged', changeHandler);
      return () => provider.removeListener('chainChanged', changeHandler);
    })
  }, [])

  return currentChainId
}

export default useChainId