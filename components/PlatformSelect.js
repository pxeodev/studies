import { Space, Select, notification } from 'antd'
import startCase from 'lodash/startCase';
import { Client } from "react-hydration-provider";

import CopyButton from './CopyButton'
import MetaMaskButton from './MetaMaskButton'
import PlatformSelectMP from './PlatformSelectMP';

import platformSelectStyles from '../styles/platformSelect.module.less'

// TODO: Remove this hack once we have the right names
const getChainData = (chainsData, platform, platformName) => {
  return chainsData.find(chain => chain.name.toLowerCase().includes(platformName.toLowerCase()) ||
  chain.name.toLowerCase().includes(platform.toLowerCase()))
}

const PlatformSelect = ({ images, platforms, symbol, chainsData }) => {
  const upperCaseSymbol = symbol.toUpperCase();
  let platformSelect;
  if (platforms.length > 1) {
    const platformOptions = platforms.slice(1).map((platformData) => {
      const [platform, address] = platformData
      const platformName = startCase(platform)
      const chainData = getChainData(chainsData, platform, platformName)
      const displayedAddress = `${address.substr(0, 6)}...${address.substr(-6)}`
      const metamaskButton = <MetaMaskButton
        className={platformSelectStyles.metamaskButton}
        symbol={upperCaseSymbol}
        image={images.large}
        address={address}
        chainId={chainData?.id}
      />
      const afterCopy = () => {
        notification.open({
          description: 'Smart contract address copied.'
        })
      }
      return {
        key: platform,
        className: platformSelectStyles.option,
        label: (
          <Space className={platformSelectStyles.space}>
            <Space direction="vertical" size={2}>
              <b>{platformName}</b>
              {displayedAddress}
            </Space>
            <Client>
              <span>
                {metamaskButton}
                <CopyButton text={address} after={afterCopy}/>
              </span>
            </Client>
          </Space>
        )
      }
    })
    platformSelect = (
      <Select
        options={platformOptions}
        placeholder="More"
        className={platformSelectStyles.selectPlatform}
        popupClassName={platformSelectStyles.selectDropdown}
        dropdownMatchSelectWidth={false}
      />
    )
  }

  const [firstPlatform, firstAddress] = platforms[0]
  const chainData = getChainData(chainsData, firstPlatform, startCase(firstPlatform))
  return (
    <Space size={12} wrap>
      <PlatformSelectMP
        image={images.large}
        platform={firstPlatform}
        symbol={upperCaseSymbol}
        address={firstAddress}
        chainData={chainData}
      />
      {platformSelect}
    </Space>
  );
};

export default PlatformSelect