import { Layout, Menu } from 'antd'

import Logo from './Logo'
import Search from './Search'

import headerStyles from '../styles/header.module.less'
import DarkModeSwitch from './DarkModeSwitch';
import { DarkModeContext } from '../pages/_app';
import { useContext } from 'react';

const Header = ({ categories, coins }) => {
  const { Header: AntHeader } = Layout;
  const [darkMode, setDarkMode] = useContext(DarkModeContext);

  return (
    <AntHeader className={headerStyles.header}>
      <Menu mode="horizontal">
        <Menu.Item key="logo" className={headerStyles.logo} data-id="logo">
          <Logo />
        </Menu.Item>
        <Menu.Item key="search" className={headerStyles.search}>
          <Search categories={categories} coins={coins} />
        </Menu.Item>
        <Menu.Item key="dark-mode" className={headerStyles.darkModeSwitchItem}><DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} /></Menu.Item>
      </Menu>
    </AntHeader>
  );
}

export default Header