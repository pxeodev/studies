import { Button, notification } from 'antd'
import detectEthereumProvider from '@metamask/detect-provider'
import { useEffect, useState, useCallback } from 'react';

import variableStyles from '../styles/variables.module.less'

const ConnectButton = () => {
  const [provider, setProvider] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    async function setProviderAndCheckConnection() {
      const provider = await detectEthereumProvider()
      setProvider(provider)
      const accounts = await provider.request({ method: 'eth_accounts' })
      if (accounts?.[0]) {
        setWalletAddress(accounts[0])
      }
      provider.on('accountsChanged', (accounts) => setWalletAddress(accounts?.[0]))
    }
    setProviderAndCheckConnection();
  }, [])
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
  }, [provider, walletAddress])
  const shortenedWalletAddress = walletAddress && `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  return (
    <Button
      type="primary"
      style={{ backgroundColor: variableStyles.primaryColor }}
      onClick={connect}
      disabled={disabled}
    >
      {walletAddress ? shortenedWalletAddress : 'Connect'}
    </Button>
  )
}

export default ConnectButton