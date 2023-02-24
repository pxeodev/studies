import { Modal } from 'antd'
import { useState } from 'react'
import { MenuOutlined, CloseOutlined } from '@ant-design/icons'

import navigationStyles from '../styles/navigation.module.less'
import NavigationMenu from './NavigationMenu'
import Socials from './Socials'
import Funders from './Funders'

const NavigationModal = ({ topCategories }) => {
  const [navigationVisible, setNavigationVisible] = useState(false)
  const NavigationIcon = navigationVisible ? CloseOutlined : MenuOutlined
  return (
    <>
      <span className={navigationStyles.hamburgerButton}>
        <NavigationIcon onClick={() => setNavigationVisible(!navigationVisible)} />
      </span>
      <Modal
        open={navigationVisible}
        onCancel={() => setNavigationVisible(false)}
        className={navigationStyles.modal}
        footer={null}
        mask={false}
        closable={false}
      >
        <NavigationMenu topCategories={topCategories} onMenuItemSelected={() => setNavigationVisible(false)} />
        <Socials />
        <Funders />
      </Modal>
    </>
  );
}

export default NavigationModal