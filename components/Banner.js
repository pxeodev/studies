import { Button } from 'antd'
import useKeyPass from '../hooks/useKeyPass';
import headerStyles from '../styles/header.module.less'

const Banner = () => {
  const hasKeyPass = useKeyPass()
  if (hasKeyPass) {
    return <></>
  }
  return (
    <div className={headerStyles.banner}>
      <span>Take 2 minutes to get free Key Pass access.</span>
      <a href="https://zora.co/collect/base:0xdb20e21c95f9b3b1ffb98e765b6664aaf4d6aef6/1" rel="noopener noreferrer" target="_blank"><Button className={headerStyles.bannerButton} type="primary">Mint NFT</Button></a>
      <span>for Advanced Features.</span>
    </div>
  );
}

export default Banner