import { createContext, useContext, useEffect, useState } from 'react';
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, WALLET_ADAPTERS } from '@web3auth/base';
import { ethers } from 'ethers';
import { useCookies } from 'react-cookie';

const Web3AuthContext = createContext(null);

export const useWeb3Auth = () => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
};

// Use different client IDs for development vs production
const isDevelopment = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Development client ID (Sapphire Devnet) - works with localhost without domain whitelisting
const developmentClientId = "BGkgGCsO6v6Uve1k6glWCNKU2ims2t1Ljc9tU9HKUO5me2OTlxXP-bhY9OU7PPuBeT0FQ8qAZPU_ArEoLpSeeEU";

// Production client ID (Sapphire Mainnet)
const productionClientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BGSAe0KHRjYU77EJ4ha84Vy_aalV4ld1tleSsz1V2OITE28JUJcbnsxjtMorTWL4BBItqSP4WfkMF6G7QXkBvSQ";

const clientId = isDevelopment ? developmentClientId : productionClientId;

// Multi-chain configuration
const chainConfigs = {
  base: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x2105", // Base chain
    rpcTarget: "https://mainnet.base.org",
    displayName: "Base",
    blockExplorerUrl: "https://basescan.org",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  ethereum: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x1", // Ethereum Mainnet
    rpcTarget: "https://rpc.ankr.com/eth",
    displayName: "Ethereum",
    blockExplorerUrl: "https://etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  polygon: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x89", // Polygon Mainnet
    rpcTarget: "https://rpc.ankr.com/polygon",
    displayName: "Polygon",
    blockExplorerUrl: "https://polygonscan.com",
    ticker: "MATIC",
    tickerName: "Polygon",
    logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
  },
  arbitrum: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0xa4b1", // Arbitrum One
    rpcTarget: "https://rpc.ankr.com/arbitrum",
    displayName: "Arbitrum",
    blockExplorerUrl: "https://arbiscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.png",
  },
  optimism: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0xa", // Optimism
    rpcTarget: "https://rpc.ankr.com/optimism",
    displayName: "Optimism",
    blockExplorerUrl: "https://optimistic.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
    logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.png",
  },
  bsc: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x38", // BSC Mainnet
    rpcTarget: "https://rpc.ankr.com/bsc",
    displayName: "BNB Smart Chain",
    blockExplorerUrl: "https://bscscan.com",
    ticker: "BNB",
    tickerName: "BNB",
    logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
  }
};

// Default chain (Base)
const defaultChainConfig = chainConfigs.base;

export const Web3AuthProvider = ({ children }) => {
  const [cookies, setCookie, removeCookie] = useCookies(['user']);
  const [web3auth, setWeb3auth] = useState(null);
  const [web3authProvider, setWeb3authProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentChain, setCurrentChain] = useState('base'); // Track current chain
  const [initializationError, setInitializationError] = useState(null);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false); // Track if there's a stored session

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (isClient) {
          console.log('Starting Web3Auth initialization...');
          setInitializationError(null);

          const web3authInstance = new Web3Auth({
            clientId,
            web3AuthNetwork: isDevelopment ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
            chainConfig: defaultChainConfig,
            uiConfig: {
              mode: "light",
              defaultLanguage: "en",
              loginMethodsOrder: ["google", "facebook", "twitter", "discord", "apple", "github", "reddit", "farcaster", "wechat"],
              uxMode: "popup"
            }
          });

          console.log('Initializing Web3Auth modal...');
          await web3authInstance.init();

          setWeb3auth(web3authInstance);

          // Check for existing session after initialization
          console.log('Checking for existing session...');
          console.log('Connected status:', web3authInstance.connected);
          console.log('Provider status:', !!web3authInstance.provider);
          
          // Add a small delay to ensure Web3Auth has fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Re-check after delay
          console.log('Re-checking after delay...');
          console.log('Connected status:', web3authInstance.connected);
          console.log('Provider status:', !!web3authInstance.provider);
          
          // Check for session - either connected OR provider available indicates a stored session
          if (web3authInstance.connected && web3authInstance.provider) {
            console.log('Full session found, restoring...');
            try {
              setLoggedIn(true);
              setWeb3authProvider(web3authInstance.provider);
              const user = await web3authInstance.getUserInfo();
              setUser(user);
              setHasStoredSession(true);
              console.log('✅ Session restored for user:', {
                email: user?.email,
                name: user?.name,
                profileImage: user?.profileImage,
                picture: user?.picture,
                avatar: user?.avatar,
                photo: user?.photo,
                allFields: Object.keys(user || {})
              });
            } catch (sessionError) {
              console.warn('⚠️ Session restoration failed, clearing state:', sessionError.message);
              // Clear any invalid session state
              setLoggedIn(false);
              setWeb3authProvider(null);
              setUser(null);
              setHasStoredSession(false);
              console.log('Session restoration failed, ready for login');
            }
          } else if (web3authInstance.provider && !web3authInstance.connected) {
            console.log('Stored session detected but not fully connected - will auto-connect on user action');
            setHasStoredSession(true);
            setLoggedIn(false); // Keep UI showing disconnected until user clicks
            console.log('✅ Stored session ready for auto-connect');
          } else {
            console.log('No existing session, ready for login');
            setHasStoredSession(false);
          }
        }
      } catch (error) {
        console.error("❌ Web3Auth initialization failed:", error);
        setInitializationError(error.message || 'Failed to initialize Web3Auth');
      } finally {
        if (isClient) {
          setIsLoading(false);
          setInitializationComplete(true);
        }
      }
    };

    if (isClient) {
      init();
    }
  }, [isClient]);

  const login = async () => {
    try {
      console.log('🚀 Starting Web3Auth login...');
      if (!web3auth) {
        throw new Error("Web3Auth not initialized");
      }

      // Check if we have a stored session that can be auto-connected
      if (hasStoredSession && !loggedIn) {
        console.log('📱 Auto-connecting with stored session...');
      } else {
        console.log('Connecting to Web3Auth...');
      }
      
      const web3authProvider = await web3auth.connect();
      if (!web3authProvider) {
        throw new Error('No provider returned from Web3Auth connection');
      }
      
      console.log('✅ Web3Auth connection successful');
      setWeb3authProvider(web3authProvider);
      setLoggedIn(true);
      setHasStoredSession(true);
      
      const user = await web3auth.getUserInfo();
      setUser(user);
      console.log('✅ User info retrieved:', {
        email: user?.email,
        name: user?.name,
        profileImage: user?.profileImage,
        picture: user?.picture,
        avatar: user?.avatar,
        photo: user?.photo,
        allFields: Object.keys(user || {})
      });

      // Create ethers provider using the Web3Auth provider
      const ethProvider = new ethers.BrowserProvider(web3authProvider);
      const signer = await ethProvider.getSigner();
      const address = await signer.getAddress();
      console.log('✅ Wallet address retrieved:', address);

      try {
        await saveUserToDatabase({
          ...user,
          walletAddress: address,
          provider: user.typeOfLogin || 'unknown',
          web3auth_id: user.verifierId,
        });
        console.log('✅ User data saved to database');
      } catch (dbError) {
        console.warn('⚠️ Database save failed, but login was successful:', dbError.message);
      }

      console.log('🎉 Login process completed successfully');
      return { user, address };

    } catch (error) {
      // Handle user cancellation gracefully without logging as error
      const errorMsg = error.message?.toLowerCase() || '';
      const errorString = error?.toString()?.toLowerCase() || '';
      const errorCode = error.code;
      
      const isUserCancellation =
        errorMsg.includes('wallet popup has been closed by the user') ||
        errorMsg.includes('popup_closed') ||
        errorMsg.includes('user_closed_popup') ||
        errorMsg.includes('cancelled') ||
        errorMsg.includes('user_cancelled') ||
        errorMsg.includes('user cancelled') ||
        errorMsg.includes('user denied') ||
        errorMsg.includes('user rejected') ||
        errorMsg.includes('popup closed') ||
        errorMsg.includes('modal closed') ||
        errorMsg.includes('user closed the modal') ||
        errorMsg.includes('authentication cancelled') ||
        errorString.includes('popup closed') ||
        errorString.includes('popup_closed') ||
        errorString.includes('user_cancelled') ||
        errorString.includes('user cancelled') ||
        errorString.includes('user aborted') ||
        errorString.includes('user closed the modal') ||
        errorCode === 4001 || // User rejected request
        errorCode === 'ACTION_REJECTED' ||
        errorCode === 'USER_CANCELLED';
      
      if (isUserCancellation) {
        console.log('ℹ️ User cancelled login process');
        // Return a special object to indicate user cancellation
        return { success: false, error, shouldShowError: false };
      } else {
        console.error("❌ Login failed:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        // Return error object for legitimate errors
        return { success: false, error, shouldShowError: true };
      }
    }
  };

  const logout = async () => {
    try {
      if (web3auth && web3auth.connected) {
        await web3auth.logout();
      }
      // Always clear state regardless of Web3Auth status
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setHasStoredSession(false);
      setCurrentChain('base'); // Reset to default chain
      
      // Clear user cookie safely using react-cookie
      removeCookie('user', { path: '/' });
      
      // Clear localStorage session
      if (typeof window !== 'undefined') {
        localStorage.removeItem('web3auth_session');
      }
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear state even if logout fails
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setHasStoredSession(false);
      setCurrentChain('base');
      
      // Clear user cookie safely using react-cookie
      removeCookie('user', { path: '/' });
      
      // Clear localStorage session on logout error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('web3auth_session');
      }
      
      throw error;
    }
  };

  const getAccounts = async () => {
    if (!web3authProvider) {
      console.log("provider not initialized yet");
      return [];
    }
    
    const ethProvider = new ethers.BrowserProvider(web3authProvider);
    const signer = await ethProvider.getSigner();
    const address = await signer.getAddress();
    return [address];
  };

  const switchChain = async (chainKey) => {
    if (!web3authProvider) {
      console.log("provider not initialized yet");
      return false;
    }

    try {
      const chainConfig = chainConfigs[chainKey];
      if (!chainConfig) {
        throw new Error(`Chain ${chainKey} not supported`);
      }

      console.log(`Switching to ${chainConfig.displayName}...`);
      
      // Request to switch chain
      await web3authProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });

      setCurrentChain(chainKey);
      console.log(`Successfully switched to ${chainConfig.displayName}`);
      return true;
    } catch (error) {
      // If chain doesn't exist, try to add it
      if (error.code === 4902) {
        try {
          const chainConfig = chainConfigs[chainKey];
          await web3authProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainConfig.chainId,
              chainName: chainConfig.displayName,
              nativeCurrency: {
                name: chainConfig.tickerName,
                symbol: chainConfig.ticker,
                decimals: 18,
              },
              rpcUrls: [chainConfig.rpcTarget],
              blockExplorerUrls: [chainConfig.blockExplorerUrl],
            }],
          });
          
          setCurrentChain(chainKey);
          console.log(`Successfully added and switched to ${chainConfig.displayName}`);
          return true;
        } catch (addError) {
          console.error('Failed to add chain:', addError);
          return false;
        }
      } else {
        console.error('Failed to switch chain:', error);
        return false;
      }
    }
  };

  const getCurrentChainConfig = () => {
    return chainConfigs[currentChain];
  };

  const getSupportedChains = () => {
    return Object.keys(chainConfigs).map(key => ({
      key,
      ...chainConfigs[key]
    }));
  };

  const saveUserToDatabase = async (userData) => {
    try {
      console.log('Saving user data to database:', {
        walletAddress: userData.walletAddress,
        provider: userData.provider,
        email: userData.email,
        name: userData.name
      });

      const response = await fetch('/api/web3auth-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database save failed:', response.status, errorText);
        throw new Error(`Failed to save user data: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('User data saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving user to database:', error);
      throw error;
    }
  };

  const contextProvider = {
    web3auth,
    web3authProvider,
    user,
    loggedIn,
    hasStoredSession,
    isLoading: isLoading || !isClient,
    currentChain,
    initializationComplete,
    initializationError,
    login,
    logout,
    getAccounts,
    switchChain,
    getCurrentChainConfig,
    getSupportedChains,
  };

  return (
    <Web3AuthContext.Provider value={contextProvider}>
      {children}
    </Web3AuthContext.Provider>
  );
};