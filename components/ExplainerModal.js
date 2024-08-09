import { Modal } from 'antd'
import { InfoCircleFilled } from "@ant-design/icons"
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router'

import styles from "../styles/explainerModal.module.less"
import useBreakPoint from '../hooks/useBreakPoint';
import ChatGPTSource from './ChatGPTSource';

const ExplainerModal = ({ title, explainer, showSource, lastUpdated }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter()
  useEffect(() => {
    const path = router.asPath
    const afterHash = path.split('#')[1]
    if (afterHash === 'description') {
      setModalVisible(true)
    }
  }, [router.asPath])
  const screens = useBreakPoint();
  const modalRef = useRef(null)
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
    },
    getContainer: () => modalRef.current,
  }
  return (
    <div ref={modalRef} style={{ background: 'transparent', display: 'inline-block' }}>
      <a href="#description">
        <InfoCircleFilled className={styles.explainer} onClick={() => setModalVisible(true)} />
      </a>
      <Modal {...modalProps}>
        {lastUpdated ? <div className={styles.lastUpdated}>Last Data Update: {new Intl.DateTimeFormat([]).format(lastUpdated)}</div> : <></>}
        <ReactMarkdown>{explainer}</ReactMarkdown>
        {showSource ? <ChatGPTSource /> : <></>}
      </Modal>
    </div>
  );
}

export default ExplainerModal