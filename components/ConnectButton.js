import { Button, Modal } from 'antd'
import classnames from 'classnames';
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect } from 'wagmi'
import { useCallback, useState } from 'react';
import { useCookies } from 'react-cookie';

import connectButtonStyles from '../styles/connectButton.module.less';

const ConnectButton = ({ collapsed }) => {
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const { open: openNativeWalletConnect } = useWeb3Modal()
  const { address: nativeWalletAddress } = useAccount()
  const { disconnect: nativeDisconnect } = useDisconnect()
  const [cookies, , removeCookie] = useCookies(['user']);
  let telegramUserName, telegramId, telegramWalletAddress
  if (cookies.user) {
    telegramUserName = cookies.user.userName
    telegramId = cookies.user.telegramId
    telegramWalletAddress = cookies.user.walletAddress
  }
  const finalWalletAddress = nativeWalletAddress || telegramWalletAddress

  const openModalOrDisconnect = useCallback(() => {
    setLoginModalVisible(true)
  }, [setLoginModalVisible])
  const nativeConnectOrDisconnect = useCallback(() => {
    if (nativeWalletAddress) {
      nativeDisconnect()
    } else {
      openNativeWalletConnect()
    }
  }, [nativeWalletAddress, nativeDisconnect, openNativeWalletConnect])
  const telegramConnectOrDisconnect = useCallback(() => {
    if (telegramId) {
      removeCookie('user', { path: '/' })
    } else {
      // TODO: Correct tg bot link
      window.open('https://t.me/CRtesting_bot?start=_','_blank');
    }
  }, [telegramId, removeCookie])

  let text
  if (collapsed) {
    if (finalWalletAddress) {
      text = `0x${finalWalletAddress.slice(2, 4).toUpperCase()}...${finalWalletAddress.slice(-4).toUpperCase()}`
    }
  } else {
    if (finalWalletAddress) {
      text = `0x${finalWalletAddress.slice(2, 8).toUpperCase()}...${finalWalletAddress.slice(-8).toUpperCase()}`
    } else {
      text = 'Connect'
    }
  }

  return (
    <>
      <Button
        onClick={openModalOrDisconnect}
        className={classnames(connectButtonStyles.button, { [connectButtonStyles.connected]: Boolean(finalWalletAddress), [connectButtonStyles.collapsed]: collapsed })}
      >
        <span className={connectButtonStyles.text}>{text}</span>
        {finalWalletAddress ? <></> : <span className={connectButtonStyles.iconWrapper}>
          {/* A bit ugly but Ant and React are a PITA */}
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M12.2278 1.92038c-3.57423-.00937-6.71954 1.83985-8.5172 4.6336-.07968.12422.00938.28828.15703.28828h1.64766c.1125 0 .21797-.04922.28828-.13594.16406-.19922.33985-.3914.525-.57422.76406-.76172 1.65235-1.36172 2.64141-1.7789 1.02187-.43125 2.10942-.65157 3.23202-.65157 1.1227 0 2.2102.21797 3.232.65157.9891.41718 1.8774 1.01718 2.6414 1.7789.7641.76172 1.3618 1.65 1.7813 2.63672.4336 1.02188.6516 2.10708.6516 3.22968 0 1.1227-.2204 2.2078-.6516 3.2297-.4172.9867-1.0172 1.875-1.7813 2.6367-.764.7617-1.6523 1.3617-2.6414 1.7789a8.26698 8.26698 0 0 1-3.232.6516c-1.1226 0-2.21015-.2203-3.23202-.6516a8.2911 8.2911 0 0 1-2.64141-1.7789c-.18515-.1851-.35859-.3773-.525-.5742-.07031-.0867-.17812-.1359-.28828-.1359H3.86763c-.14765 0-.23906.164-.15703.2882 1.79532 2.7868 4.92657 4.6336 8.4914 4.6336 5.5359 0 10.0313-4.4554 10.0875-9.975.0563-5.60856-4.4461-10.16715-10.0617-10.18122ZM9.25873 14.6235v-1.7812H1.89935c-.10312 0-.1875-.0844-.1875-.1875v-1.3125c0-.1032.08438-.1875.1875-.1875h7.35938V9.37351c0-.15703.18281-.24609.30469-.14766l3.32578 2.62505a.1871.1871 0 0 1 .0719.1476c0 .0285-.0064.0566-.0189.0821a.18865.18865 0 0 1-.053.0656l-3.32578 2.625c-.12188.0961-.30469.0093-.30469-.1477Z" fill="currentColor"/></svg>
        </span>}
      </Button>
      <Modal
        open={loginModalVisible}
        onCancel={() => setLoginModalVisible(false)}
        footer={null}
        title="Connect"
        zIndex={10}
        className={connectButtonStyles.modal}
        centered
      >
        {finalWalletAddress ? null : (<p className={connectButtonStyles.modalDescription}>Connect your wallet or login with Telegram in order to access advanced features and/or use your Key Pass.</p>)}
        <div className={connectButtonStyles.modalButtons}>
          {!telegramWalletAddress && (
            <Button
              type="primary"
              onClick={nativeConnectOrDisconnect}
            >
              {nativeWalletAddress ? `Disconnect Wallet` : `Connect Wallet`}
            </Button>
          )}
          {!nativeWalletAddress && (
            <Button
              onClick={telegramConnectOrDisconnect}
            >
              {telegramId ? `Disconnect from Telegram` : `Connect Telegram`}
            </Button>
          )}
        </div>
      </Modal>
    </>
  )
}

export default ConnectButton