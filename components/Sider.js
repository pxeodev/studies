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

const TABS = {
  'screener': 'Screener',
  'resources': 'Resources'
}
const Sider = ({ topCategories, categories, coins }) => {
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState(TABS.screener)
  let menuItems
  if (tab === TABS.screener) {
    menuItems = [
      {
        label: 'Data',
        key: 'data',
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
        label: 'Top Categories',
        key: 'topcategories',
        children: topCategories.map((category) => {
          return {
            label: <Link href={`/?category=${category}`}>{category}</Link>,
            key: category
          }
        })
      }
    ]
  } else {
    menuItems = [
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
      {
        label: 'YouTube',
        key: 'youtube',
        children: [
          {
            label: <a href="https://youtu.be/OcyZcip24pM" target="_blank" rel="noreferrer">Basic Tutorial</a>,
            key: 'tutorial',
            icon: <VideoCameraFilled className={styles.gray} />
          }
        ]
      },
      {
        label: 'Medium',
        key: 'medium',
        children: [
          {
            label: <a href="https://coinrotator.medium.com/how-to-search-the-most-profitable-altcoins-daily-d8ac02d52e23" target="_blank" rel="noreferrer">Find profitable Altcoins</a>,
            key: 'profitable-altcoins',
            icon: <ReadFilled className={styles.gray} />
          }
        ]
      }
    ]
  }
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
      <Space size={12}>
        <Search categories={categories} coins={coins} collapsed={collapsed} />
        { collapsed ? <></> : <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />}
      </Space>
      <Radio.Group
        value={tab}
        onChange={({ target: { value } }) => setTab(value)}
        options={[
          {
            label: TABS.screener,
            value: TABS.screener
          },
          {
            label: TABS.resources,
            value: TABS.resources
          }
        ]}
        optionType="button"
        buttonStyle="solid"
        className={styles.tabs}
      />
      <Menu
        theme={darkMode ? 'dark' : 'light'}
        mode="inline"
        openKeys={['data', 'topcategories', 'about', 'youtube']}
        items={menuItems}
        className={styles.menu}
        inlineIndent={0}
      />
      <div className={styles.footer}>
      <Space size={12} className={styles.socials}>
        <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/discord.svg" alt="Discord Logo" width={24} height={19} />
        </a>
        <a href="https://twitter.com/coinrotatorapp" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/twitter.svg" alt="Twitter Logo" width={24} height={20} />
        </a>
        <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5374 11.8277C13.5374 15.5984 10.5069 18.6552 6.76884 18.6552C3.03073 18.6552 0 15.5977 0 11.8277C0 8.05767 3.0305 5 6.76884 5C10.5072 5 13.5374 8.05698 13.5374 11.8277Z" className={styles.mediumIcon}/>
            <path d="M20.9628 11.8277C20.9628 15.377 19.4476 18.2555 17.5784 18.2555C15.7092 18.2555 14.194 15.377 14.194 11.8277C14.194 8.2784 15.709 5.39996 17.5782 5.39996C19.4473 5.39996 20.9626 8.27748 20.9626 11.8277" className={styles.mediumIcon}/>
            <path d="M24 11.8277C24 15.007 23.4671 17.586 22.8096 17.586C22.1522 17.586 21.6196 15.0077 21.6196 11.8277C21.6196 8.6477 22.1524 6.06946 22.8096 6.06946C23.4669 6.06946 24 8.64747 24 11.8277Z" className={styles.mediumIcon}/>
          </svg>
        </a>
        <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/telegram.svg" alt="Telegram Logo" width={24} height={24} />
        </a>
      </Space>
        Funded by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </div>
    </Layout.Sider>
  );
}

export default Sider