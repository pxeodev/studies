import { Layout, Menu } from 'antd'

import Logo from './Logo'
import Search from './Search'

import headerStyles from '../styles/header.module.less'
import DarkModeSwitch from './DarkModeSwitch';
import { DarkModeContext } from '../pages/_app';
import { useContext } from 'react';

const Header = ({ categories, coins, screens }) => {
  const { Header: AntHeader } = Layout;
  const [darkMode, setDarkMode] = useContext(DarkModeContext);

  if (screens.lg) return (<></>);

  const menuItems = [
    {
      label: <Logo />,
      className: headerStyles.logo,
      key: 'logo',
      'data-id': 'logo'
    },
    {
      key: 'search',
      className: headerStyles.search,
      label: <Search categories={categories} coins={coins} collapsed />
    },
    {
      key: 'dark-mode',
      className: headerStyles.darkModeSwitchItem,
      label: <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />
    }
  ]

  return (
    <AntHeader className={headerStyles.header}>
      <Menu mode="horizontal" items={menuItems} />
    </AntHeader>
  );
}

export default Header