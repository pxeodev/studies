import { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Space, Avatar, message, Divider, Card, Typography, Switch } from 'antd';
import { UserOutlined, LogoutOutlined, LinkOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import connectButtonStyles from '../styles/connectButton.module.less';

const { Text, Title } = Typography;

const Web3AuthConnectButton = ({ collapsed }) => {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [telegramLinking, setTelegramLinking] = useState(false);
  const [telegramLinkingTimeout, setTelegramLinkingTimeout] = useState(null);
  const [userTelegramData, setUserTelegramData] = useState(null);
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

    // Clear any existing timeout
    if (telegramLinkingTimeout) {
      clearTimeout(telegramLinkingTimeout);
      setTelegramLinkingTimeout(null);
    }

    setTelegramLinking(true);
    
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
        
        message.info('Please complete the verification in Telegram. This will timeout in 2 minutes.');
        
        let pollCount = 0;
        const maxPolls = 40; // 2 minutes (40 * 3 seconds)
        
        // Poll for verification completion
        const pollInterval = setInterval(async () => {
          pollCount++;
          
          try {
            await fetchUserTelegramData();
            
            // Check if linking was successful
            if (userTelegramData?.telegramId) {
              clearInterval(pollInterval);
              message.success('Telegram account linked successfully!');
              setTelegramLinking(false);
              setTelegramLinkingTimeout(null);
              return;
            }
          } catch (error) {
            console.error('Error polling Telegram status:', error);
          }
          
          // Timeout after 2 minutes
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setTelegramLinking(false);
            setTelegramLinkingTimeout(null);
            message.warning('Telegram linking timed out. Please try again if you want to link your account.');
          }
        }, 3000);
        
        // Set timeout reference for cleanup
        const timeoutId = setTimeout(() => {
          clearInterval(pollInterval);
          setTelegramLinking(false);
          setTelegramLinkingTimeout(null);
          message.warning('Telegram linking timed out. Please try again if you want to link your account.');
        }, 120000); // 2 minutes
        
        setTelegramLinkingTimeout(timeoutId);
        
      } else {
        throw new Error('Failed to generate Telegram link');
      }
    } catch (error) {
      console.error('Error linking Telegram:', error);
      message.error('Failed to link Telegram account. Please try again.');
      setTelegramLinking(false);
      setTelegramLinkingTimeout(null);
    }
  }, [walletAddress, fetchUserTelegramData, userTelegramData, telegramLinkingTimeout]);

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
    
    // Clean up any ongoing Telegram linking process
    if (telegramLinkingTimeout) {
      clearTimeout(telegramLinkingTimeout);
      setTelegramLinkingTimeout(null);
    }
    setTelegramLinking(false);
  }, [telegramLinkingTimeout]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (telegramLinkingTimeout) {
        clearTimeout(telegramLinkingTimeout);
      }
    };
  }, [telegramLinkingTimeout]);

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
        
        {!loggedIn && !initializationError && !collapsed && (
          <span className={connectButtonStyles.iconWrapper}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.2278 1.92038c-3.57423-.00937-6.71954 1.83985-8.5172 4.6336-.07968.12422.00938.28828.15703.28828h1.64766c.1125 0 .21797-.04922.28828-.13594.16406-.19922.33985-.3914.525-.57422.76406-.76172 1.65235-1.36172 2.64141-1.7789 1.02187-.43125 2.10942-.65157 3.23202-.65157 1.1227 0 2.2102.21797 3.232.65157.9891.41718 1.8774 1.01718 2.6414 1.7789.7641.76172 1.3618 1.65 1.7813 2.63672.4336 1.02188.6516 2.10708.6516 3.22968 0 1.1227-.2204 2.2078-.6516 3.2297-.4172.9867-1.0172 1.875-1.7813 2.6367-.764.7617-1.6523 1.3617-2.6414 1.7789a8.26698 8.26698 0 0 1-3.232.6516c-1.1226 0-2.21015-.2203-3.23202-.6516a8.2911 8.2911 0 0 1-2.64141-1.7789c-.18515-.1851-.35859-.3773-.525-.5742-.07031-.0867-.17812-.1359-.28828-.1359H3.86763c-.14765 0-.23906.164-.15703.2882 1.79532 2.7868 4.92657 4.6336 8.4914 4.6336 5.5359 0 10.0313-4.4554 10.0875-9.975.0563-5.60856-4.4461-10.16715-10.0617-10.18122ZM9.25873 14.6235v-1.7812H1.89935c-.10312 0-.1875-.0844-.1875-.1875v-1.3125c0-.1032.08438-.1875.1875-.1875h7.35938V9.37351c0-.15703.18281-.24609.30469-.14766l3.32578 2.62505a.1871.1871 0 0 1 .0719.1476c0 .0285-.0064.0566-.0189.0821a.18865.18865 0 0 1-.053.0656l-3.32578 2.625c-.12188.0961-.30469.0093-.30469-.1477Z" fill="currentColor"/>
            </svg>
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
            <Card style={{ textAlign: 'center', border: '1px solid #f0f0f0' }}>
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
              <Card size="small" style={{ background: '#fafafa' }}>
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
                    background: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '6px',
                    padding: '12px',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    lineHeight: '1.4',
                    color: '#262626'
                  }}>
                    {walletAddress}
                  </div>
                </div>
              </Card>
            )}

            {/* Telegram Integration Section */}
            <Card size="small" style={{ background: '#fafafa' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0088cc">
                    <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.896 6.728-1.268 7.928-1.268 7.928-.16.906-.576 1.056-.576 1.056s-.736.064-1.536-.576c-.8-.64-2.048-1.536-2.048-1.536s-1.28-.896-1.28-1.92c0-1.024.64-1.536.64-1.536s4.224-3.776 4.352-4.032c.128-.256-.128-.384-.128-.384-.192-.128-4.608 2.944-4.608 2.944s-.512.32-1.472.064c-.96-.256-2.048-.64-2.048-.64s-1.216-.768.832-1.536c2.048-.768 4.608-1.664 6.784-2.432 2.176-.768 2.624-.64 2.624-.64s.96-.192.96.576z"/>
                  </svg>
                  <Text strong style={{ color: '#0088cc', fontSize: '14px' }}>
                    Telegram Integration
                  </Text>
                </div>
                
                {userTelegramData?.telegramId ? (
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '6px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                      <Text strong style={{ color: '#52c41a' }}>Connected</Text>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <Text style={{ color: '#666' }}>Username: </Text>
                      <Text strong style={{ color: '#262626' }}>@{userTelegramData.telegramUserName}</Text>
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
                    background: '#fff',
                    border: '1px solid #e8e8e8',
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        type="primary"
                        icon={<LinkOutlined />}
                        loading={telegramLinking}
                        onClick={handleTelegramLink}
                        size="small"
                        disabled={telegramLinking}
                        style={{ borderRadius: '6px' }}
                      >
                        {telegramLinking ? 'Linking...' : 'Link Telegram'}
                      </Button>
                      {telegramLinking && (
                        <Button
                          type="default"
                          size="small"
                          onClick={() => {
                            if (telegramLinkingTimeout) {
                              clearTimeout(telegramLinkingTimeout);
                              setTelegramLinkingTimeout(null);
                            }
                            setTelegramLinking(false);
                            message.info('Telegram linking cancelled.');
                          }}
                          style={{ borderRadius: '6px' }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
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