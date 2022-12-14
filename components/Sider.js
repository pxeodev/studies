import { Layout, Space, Radio, Menu } from 'antd'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  StarFilled,
  UpCircleFilled,
  HeartFilled,
  RiseOutlined,
  LineChartOutlined,
  AlertFilled,
  TeamOutlined,
  QuestionCircleFilled,
  ContainerFilled,
  VideoCameraFilled,
  ReadFilled
} from '@ant-design/icons'
import classnames from 'classnames'
import { useState, useContext } from 'react'
import Link from 'next/link'

import Logo from './Logo'
import Search from './Search'
import DarkModeSwitch from './DarkModeSwitch'
import { DarkModeContext } from '../pages/_app'
import styles from "../styles/sider.module.less"

const Sider = ({ topCategories, categories, coins }) => {
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  const [collapsed, setCollapsed] = useState(false)
  const menuItems = [
    {
      label: 'Screener Tools',
      key: 'screenertools',
      children: [
        {
          label: <Link href="watchlist">Watchlist</Link>,
          key: 'watchlist',
          icon: <StarFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="trends">Trends</Link>,
          key: 'trends',
          icon: <UpCircleFilled className={styles.polarGreen} />
        },
        {
          label: <Link href="market-health">Market Health</Link>,
          key: 'market-health',
          icon: <HeartFilled className={styles.dustRed} />
        },
        {
          label: <Link href="top-coins">Top Coins</Link>,
          key: 'top-coins',
          icon: <RiseOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="gainers-and-losers">Gainers & Losers</Link>,
          key: 'gainers-and-losers',
          icon: <LineChartOutlined className={styles.goldenPurple} />
        },
        {
          label: <Link href="new-pairs">New Pairs</Link>,
          key: 'new-pairs',
          icon: <AlertFilled className={styles.daybreakBlue} />
        },
      ]
    },
    {
      label: 'Tutorials',
      key: 'tutorials',
      children: [
        {
          label: <a href="https://youtu.be/OcyZcip24pM" target="_blank" rel="noreferrer">Video Tutorials</a>,
          key: 'video-tutorials',
          icon: <VideoCameraFilled className={styles.dustRed} />
        },
        {
          label: <a href="https://coinrotator.medium.com/how-to-search-the-most-profitable-altcoins-daily-d8ac02d52e23" target="_blank" rel="noreferrer">Article Tutorials</a>,
          key: 'article-tutorials',
          icon: <ReadFilled className={styles.gray} />
        }
      ]
    },
    {
      label: 'Top Categories',
      key: 'topcategories',
      children: topCategories.map((category) => {
        return {
          label: <Link href={`/?category=${category}`}>{category}</Link>,
          key: category
        }
      })
    },
    {
      label: 'About',
      key: 'about',
      children: [
        {
          label: 'Team',
          key: 'team',
          icon: <TeamOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="faq">FAQ</Link>,
          key: 'faq',
          icon: <QuestionCircleFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="terms">Terms & Conditions</Link>,
          key: 'terms',
          icon: <ContainerFilled className={styles.polarGreen} />
        }
      ]
    },
  ]
  let Trigger = MenuFoldOutlined
  if (collapsed) {
    Trigger = MenuFoldOutlined
  }

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      collapsedWidth={56}
      width={240}
      trigger={<Trigger className={styles.trigger} />}
      className={classnames(styles.sidebar, { [styles.collapsed]: collapsed })}
    >
      <Logo className={styles.logo} showText={!collapsed} />
      <Space size={12} className={styles.tools}>
        <Search categories={categories} coins={coins} collapsed={collapsed} />
        { collapsed ? <></> : <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />}
      </Space>
      <Menu
        theme={darkMode ? 'dark' : 'light'}
        mode="inline"
        openKeys={['screenertools', 'topcategories', 'tutorials', 'about']}
        items={menuItems}
        className={styles.menu}
        inlineIndent={0}
      />
      <div className={styles.footer}>
        <Space size={16} className={styles.socials}>
          <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/discord.svg" alt="Discord Logo" />
          </a>
          <a href="https://twitter.com/coinrotatorapp" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/twitter.svg" alt="Twitter Logo" />
          </a>
          <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/medium.svg" alt="Medium Logo" />
          </a>
          <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/telegram.svg" alt="Telegram Logo" />
          </a>
          <a href="https://www.youtube.com/@coinrotator" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/youtube.svg" alt="YouTube Logo" />
          </a>
        </Space>
        Funded by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </div>
    </Layout.Sider>
  );
}

export default Sider