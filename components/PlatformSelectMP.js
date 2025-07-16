import { Space, Tag, notification } from 'antd'
import capitalize from 'lodash/capitalize'
import { Client } from "react-hydration-provider";

import addToClipboard from '../utils/addToClipboard'
import CopyButton from '../components/CopyButton'
import MetaMaskButton from '../components/MetaMaskButton'

import platformSelectStyles from '../styles/platformSelect.module.less'

const PlatformSelectMP = ({ image, platform, symbol, address, decimals=18, chainData }) => {
  const displayedAddress = `${address.substr(0, 6)}...${address.substr(-4)}`

  const metamaskButton = <MetaMaskButton
    className={platformSelectStyles.metamaskButton}
    symbol={symbol}
    image={image}
    decimals={decimals}
    address={address}
    chainId={chainData?.id}
  />

  const showSuccessNotification = () => {
    notification.open({
      description: 'Smart contract address copied.'
    })
  }

  return (
    <Tag className={platformSelectStyles.mainPlatform} onClick={() => {
      addToClipboard(address)
      showSuccessNotification()
    }}>
      <Space size={8}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* <img src={image} alt={symbol} className={platformSelectStyles.icon} /> */}
        <span className={platformSelectStyles.text}><span>{capitalize(platform)}:</span> {displayedAddress}</span>
        <Client>{metamaskButton}</Client>
        <Client><CopyButton text={address} after={showSuccessNotification}/></Client>
      </Space>
    </Tag>
  );
};

export default PlatformSelectMP