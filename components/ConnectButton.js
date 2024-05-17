import { Button, notification } from 'antd'
import { useState, useCallback, useContext } from 'react';

import { WalletContext } from '../layouts/screener';
import connectButtonStyles from '../styles/connectButton.module.less';

const ConnectButton = () => {
  const [walletAddress, setWalletAddress, provider] = useContext(WalletContext)
  const [disabled, setDisabled] = useState(false)

  const connect = useCallback(async () => {
    if (walletAddress) {
      return;
    }
    if (!provider) {
      notification.error({
        description: "Please install MetaMask",
      })
      return
    }
    setDisabled(true)
    const addAccount = async () => {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' })
        if (accounts) {
          notification.success({
            description: "Connected",
          })
        }
        setWalletAddress(accounts[0])
      } catch(e) {
        notification.error({
          description: "Failed to connect",
        })
        throw(e)
      } finally {
        setDisabled(false)
      }
    }

    addAccount()
  }, [provider, walletAddress, setWalletAddress])
  const shortenedWalletAddress = walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  return (
    <Button
      type="primary"
      onClick={connect}
      disabled={disabled}
      className={connectButtonStyles.button}
    >
      {walletAddress ? shortenedWalletAddress : 'Connect'}
    </Button>
  )
}

export default ConnectButton