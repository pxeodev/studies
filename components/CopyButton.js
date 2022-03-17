import { CopyFilled } from '@ant-design/icons';
import { useCallback } from 'react';

import addToClipboard from '../utils/addToClipboard';
import styles from '../styles/copyButton.module.less';

const CopyButton = ({ text, after }) => {
  const onClick = useCallback((e) => {
    e.stopPropagation();
    const copy = async () => {
      await addToClipboard(text);
      if (after) {
        after();
      }
    }

    copy()
  }, [after, text]);
  return <CopyFilled className={styles.icon} onClick={onClick} color="red"/>
}

export default CopyButton