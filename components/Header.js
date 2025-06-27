import { Layout, Menu } from 'antd'

import Logo from './Logo'
import Search from './Search'
import NavigationModal from './NavigationModal'
import Web3AuthConnectButton from './Web3AuthConnectButton'

import headerStyles from '../styles/header.module.less'

const Header = ({ categories, screens, topCategories }) => {
  const { Header: AntHeader } = Layout;

  if (screens.lg) return (<></>);

  const menuItems = [
    {
      label: <Logo />,
      className: headerStyles.logo,
      key: 'logo',
      'data-id': 'logo'
    },
    {
      key: 'connect',
      className: headerStyles.connect,
      label: <Web3AuthConnectButton collapsed />
    },
    {
      key: 'search',
      className: headerStyles.search,
      label: <Search categories={categories} collapsed />
    },
    {
      key: 'dark-mode',
      className: headerStyles.navigation,
      label: <NavigationModal topCategories={topCategories} />
    }
  ]

  return (
    <AntHeader className={headerStyles.header}>
      <Menu
        mode="horizontal"
        items={menuItems}
        style={{
          minWidth: '280px',
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between'
        }}
        disabledOverflow
      />
    </AntHeader>
  );
}

export default Header