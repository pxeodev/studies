import { Button, notification } from 'antd'
import { useState, useCallback, useContext } from 'react';
import classnames from 'classnames';

import { WalletContext } from '../layouts/screener';
import connectButtonStyles from '../styles/connectButton.module.less';

const ConnectButton = ({ collapsed }) => {
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
  let text
  if (collapsed) {
    if (walletAddress) {
      text = `0x${walletAddress.slice(2, 4).toUpperCase()}...${walletAddress.slice(-4).toUpperCase()}`
    }
  } else {
    if (walletAddress) {
      text = `0x${walletAddress.slice(2, 8).toUpperCase()}...${walletAddress.slice(-8).toUpperCase()}`
    } else {
      text = 'Connect Wallet'
    }
  }

  return (
    <Button
      onClick={connect}
      disabled={disabled}
      className={classnames(connectButtonStyles.button, { [connectButtonStyles.connected]: Boolean(walletAddress), [connectButtonStyles.collapsed]: collapsed })}
    >
      <span className={connectButtonStyles.text}>{text}</span>
      {walletAddress ? <></> : <span className={connectButtonStyles.iconWrapper}>
        {/* A bit ugly but Ant and React are a PITA */}
        {/* TODO: Then work on the gating screens on the advanced filters, again light/dark good */}
        <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M12.2278 1.92038c-3.57423-.00937-6.71954 1.83985-8.5172 4.6336-.07968.12422.00938.28828.15703.28828h1.64766c.1125 0 .21797-.04922.28828-.13594.16406-.19922.33985-.3914.525-.57422.76406-.76172 1.65235-1.36172 2.64141-1.7789 1.02187-.43125 2.10942-.65157 3.23202-.65157 1.1227 0 2.2102.21797 3.232.65157.9891.41718 1.8774 1.01718 2.6414 1.7789.7641.76172 1.3618 1.65 1.7813 2.63672.4336 1.02188.6516 2.10708.6516 3.22968 0 1.1227-.2204 2.2078-.6516 3.2297-.4172.9867-1.0172 1.875-1.7813 2.6367-.764.7617-1.6523 1.3617-2.6414 1.7789a8.26698 8.26698 0 0 1-3.232.6516c-1.1226 0-2.21015-.2203-3.23202-.6516a8.2911 8.2911 0 0 1-2.64141-1.7789c-.18515-.1851-.35859-.3773-.525-.5742-.07031-.0867-.17812-.1359-.28828-.1359H3.86763c-.14765 0-.23906.164-.15703.2882 1.79532 2.7868 4.92657 4.6336 8.4914 4.6336 5.5359 0 10.0313-4.4554 10.0875-9.975.0563-5.60856-4.4461-10.16715-10.0617-10.18122ZM9.25873 14.6235v-1.7812H1.89935c-.10312 0-.1875-.0844-.1875-.1875v-1.3125c0-.1032.08438-.1875.1875-.1875h7.35938V9.37351c0-.15703.18281-.24609.30469-.14766l3.32578 2.62505a.1871.1871 0 0 1 .0719.1476c0 .0285-.0064.0566-.0189.0821a.18865.18865 0 0 1-.053.0656l-3.32578 2.625c-.12188.0961-.30469.0093-.30469-.1477Z" fill="currentColor"/></svg>
      </span>}
    </Button>
  )
}

export default ConnectButton