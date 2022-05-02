// TP
import { Layout, Menu } from 'antd'

// Components
import Logo from './Logo'

// Styles
import headerStyles from '../styles/header.module.less'


// Code
const Header = () => {
  const { Header: AntHeader } = Layout;

  return (
    <AntHeader className={headerStyles.header}>
      <Menu mode="horizontal">
        <Menu.Item key="logo" className={headerStyles.logo} data-id="logo">
          <Logo />
        </Menu.Item>
        {/* <Menu.Item key="dark-mode"><DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode}/></Menu.Item> */}
      </Menu>
    </AntHeader>
  );
}

export default Header