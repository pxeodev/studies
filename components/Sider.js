import { Layout, Space, Radio, Menu } from 'antd'
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons'
import classnames from 'classnames'
import { useState, useContext } from 'react'

import Logo from './Logo'
import Search from './Search'
import DarkModeSwitch from './DarkModeSwitch'
import { DarkModeContext } from '../pages/_app'
import styles from "../styles/sider.module.less"

const TABS = {
  'screener': 'Screener',
  'resources': 'Resources'
}
const Sider = ({ categories, coins }) => {
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
            label: 'Watchlist',
            key: 'watchlist'
          }
        ]
      },
      {
        label: 'Top Categories',
        key: 'topcategories',
        children: [
          {
            label: 'Bitcoin',
            key: 'bitcoin'
          }
        ]
      }
    ]
  } else {
    menuItems = []
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
      />
      <Menu
        theme={darkMode ? 'dark' : 'light'}
        mode="inline"
        openKeys={['data', 'topcategories']}
        items={menuItems}
        expandIcon={null}
      />
      <div className={styles.footer}>
        Funded by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </div>
    </Layout.Sider>
  );
}

export default Sider