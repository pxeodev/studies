import { Space, Tag, notification } from 'antd'
import capitalize from 'lodash/capitalize'

import CopyButton from '../components/CopyButton'
import MetaMaskButton from '../components/MetaMaskButton'
import styles from '../styles/contractTag.module.less'
import addToClipboard from '../utils/addToClipboard'

const ContractTag = ({ image, platform, symbol, address, decimals=18, chainData }) => {
  const displayedAddress = `${address.substr(0, 6)}...${address.substr(-4)}`

  const metamaskButton = <MetaMaskButton
    className={styles.metamask}
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
    <Tag className={styles.tag} onClick={() => {
      addToClipboard(address)
      showSuccessNotification()
    }}>
      <Space size={8}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* <img src={image} alt={symbol} className={styles.icon} /> */}
        <span><span className={styles.platform}>{capitalize(platform)}:</span> {displayedAddress}</span>
        {metamaskButton}
        <CopyButton text={address} after={showSuccessNotification}/>
      </Space>
    </Tag>
  );
};

export default ContractTag