import { Modal } from 'antd'
import { InfoCircleFilled } from "@ant-design/icons"
import { useState } from "react"
import ReactMarkdown from 'react-markdown';

import styles from "../styles/explainerModal.module.less"
import useBreakPoint from '../hooks/useBreakPoint';
import ChatGPTSource from './ChatGPTSource';

const ExplainerModal = ({ title, explainer, showSource, lastUpdated }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const screens = useBreakPoint();
  const modalProps = {
    open: modalVisible,
    centered: screens.sm,
    onCancel: () => setModalVisible(false),
    className: styles.modal,
    title: title,
    footer: null,
    closeIcon: null,
    style: {
      top: screens.sm ? null : 20,
    }
  }
  return (
    <>
      <InfoCircleFilled className={styles.explainer} onClick={() => setModalVisible(true)} />
      <Modal {...modalProps}>
        {lastUpdated ? <div className={styles.lastUpdated}>Last Data Update: {new Intl.DateTimeFormat([]).format(lastUpdated)}</div> : <></>}
        <ReactMarkdown>{explainer}</ReactMarkdown>
        {showSource ? <ChatGPTSource /> : <></>}
      </Modal>
    </>
  );
}

export default ExplainerModal