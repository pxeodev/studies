import detectEthereumProvider from '@metamask/detect-provider'
import { useCallback } from 'react';
import { notification } from 'antd'

import useChainId from '../hooks/useChainId';

const MetaMaskButtonWithEthereum = ({ symbol, address, chainId, decimals=18, image, className }) => {
  const currentChainId = useChainId()
  const addCoin = useCallback((e) => {
    e.stopPropagation();
    const switchNetwork = async (provider) => {
      if (currentChainId === chainId) { return; }
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${Number(chainId).toString(16)}` }]
        })
      } catch (e) {
        notification.error({
          description: "Network switch failed, please switch to the right network manually",
        })
        throw(e)
      }
    }
    const addMetamaskCoin = async () => {
      const provider = await detectEthereumProvider()
      if (!provider) {
        notification.error({
          description: "Please install MetaMask",
        })
        return
      }
      await switchNetwork(provider);
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
  }, [image, symbol, address, decimals, chainId, currentChainId]);

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