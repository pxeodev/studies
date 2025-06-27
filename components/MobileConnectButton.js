import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import Web3AuthConnectButton from './Web3AuthConnectButton';
import styles from '../styles/mobileConnect.module.less';

const MobileConnectButton = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { loggedIn } = useWeb3Auth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on desktop or if already logged in
  if (!isMobile || loggedIn) return null;

  return (
    <div className={styles.mobileConnectWrapper}>
      <Web3AuthConnectButton collapsed={false} />
    </div>
  );
};

export default MobileConnectButton;