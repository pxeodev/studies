import { Space } from 'antd'
import classnames from 'classnames';
import { useContext } from 'react'

import styles from "../styles/socials.module.less"
import DarkModeSwitch from './DarkModeSwitch'
import { DarkModeContext } from '../layouts/screener.js'

const Socials = ({ collapsed }) => {
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  return (
    <Space size={16} className={classnames(styles.socials, { [styles.collapsed]: collapsed })} direction={collapsed ? "vertical" : "horizontal"}>
      <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/discord.svg" alt="Discord Logo" />
      </a>
      <a href="https://x.com/coinrotatorapp" target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/x3.svg" alt="X Logo" />
      </a>
      <a href="https://www.tiktok.com/@coinrotator" target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tiktok.svg" alt="TikTok Logo" />
      </a>
      <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/telegram.svg" alt="Telegram Logo" />
      </a>
      <a href="https://www.youtube.com/@coinrotator" target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/youtube.svg" alt="YouTube Logo" />
      </a>
      <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />
    </Space>
  );
}

export default Socials