import { Layout, Space } from 'antd'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import classnames from 'classnames'
import { useState, useContext, useEffect } from 'react'
import { useRouter } from 'next/router'

import Logo from './Logo'
import Search from './Search'
import Funders from './Funders'
import Socials from './Socials'
import NavigationMenu from './NavigationMenu'
import DarkModeSwitch from './DarkModeSwitch'
import ConnectButton from './ConnectButton.js'
import { DarkModeContext } from '../layouts/screener.js'
import styles from "../styles/sider.module.less"

const Sider = ({ topCategories, categories }) => {
  const { pathname } = useRouter()
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  const [collapsed, setCollapsed] = useState(pathname === '/toady')
  const [collapsing, setCollapsing] = useState(false)
  let Trigger = collapsed ? MenuUnfoldOutlined : MenuFoldOutlined

  useEffect(() => {
    setCollapsed(pathname === '/toady')
  }, [pathname])

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      collapsedWidth={56}
      onCollapse={(value) => {
        setCollapsing(true)
        setCollapsed(value)
        setTimeout(() => {
          setCollapsing(false)
        }, 100)
      }}
      width={240}
      trigger={<Trigger className={styles.trigger} />}
      className={classnames(styles.sidebar, {
        [styles.collapsed]: collapsed,
        [styles.collapsing]: collapsing,
      })}
    >
      <Logo className={styles.logo} showText={!collapsed} size={collapsed ? 32 : 24} />
      <Space size={12} className={styles.tools}>
        <Search categories={categories} collapsed={collapsed} />
        { collapsed ? <></> : <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />}
      </Space>
      <Space size={12} className={styles.connect}>
        { collapsed ? <></> : <ConnectButton /> }
      </Space>
      <NavigationMenu topCategories={topCategories} collapsed={collapsed} />
      <div className={styles.footer}>
        <Socials collapsed={collapsed} />
        {/* { collapsed ? <></> : <Funders />} */}
      </div>
    </Layout.Sider>
  );
}

export default Sider