import headerStyles from '../styles/header.module.less'
import { Button } from 'antd'

const Banner = () => {
  return (
    <div className={headerStyles.banner}>
      <span>$SHUMI now trading on Virtuals</span>
      <a href="https://app.virtuals.io/virtuals/36228" target="_blank"><Button className={headerStyles.bannerButton} type="primary">Join Launch</Button></a>
    </div>
  );
}

export default Banner
