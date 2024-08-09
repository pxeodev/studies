import detectEthereumProvider from '@metamask/detect-provider'
import { useCallback, useState, useEffect } from 'react';
import { notification } from 'antd'

import useChainId from '../hooks/useChainId';

const MetaMaskButtonWithEthereum = ({ symbol, address, chainId, decimals=18, image, className }) => {
  const [provider, setProvider] = useState(null)
  const currentChainId = useChainId(provider)
  useEffect(() => {
    detectEthereumProvider().then(setProvider)
  }, [])

  const addCoin = useCallback((e) => {
    e.stopPropagation();
    const switchNetwork = async (currentChainId) => {
      if (currentChainId === chainId) { return; }
      const prefixedChainId = `0x${chainId.toString(16)}`
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: prefixedChainId }]
        })
      } catch (e) {
        notification.error({
          description: "Network switch failed, please switch to the right network manually",
        })
        throw(e)
      }
    }
    const addMetamaskCoin = async () => {
      if (!provider) {
        notification.error({
          description: "Please install MetaMask",
        })
        return
      }
      await switchNetwork(currentChainId);
      let wasAdded;
      try {
        wasAdded = await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address,
              symbol,
              decimals,
              image,
            },
          },
        })
      } catch(e) { console.error(e) }

      if (!wasAdded) {
        notification.error({
          description: "Couldn't add coin to MetaMask",
        })
      }
    }

    addMetamaskCoin();
  }, [image, symbol, address, decimals, chainId, currentChainId, provider]);

  if (!chainId) { return null; }
  // eslint-disable-next-line @next/next/no-img-element
  return <img
    className={className}
    style={{ cursor: 'pointer' }}
    src="/metamask.svg"
    alt={symbol}
    onClick={addCoin}
  />
}

export default MetaMaskButtonWithEthereum