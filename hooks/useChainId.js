import { useState, useEffect } from 'react';

const useChainId = (provider) => {
  const [currentChainId, setCurrentChainId] = useState(null)
  useEffect(() => {
    if (!provider) { return; }
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
  }, [provider])

  return currentChainId
}

export default useChainId