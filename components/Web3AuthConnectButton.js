import { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Space, Avatar, message, Divider, Card, Typography, Switch } from 'antd';
import { UserOutlined, LogoutOutlined, LinkOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LoginOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import { useCookies } from 'react-cookie';
import connectButtonStyles from '../styles/connectButton.module.less';

const { Text, Title } = Typography;

const Web3AuthConnectButton = ({ collapsed }) => {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userTelegramData, setUserTelegramData] = useState(null);
  const [cookies] = useCookies(['telegram_verified']);
  const {
    user,
    loggedIn,
    hasStoredSession,
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
    // Don't show loading message immediately - let user see the modal first

    try {
      if (initializationError) {
        throw new Error(`Web3Auth initialization error: ${initializationError}`);
      }
      if (!initializationComplete) {
        throw new Error('Web3Auth is still initializing. Please wait a moment.');
      }

      const result = await login();
      
      // Handle the new return format from login method
      if (result && result.success === false) {
        // Login returned an error object instead of throwing
        const error = result.error;
        const shouldShowError = result.shouldShowError;
        
        console.error('Login failed:', error);
        
        if (shouldShowError) {
          // Enhanced user-friendly error handling for legitimate errors
          let errorMessage = 'Connection failed. Please try again.';
          const errorMsg = error.message?.toLowerCase() || '';
          
          if (errorMsg.includes('popup_blocked') || errorMsg.includes('popup')) {
            errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
          } else if (error.message?.includes('initializing') || error.message?.includes('not initialized')) {
            errorMessage = 'Please wait a moment for the system to initialize, then try again.';
          } else if (error.message?.includes('network') || error.message?.includes('connection')) {
            errorMessage = 'Network connection issue. Please check your internet and try again.';
          } else if (error.message?.includes('JWT') || error.message?.includes('token')) {
            errorMessage = 'Authentication session expired. Please try again.';
          } else if (error.code === 4001) {
            errorMessage = 'Connection was declined. Please try again if you want to connect.';
          } else if (error.code === -32002) {
            errorMessage = 'A connection request is already pending. Please check your wallet.';
          } else if (error.message?.includes('No provider returned')) {
            errorMessage = 'Connection setup failed. Please try again.';
          }
          
          message.error({ content: errorMessage, key: 'login', duration: 4 });
        } else {
          // User cancellation - clear any existing loading messages silently
          console.log('ℹ️ User cancelled login - no error shown');
          message.destroy('login');
        }
      } else if (result?.address) {
        // Successful login
        setWalletAddress(result.address);
        message.success({ content: 'Successfully connected!', key: 'login', duration: 3 });
      } else {
        // Fallback error case
        message.error({ content: 'Connection failed. Please try again.', key: 'login', duration: 4 });
      }
    } catch (error) {
      // Handle any unexpected errors that are still thrown
      console.error('Unexpected login error:', error);
      message.error({ content: 'Connection failed. Please try again.', key: 'login', duration: 4 });
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

  // Fetch user's Telegram data when modal opens
  const fetchUserTelegramData = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch('/api/user-telegram-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTelegramData(data);
      }
    } catch (error) {
      console.error('Error fetching Telegram data:', error);
    }
  }, [walletAddress]);

  const handleTelegramLink = useCallback(async () => {
    if (!walletAddress) {
      message.error('Wallet address not found');
      return;
    }
    
    try {
      // Generate a secure link for Telegram authentication
      const response = await fetch('/api/generate-telegram-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (response.ok) {
        const { telegramBotUrl } = await response.json();
        
        // Open Telegram bot in new window
        window.open(telegramBotUrl, '_blank');
        
        message.info('Please complete the verification in Telegram.');
        
      } else {
        throw new Error('Failed to generate Telegram link');
      }
    } catch (error) {
      console.error('Error linking Telegram:', error);
      message.error('Failed to link Telegram account. Please try again.');
    }
  }, [walletAddress]);

  const handleTelegramUnlink = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch('/api/unlink-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });
      
      if (response.ok) {
        setUserTelegramData(null);
        message.success('Telegram account unlinked successfully!');
      } else {
        throw new Error('Failed to unlink Telegram');
      }
    } catch (error) {
      console.error('Error unlinking Telegram:', error);
      message.error('Failed to unlink Telegram account. Please try again.');
    }
  }, [walletAddress]);

  const openAccountModal = useCallback(() => {
    setAccountModalVisible(true);
    fetchUserTelegramData();
  }, [fetchUserTelegramData]);

  const closeAccountModal = useCallback(() => {
    setAccountModalVisible(false);
  }, []);

  // Watch for telegram verification cookie changes
  useEffect(() => {
    if (cookies.telegram_verified && accountModalVisible) {
      // Refresh telegram data when cookie indicates verification
      fetchUserTelegramData();
    }
  }, [cookies.telegram_verified, accountModalVisible, fetchUserTelegramData]);

  // Get display text for button
  const getDisplayText = useCallback(async () => {
    if (!loggedIn) return 'Connect';
    
    if (walletAddress) {
      if (collapsed) {
        return `0x${walletAddress.slice(2, 4).toUpperCase()}...${walletAddress.slice(-2).toUpperCase()}`;
      } else {
        return `0x${walletAddress.slice(2, 6).toUpperCase()}...${walletAddress.slice(-4).toUpperCase()}`;
      }
    }
    
    // Fallback to getting address from Web3Auth
    try {
      const accounts = await getAccounts();
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        if (collapsed) {
          return `0x${address.slice(2, 4).toUpperCase()}...${address.slice(-2).toUpperCase()}`;
        } else {
          return `0x${address.slice(2, 6).toUpperCase()}...${address.slice(-4).toUpperCase()}`;
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
    // Don't show text when collapsed
    if (collapsed) return '';
    
    // Don't show "Loading..." text - just show the appropriate button text
    if (initializationError) return 'Error';
    if (!initializationComplete) return hasStoredSession ? 'Reconnect' : 'Connect';
    if (hasStoredSession && !loggedIn) return 'Reconnect';
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
        loading={false}
        danger={!!initializationError}
        disabled={isLoading || !!initializationError}
        className={classnames(connectButtonStyles.button, {
          [connectButtonStyles.connected]: loggedIn,
          [connectButtonStyles.collapsed]: collapsed,
        })}
        style={{
          // Ensure button is visible on mobile
          minWidth: collapsed ? '28px' : '210px',
          display: 'flex !important'
        }}
      >
        {loggedIn && user?.profileImage && !collapsed && (
          <Avatar
            size="small"
            src={user.profileImage}
            style={{ marginRight: 8 }}
          />
        )}
        
        {/* Only show text when not collapsed */}
        {!collapsed && (
          <span className={connectButtonStyles.text}>{getButtonText()}</span>
        )}
        
        {!loggedIn && !initializationError && (
          <span className={connectButtonStyles.iconWrapper}>
            <LoginOutlined />
          </span>
        )}
      </Button>

      {/* Enhanced Account Settings Modal */}
      <Modal
        open={accountModalVisible}
        onCancel={closeAccountModal}
        footer={null}
        title={
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Account Settings</Title>
          </div>
        }
        zIndex={500}
        className={connectButtonStyles.modal}
        centered
        width={500}
      >
        <div className={connectButtonStyles.userInfo}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* User Profile Section */}
            <Card style={{ textAlign: 'center', border: '1px solid var(--cr-secondary-border)', background: 'var(--cr-card-bg)' }}>
              <div className={connectButtonStyles.userProfile}>
                {user?.profileImage ? (
                  <Avatar size={80} src={user.profileImage} style={{ marginBottom: 16 }} />
                ) : (
                  <Avatar size={80} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
                )}
                <div>
                  <Title level={4} style={{ margin: '0 0 8px 0' }}>
                    {user?.name || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User')}
                  </Title>
                  {user?.email && (
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      {user.email}
                    </Text>
                  )}
                </div>
              </div>
            </Card>

            {/* Wallet Information */}
            {walletAddress && (
              <Card size="small" style={{ background: 'var(--cr-secondary-bg)', border: '1px solid var(--cr-secondary-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                      💼 Wallet Address
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                      }
                      onClick={() => {
                        navigator.clipboard.writeText(walletAddress);
                        message.success('Address copied to clipboard!');
                      }}
                      style={{ color: '#1890ff' }}
                    />
                  </div>
                  <div style={{
                    background: 'var(--cr-card-bg)',
                    border: '1px solid var(--cr-secondary-border)',
                    borderRadius: '6px',
                    padding: '12px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    lineHeight: '1.4',
                    color: 'var(--cr-primary-text)'
                  }}>
                    {walletAddress}
                  </div>
                </div>
              </Card>
            )}

            {/* Telegram Integration Section */}
            <Card size="small" style={{ background: 'var(--cr-secondary-bg)', border: '1px solid var(--cr-secondary-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src="/telegram.svg"
                    alt="Telegram"
                    width="20"
                    height="20"
                    style={{ flexShrink: 0 }}
                  />
                  <Text strong style={{ color: '#0088cc', fontSize: '14px' }}>
                    Telegram Integration
                  </Text>
                </div>
                
                {userTelegramData?.telegramId ? (
                  <div style={{
                    background: 'var(--cr-card-bg)',
                    border: '1px solid var(--cr-secondary-border)',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                      <Text strong style={{ color: '#52c41a' }}>Connected</Text>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ color: 'var(--cr-secondary-text)' }}>Username: </Text>
                      <Text strong style={{ color: 'var(--cr-primary-text)' }}>@{userTelegramData.telegramUserName}</Text>
                    </div>
                    <Button
                      type="default"
                      danger
                      size="small"
                      onClick={handleTelegramUnlink}
                      style={{ borderRadius: '6px' }}
                    >
                      Unlink Telegram
                    </Button>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--cr-card-bg)',
                    border: '1px solid var(--cr-secondary-border)',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '16px' }} />
                      <Text strong>Not Connected</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '16px', lineHeight: '1.4' }}>
                      Link your Telegram account to receive notifications and access exclusive features.
                    </Text>
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      onClick={handleTelegramLink}
                      size="small"
                      style={{ borderRadius: '6px' }}
                    >
                      Link Telegram
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Divider />

            {/* Disconnect Button */}
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
              size="large"
            >
              Disconnect Wallet
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
};

export default Web3AuthConnectButton;