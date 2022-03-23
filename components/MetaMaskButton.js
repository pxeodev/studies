import { useCallback } from 'react';
import { notification } from 'antd'

import useChainId from '../utils/useChainId';

const MetaMaskButton = ({ symbol, address, chainId, decimals=18, image, className }) => {
  const currentChainId = useChainId()
  const addCoin = useCallback((e) => {
    e.stopPropagation();
    const switchNetwork = async () => {
      if (currentChainId === chainId) { return; }
      try {
        await window.ethereum.request({
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
      await switchNetwork();
      let wasAdded;
      try {
        wasAdded = await window.ethereum.request({
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

export default MetaMaskButton