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
            label: <Link href="watch-list"><a>Watchlist</a></Link>,
            key: 'watch-list',
            icon: <StarFilled className={styles.sunsetOrange} />
          },
          {
            label: <Link href="trends"><a>Trends</a></Link>,
            key: 'trends',
            icon: <UpCircleFilled className={styles.polarGreen} />
          },
          {
            label: <Link href="market-health"><a>Market Health</a></Link>,
            key: 'market-health',
            icon: <HeartFilled className={styles.dustRed} />
          },
          {
            label: <Link href="top-coins"><a>Top Coins</a></Link>,
            key: 'top-coins',
            icon: <RiseOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="gainers-and-losers"><a>Gainers & Losers</a></Link>,
            key: 'gainers-and-losers',
            icon: <LineChartOutlined className={styles.goldenPurple} />
          },
          {
            label: <Link href="new-pairs"><a>New Pairs</a></Link>,
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
            label: <Link href={`/?category=${category}`}><a>{category}</a></Link>,
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
            label: <Link href="faq"><a>FAQ</a></Link>,
            key: 'faq',
            icon: <QuestionCircleFilled className={styles.sunsetOrange} />
          },
          {
            label: <Link href="terms"><a>Terms & Conditions</a></Link>,
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
            label: 'Bitcoin',
            key: 'bitcoin'
          }
        ]
      }
    ]
  }

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      collapsedWidth={56}
      width={240}
      trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
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
        Funded by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </div>
    </Layout.Sider>
  );
}

export default Sider