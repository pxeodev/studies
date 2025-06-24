import { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Space, Avatar, message } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import connectButtonStyles from '../styles/connectButton.module.less';

const Web3AuthConnectButton = ({ collapsed }) => {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const {
    user,
    loggedIn,
    isLoading,
    login,
    logout,
    getAccounts,
    initializationComplete,
    initializationError
  } = useWeb3Auth();
  const [walletAddress, setWalletAddress] = useState(null);

  const handleLogin = useCallback(async () => {
    setIsLoggingIn(true);
    message.loading({ content: 'Connecting...', key: 'login' });

    try {
      if (initializationError) {
        throw new Error(`Web3Auth initialization error: ${initializationError}`);
      }
      if (!initializationComplete) {
        throw new Error('Web3Auth is still initializing. Please wait a moment.');
      }

      const result = await login();
      if (result?.address) {
        setWalletAddress(result.address);
        message.success({ content: 'Successfully connected!', key: 'login', duration: 3 });
      } else {
        throw new Error('Connection failed. Please try again.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      let errorMessage = 'Connection failed. Please try again.';
      
      // Enhanced error handling based on Web3Auth documentation
      if (error.message?.includes('cancelled') || error.message?.includes('user_cancelled')) {
        errorMessage = 'Connection cancelled by user.';
      } else if (error.message?.includes('popup_blocked') || error.message?.includes('popup')) {
        errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
      } else if (error.message?.includes('initializing') || error.message?.includes('not initialized')) {
        errorMessage = 'Web3Auth is still initializing. Please wait a moment and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('JWT') || error.message?.includes('token')) {
        errorMessage = 'Authentication token error. Please try logging in again.';
      } else if (error.code === 4001) {
        errorMessage = 'User rejected the connection request.';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Please check your wallet.';
      }
      
      message.error({ content: errorMessage, key: 'login', duration: 5 });
    } finally {
      setIsLoggingIn(false);
    }
  }, [login, initializationComplete, initializationError]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setWalletAddress(null);
      setAccountModalVisible(false);
      message.success('Disconnected successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      message.error('Logout failed. Please try again.');
    }
  }, [logout]);

  const openAccountModal = useCallback(() => {
    setAccountModalVisible(true);
  }, []);

  const closeAccountModal = useCallback(() => {
    setAccountModalVisible(false);
  }, []);

  // Get display text for button
  const getDisplayText = useCallback(async () => {
    if (!loggedIn) return 'Connect';
    
    if (walletAddress) {
      if (collapsed) {
        return `0x${walletAddress.slice(2, 4).toUpperCase()}...${walletAddress.slice(-4).toUpperCase()}`;
      } else {
        return `0x${walletAddress.slice(2, 8).toUpperCase()}...${walletAddress.slice(-8).toUpperCase()}`;
      }
    }
    
    // Fallback to getting address from Web3Auth
    try {
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        if (collapsed) {
          return `0x${address.slice(2, 4).toUpperCase()}...${address.slice(-4).toUpperCase()}`;
        } else {
          return `0x${address.slice(2, 8).toUpperCase()}...${address.slice(-8).toUpperCase()}`;
        }
      }
    } catch (error) {
      console.error('Error getting accounts:', error);
    }
    
    return user?.name || user?.email || 'Connected';
  }, [loggedIn, walletAddress, collapsed, user, getAccounts]);

  const [displayText, setDisplayText] = useState('Connect');

  // Update display text when state changes
  useEffect(() => {
    if (loggedIn) {
      getDisplayText().then(setDisplayText);
    } else {
      setDisplayText('Connect');
    }
  }, [loggedIn, walletAddress, collapsed, getDisplayText]);

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (initializationError) return 'Error';
    if (!initializationComplete) return 'Initializing...';
    return displayText;
  };

  const handleButtonClick = () => {
    if (initializationError) {
      message.error('Web3Auth initialization failed. Please refresh the page.');
      return;
    }
    if (loggedIn) {
      openAccountModal();
    } else {
      handleLogin();
    }
  };

  return (
    <>
      <Button
        onClick={handleButtonClick}
        loading={isLoading || isLoggingIn}
        danger={!!initializationError}
        disabled={isLoading || !!initializationError}
        className={classnames(connectButtonStyles.button, {
          [connectButtonStyles.connected]: loggedIn,
          [connectButtonStyles.collapsed]: collapsed,
        })}
      >
        {loggedIn && user?.profileImage && !collapsed && (
          <Avatar
            size="small"
            src={user.profileImage}
            style={{ marginRight: 8 }}
          />
        )}
        <span className={connectButtonStyles.text}>{getButtonText()}</span>
        {!loggedIn && !isLoading && !initializationError && (
          <span className={connectButtonStyles.iconWrapper}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.2278 1.92038c-3.57423-.00937-6.71954 1.83985-8.5172 4.6336-.07968.12422.00938.28828.15703.28828h1.64766c.1125 0 .21797-.04922.28828-.13594.16406-.19922.33985-.3914.525-.57422.76406-.76172 1.65235-1.36172 2.64141-1.7789 1.02187-.43125 2.10942-.65157 3.23202-.65157 1.1227 0 2.2102.21797 3.232.65157.9891.41718 1.8774 1.01718 2.6414 1.7789.7641.76172 1.3618 1.65 1.7813 2.63672.4336 1.02188.6516 2.10708.6516 3.22968 0 1.1227-.2204 2.2078-.6516 3.2297-.4172.9867-1.0172 1.875-1.7813 2.6367-.764.7617-1.6523 1.3617-2.6414 1.7789a8.26698 8.26698 0 0 1-3.232.6516c-1.1226 0-2.21015-.2203-3.23202-.6516a8.2911 8.2911 0 0 1-2.64141-1.7789c-.18515-.1851-.35859-.3773-.525-.5742-.07031-.0867-.17812-.1359-.28828-.1359H3.86763c-.14765 0-.23906.164-.15703.2882 1.79532 2.7868 4.92657 4.6336 8.4914 4.6336 5.5359 0 10.0313-4.4554 10.0875-9.975.0563-5.60856-4.4461-10.16715-10.0617-10.18122ZM9.25873 14.6235v-1.7812H1.89935c-.10312 0-.1875-.0844-.1875-.1875v-1.3125c0-.1032.08438-.1875.1875-.1875h7.35938V9.37351c0-.15703.18281-.24609.30469-.14766l3.32578 2.62505a.1871.1871 0 0 1 .0719.1476c0 .0285-.0064.0566-.0189.0821a.18865.18865 0 0 1-.053.0656l-3.32578 2.625c-.12188.0961-.30469.0093-.30469-.1477Z" fill="currentColor"/>
            </svg>
          </span>
        )}
      </Button>

      {/* Account Modal - only shown when logged in */}
      <Modal
        open={accountModalVisible}
        onCancel={closeAccountModal}
        footer={null}
        title="Account"
        zIndex={500}
        className={connectButtonStyles.modal}
        centered
        width={400}
      >
        <div className={connectButtonStyles.userInfo}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className={connectButtonStyles.userProfile}>
              {user?.profileImage ? (
                <Avatar size={64} src={user.profileImage} style={{ marginBottom: 16 }} />
              ) : (
                <Avatar size={64} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
              )}
              <div>
                <div className={connectButtonStyles.userName}>
                  {user?.name || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User')}
                </div>
                {user?.email && (
                  <div className={connectButtonStyles.userEmail}>
                    {user.email}
                  </div>
                )}
              </div>
            </div>
            
            {walletAddress && (
              <div className={connectButtonStyles.walletAddress}>
                <div className={connectButtonStyles.walletLabel}>Wallet Address:</div>
                {walletAddress}
              </div>
            )}

            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
            >
              Disconnect
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
};

export default Web3AuthConnectButton;