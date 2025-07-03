import { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Space, Avatar, message, Divider, Card, Typography, Switch } from 'antd';
import { UserOutlined, LogoutOutlined, LinkOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LoginOutlined, CopyOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import { useCookies } from 'react-cookie';
import connectButtonStyles from '../styles/connectButton.module.less';
import modernModalStyles from '../styles/modernModal.module.less';
import '../styles/overlay.css'; // Import the overlay CSS

const { Text, Title } = Typography;

const Web3AuthConnectButton = ({ collapsed }) => {
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userTelegramData, setUserTelegramData] = useState(null);
  const [copied, setCopied] = useState(false);
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

  const copyToClipboard = useCallback(async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      message.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      message.error('Failed to copy address');
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
      {isLoggingIn && <div className="overlay" />}
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
          minWidth: collapsed ? '28px' : '210px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {loggedIn && (user?.profileImage || user?.picture) && !collapsed && (
          <Avatar
            size="small"
            src={user.profileImage || user.picture}
            style={{ marginRight: 8 }}
          />
        )}

        {/* Only show text when not collapsed */}
        {!collapsed && (
          <span className={connectButtonStyles.text}>{getButtonText()}</span>
        )}

        {
          collapsed && loggedIn && (
            <span className={connectButtonStyles.iconWrapper}>
              <LoginOutlined />
            </span>
          )
        }

        {!loggedIn && !initializationError && (
          <span className={connectButtonStyles.iconWrapper}>
            <LoginOutlined />
          </span>
        )}
      </Button>

      {/* Modern Account Settings Modal */}
      <Modal
        open={accountModalVisible}
        onCancel={closeAccountModal}
        footer={null}
        title="Account Settings"
        zIndex={500}
        className={modernModalStyles.modernModal}
        centered
        width={500}
      >
        {/* Profile Section */}
        <div className={modernModalStyles.profileSection}>
          <div className={modernModalStyles.profileAvatar}>
            {(user?.profileImage || user?.picture) ? (
              <Avatar size={80} src={user.profileImage || user.picture} />
            ) : (
              <Avatar size={80} icon={<UserOutlined />} />
            )}
          </div>
          <div className={modernModalStyles.profileInfo}>
            <h4>
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'User'}
            </h4>
          </div>
        </div>

        <Divider className={modernModalStyles.separator} />

        {/* Wallet Address Section */}
        {walletAddress && (
          <div className={modernModalStyles.walletSection}>
            <div className={modernModalStyles.sectionHeader}>
              <div className={modernModalStyles.indicator}></div>
              <h3>Wallet Address</h3>
            </div>
            <div className={modernModalStyles.walletAddressContainer}>
              <p className={modernModalStyles.walletAddress}>{walletAddress}</p>
              <button
                className={`${modernModalStyles.copyButton} ${copied ? modernModalStyles.copied : ''}`}
                onClick={copyToClipboard}
              >
                {copied ? <CheckCircleOutlined /> : <CopyOutlined />}
              </button>
            </div>
          </div>
        )}

        <Divider className={modernModalStyles.separator} />

        {/* Telegram Integration Section */}
        <div className={modernModalStyles.telegramSection}>
          <div className={modernModalStyles.sectionHeader}>
            <div className={modernModalStyles.indicator}></div>
            <h3>Telegram Integration</h3>
          </div>

          <div className={modernModalStyles.telegramCard}>
            <div className={modernModalStyles.telegramStatus}>
              <div className={modernModalStyles.statusIcon}>
                {userTelegramData?.telegramId ? (
                  <CheckCircleOutlined style={{ color: '#16a34a', fontSize: '20px' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#d97706', fontSize: '20px' }} />
                )}
              </div>
              <div className={modernModalStyles.statusContent}>
                <div className={`${modernModalStyles.statusBadge} ${userTelegramData?.telegramId ? modernModalStyles.connected : modernModalStyles.notConnected}`}>
                  {userTelegramData?.telegramId ? 'Connected' : 'Not Connected'}
                </div>
                <p className={modernModalStyles.statusDescription}>
                  {userTelegramData?.telegramId
                    ? 'Your Telegram account is successfully linked.'
                    : 'Link your Telegram account to receive notifications and access exclusive features.'
                  }
                </p>
                {userTelegramData?.telegramId && (
                  <div className={modernModalStyles.connectedInfo}>
                    <div className={modernModalStyles.telegramUsername}>
                      <span>Username: </span>@{userTelegramData.telegramUserName}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {userTelegramData?.telegramId ? (
              <Button
                className={`${modernModalStyles.telegramButton} ${modernModalStyles.unlinkButton}`}
                onClick={handleTelegramUnlink}
              >
                Unlink Telegram
              </Button>
            ) : (
              <Button
                className={`${modernModalStyles.telegramButton} ${modernModalStyles.linkButton}`}
                onClick={handleTelegramLink}
                icon={<LinkOutlined />}
              >
                Link Telegram
              </Button>
            )}
          </div>
        </div>

        <Divider className={modernModalStyles.separator} />

        {/* Disconnect Button */}
        <Button
          className={modernModalStyles.disconnectButton}
          onClick={handleLogout}
          icon={<LogoutOutlined />}
        >
          Disconnect Wallet
        </Button>
      </Modal>
    </>
  );
};

export default Web3AuthConnectButton;