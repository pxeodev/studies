import { Modal } from 'antd'
import { useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'

import navigationStyles from '../styles/navigation.module.less'
import NavigationMenu from './NavigationMenu'
import Socials from './Socials'
import Funders from './Funders'

const NavigationModal = ({ topCategories }) => {
  const [navigationVisible, setNavigationVisible] = useState(false)
  return (
    <>
      <span classnames={navigationStyles.hamburgerButton}>
        <MenuOutlined onClick={() => setNavigationVisible(true)} />
      </span>
      <Modal
        open={navigationVisible}
        onCancel={() => setNavigationVisible(false)}
        className={navigationStyles.modal}
        footer={null}
      >
        <NavigationMenu topCategories={topCategories} />
        <Socials />
        <Funders />
      </Modal>
    </>
  );
}

export default NavigationModal