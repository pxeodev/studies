import { createContext, useContext, useEffect, useState } from 'react';
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
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

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Only initialize after client-side hydration
        if (isClient) {
          const privateKeyProvider = new EthereumPrivateKeyProvider({
            config: { chainConfig: defaultChainConfig },
          });

          const web3authInstance = new Web3Auth({
            clientId,
            web3AuthNetwork: isDevelopment ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
            privateKeyProvider,
            // Add additional configuration for better stability
            enableLogging: true,
            sessionTime: 86400, // 24 hours
            storageKey: "local",
            uiConfig: {
              // Only using FREE features - no whitelabel/custom branding
              defaultLanguage: "en",
              loginMethodsOrder: ["google", "discord", "twitter", "github"],
              // REMOVED WHITELABEL FEATURES (require paid plan):
              // appName: "CoinRotator",
              // mode: "light",
              // logoLight: "https://coinrotator.app/coin.svg",
              // logoDark: "https://coinrotator.app/coin.svg",
              // theme: { primary: "#1890ff" },
            },
          });

          const networkName = isDevelopment ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET';
          console.log(`Web3Auth initialized with ${networkName}`);
          console.log('Client ID:', clientId);
          console.log('Environment:', isDevelopment ? 'DEVELOPMENT (Devnet)' : 'PRODUCTION (Mainnet)');
          console.log('Environment variables check:');
          console.log('NEXT_PUBLIC_WEB3AUTH_CLIENT_ID:', process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID);
          console.log('NODE_ENV:', process.env.NODE_ENV);
          console.log('Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server-side');

          await web3authInstance.init();
          console.log('Web3Auth init completed successfully');
          
          setWeb3auth(web3authInstance);
          setWeb3authProvider(web3authInstance.provider);

          if (web3authInstance.connected) {
            console.log('Web3Auth already connected, restoring session...');
            try {
              // Verify instance is still valid before session restoration
              if (web3authInstance && web3authInstance !== null) {
                setLoggedIn(true);
                const user = await web3authInstance.getUserInfo();
                setUser(user);
                console.log('Session restored successfully for user:', user?.email);
              } else {
                console.error('Web3Auth instance became null during session restoration');
                setLoggedIn(false);
                setUser(null);
              }
            } catch (sessionError) {
              console.error('Session restoration failed:', sessionError);
              // Clear any corrupted session
              try {
                if (web3authInstance && web3authInstance !== null) {
                  await web3authInstance.logout();
                }
              } catch (logoutError) {
                console.error('Logout during session cleanup failed:', logoutError);
              }
              setLoggedIn(false);
              setUser(null);
              setWeb3authProvider(null);
            }
          } else {
            console.log('Web3Auth not connected, ready for login');
          }
        }
      } catch (error) {
        console.error("Web3Auth initialization error:", error);
        console.error("Error details:", error.message, error.stack);
      } finally {
        if (isClient) {
          setIsLoading(false);
        }
      }
    };

    if (isClient) {
      init();
    }
  }, [isClient]);

  const login = async () => {
    try {
      console.log('Starting Web3Auth login...');
      
      // Wait for web3auth to be properly initialized with more robust checking
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts
      while ((!web3auth || web3auth === null || (web3auth.status !== 'ready' && web3auth.status !== 'connected')) && attempts < maxAttempts) {
        console.log(`Waiting for Web3Auth initialization... attempt ${attempts + 1}, status: ${web3auth?.status}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Shorter intervals
        attempts++;
      }
      
      if (!web3auth || web3auth === null) {
        console.error("Web3Auth not initialized after waiting");
        throw new Error("Web3Auth not initialized - please refresh the page and try again");
      }
      
      if (web3auth.status !== 'ready' && web3auth.status !== 'connected') {
        console.error("Web3Auth not ready after waiting, status:", web3auth.status);
        throw new Error("Web3Auth not ready - please refresh the page and try again");
      }
      
      console.log('Web3Auth instance status:', {
        exists: !!web3auth,
        connected: web3auth?.connected,
        status: web3auth?.status,
        provider: !!web3auth?.provider,
        ready: web3auth?.ready
      });
      debugger; // Debug point 1: Login start

      if (!web3auth) {
        console.error("Web3Auth not initialized");
        throw new Error("Web3Auth not initialized");
      }

      debugger; // Debug point 2: Before connect
      // Store reference to prevent null during async operations
      const web3authInstance = web3auth;

      // Double-check web3auth instance before connecting
      if (!web3authInstance || web3authInstance === null) {
        console.error("Web3Auth instance is null before connect");
        throw new Error("Web3Auth instance is null - please refresh and try again");
      }

      console.log('Web3Auth instance available, attempting to connect...');
      debugger; // Debug point 3: During connect
      console.log('About to call web3authInstance.connect()...');

      // Add a small delay to ensure Web3Auth is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the stored reference instead of the state variable
      const web3authProvider = await web3authInstance.connect();
      console.log('Web3Auth connect successful, provider:', !!web3authProvider);
      debugger; // Debug point 4: After connect
      
      // Verify the instance is still valid after connect
      if (!web3authInstance || web3authInstance === null) {
        console.error("Web3Auth instance became null after connect");
        throw new Error("Web3Auth instance became null during connection");
      }
      
      setWeb3authProvider(web3authProvider);
      
      if (web3authInstance.connected) {
        console.log('Web3Auth connected, getting user info...');
        const user = await web3authInstance.getUserInfo();
        
        // Log full user object to see available properties in v8
        console.log('Full user object from Web3Auth v8:', user);
        console.log('User info received:', {
          name: user?.name,
          email: user?.email,
          provider: user?.typeOfLogin || user?.loginProvider || user?.verifier,
          verifierId: user?.verifierId,
          aggregateVerifier: user?.aggregateVerifier
        });
        
        setUser(user);
        setLoggedIn(true);
        
        // Get wallet address
        console.log('Getting wallet address...');
        const ethProvider = new ethers.BrowserProvider(web3authProvider);
        const signer = await ethProvider.getSigner();
        const address = await signer.getAddress();
        console.log('Wallet address obtained:', address);
        
        // Try to save user data to database, but don't fail the login if this fails
        try {
          console.log('Saving user data to database...');
          await saveUserToDatabase({
            ...user,
            walletAddress: address,
            provider: user.typeOfLogin || user.loginProvider || user.verifier || 'unknown',
            web3auth_id: user.verifierId || user.sub || user.id,
          });
          console.log('Database save completed successfully');
        } catch (dbError) {
          console.error('Database save failed, but login was successful:', dbError);
          // Don't throw here - the login was successful even if DB save failed
        }
        
        console.log('Login process completed successfully');
        return { user, address };
      } else {
        console.error('Web3Auth connection failed - not connected after connect()');
        throw new Error('Web3Auth connection failed');
      }
    } catch (error) {
      console.error("Login error details:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Enhanced error messages for better user experience
      console.log('Full error object:', error);
      console.log('Error code:', error.code);
      console.log('Error name:', error.name);
      console.log('Error type:', typeof error);
      
      if (error.message?.includes('timeout')) {
        throw new Error('Connection timed out. Please check your internet connection and try again.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        console.error('Network error details:', error);
        throw new Error(`Network error: ${error.message}. Please check your internet connection and try again.`);
      } else if (error.message?.includes('cors') || error.message?.includes('CORS')) {
        throw new Error('CORS error. Please check your network configuration.');
      } else if (error.message?.includes('popup_blocked')) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      } else if (error.message?.includes('user_cancelled') || error.message?.includes('user_denied')) {
        throw new Error('Login cancelled by user.');
      } else if (error.message?.includes('loginWithSessionId')) {
        // Handle the specific null instance error
        console.error('Web3Auth instance became null during authentication');
        throw new Error('Authentication failed due to session error. Please refresh the page and try again.');
      }
      
      throw error;
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
      setCurrentChain('base'); // Reset to default chain
      
      // Clear user cookie safely using react-cookie
      removeCookie('user', { path: '/' });
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear state even if logout fails
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setCurrentChain('base');
      
      // Clear user cookie safely using react-cookie
      removeCookie('user', { path: '/' });
      
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
    isLoading: isLoading || !isClient,
    currentChain,
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