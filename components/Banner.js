import headerStyles from '../styles/header.module.less'
import { Button } from 'antd'

const Banner = () => {
  return null;
  return (
    <div className={headerStyles.banner}>
      <span>$SHUMI launching on Virtuals August 22</span>
      <a href="https://app.virtuals.io/geneses/7272" target="_blank"><Button className={headerStyles.bannerButton} type="primary">Join Launch</Button></a>
    </div>
  );
}

export default Banner
