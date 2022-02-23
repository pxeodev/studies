import { Layout, Menu } from 'antd'

import styles from '../styles/header.module.less'
import Logo from './Logo'

const Header = () => {
  const { Header: AntHeader } = Layout;

  return (
    <AntHeader className={styles.header}>
      <Menu mode="horizontal">
        <Menu.Item key="logo" className={styles.logo} data-id="logo">
          <Logo />
        </Menu.Item>
        {/* <Menu.Item key="dark-mode"><DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode}/></Menu.Item> */}
      </Menu>
    </AntHeader>
  );
}

export default Header