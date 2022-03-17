import { useCallback } from 'react';
import { notification } from 'antd'

const MetaMaskButton = ({ symbol, address, decimals=18, image, className }) => {
  const addCoin = useCallback((e) => {
    e.stopPropagation();
    const addMetamaskCoin = async () => {
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
  }, [image, symbol, address, decimals]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img
    className={className}
    styles={{ cursor: 'pointer' }}
    src="/metamask.svg"
    alt={symbol}
    onClick={addCoin}
  />
}

export default MetaMaskButton