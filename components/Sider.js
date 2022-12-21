import { Layout, Space } from 'antd'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'
import classnames from 'classnames'
import { useState, useContext } from 'react'

import Logo from './Logo'
import Search from './Search'
import Funders from './Funders'
import Socials from './Socials'
import NavigationMenu from './NavigationMenu'
import DarkModeSwitch from './DarkModeSwitch'
import { DarkModeContext } from '../pages/_app'
import styles from "../styles/sider.module.less"

const Sider = ({ topCategories, categories, coins }) => {
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  const [collapsed, setCollapsed] = useState(false)
  let Trigger = collapsed ? MenuUnfoldOutlined : MenuFoldOutlined

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
      <NavigationMenu topCategories={topCategories} collapsed={collapsed} />
      <div className={styles.footer}>
        <Socials />
        { collapsed ? <></> : <Funders />}
      </div>
    </Layout.Sider>
  );
}

export default Sider