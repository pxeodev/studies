import { Modal } from 'antd'
import { InfoCircleFilled } from "@ant-design/icons"
import { useState } from "react"
import ReactMarkdown from 'react-markdown';

import styles from "../styles/pageheader.module.less"
import useBreakPoint from '../hooks/useBreakPoint';
import ChatGPTSource from './ChatGPTSource';

const PageHeader = ({ title, explainer, showSource, prefix, postfix }) => {
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
    <div className={styles.header}>
      {prefix}
      <h1 className={styles.title}>{title}</h1>
      {explainer && (
        <>
          <InfoCircleFilled className={styles.explainer} onClick={() => setModalVisible(true)} />
          <Modal {...modalProps}>
            <ReactMarkdown>{explainer}</ReactMarkdown>
            {showSource ? <ChatGPTSource /> : <></>}
          </Modal>
        </>
      )}
      {postfix}
    </div>
  );
}

export default PageHeader