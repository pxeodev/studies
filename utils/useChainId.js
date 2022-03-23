import { useState, useEffect } from 'react';

const useChainId = () => {
  const [currentChainId, setCurrentChainId] = useState(null)
  useEffect(() => {
    const getCurrentId = async () => {
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      })

      setCurrentChainId(parseInt(chainId))
    }

    getCurrentId();

    const changeHandler = (chainId) => setCurrentChainId(parseInt(chainId))
    window.ethereum.on('chainChanged', changeHandler);
    return () => window.ethereum.removeListener('chainChanged', changeHandler);
  }, [])

  return currentChainId
}

export default useChainId