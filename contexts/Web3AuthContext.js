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

// CRITICAL: Enhanced environment detection for your Vercel deployment
const getEnvironmentDetails = () => {
  if (typeof window === 'undefined') {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      isVercel: false,
      hostname: 'server-side',
      origin: null
    };
  }

  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  // Development detection
  const isDevelopment = 
    process.env.NODE_ENV === 'development' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('.local') ||
    hostname.includes('loca.lt') ||
    hostname.includes('ngrok.io') ||
    origin.includes('://localhost');

  // Vercel detection
  const isVercel = 
    hostname.includes('.vercel.app') ||
    hostname.includes('.vercel.dev') ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV !== undefined;

  return {
    isDevelopment,
    isVercel,
    hostname,
    origin,
    isProduction: !isDevelopment && process.env.NODE_ENV === 'production'
  };
};

const env = getEnvironmentDetails();

// Client ID configuration
const developmentClientId = "BGkgGCsO6v6Uve1k6glWCNKU2ims2t1Ljc9tU9HKUO5me2OTlxXP-bhY9OU7PPuBeT0FQ8qAZPU_ArEoLpSeeEU";
const productionClientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BGSAe0KHRjYU77EJ4ha84Vy_aalV4ld1tleSsz1V2OITE28JUJcbnsxjtMorTWL4BBItqSP4WfkMF6G7QXkBvSQ";

// CRITICAL: Use correct client ID and network combination
const clientId = env.isDevelopment ? developmentClientId : productionClientId;
const network = env.isDevelopment ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;

// Chain configurations
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

const defaultChainConfig = chainConfigs.base;

// CRITICAL: Redirect URL configuration for your specific Vercel deployment
const getRedirectUrl = () => {
  if (typeof window === 'undefined') return undefined;
  
  const { origin, isDevelopment } = getEnvironmentDetails();
  
  // For development environments
  if (isDevelopment) {
    console.log('🔧 Development: Using origin as redirect URL:', origin);
    return origin;
  }
  
  // For Vercel production - use specific redirect page
  const redirectUrl = `${origin}/web3auth-redirect.html`;
  console.log('🔧 Vercel Production: Using redirect URL:', redirectUrl);
  return redirectUrl;
};

// Debug logging
console.log('🔧 Web3Auth Configuration for coinrotator-git-ai-playground-teamxx.vercel.app:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  hostname: env.hostname,
  origin: env.origin,
  isDevelopment: env.isDevelopment,
  isVercel: env.isVercel,
  clientIdUsed: clientId.substring(0, 10) + '...' + clientId.slice(-10),
  networkUsed: env.isDevelopment ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET',
  redirectUrl: getRedirectUrl()
});

export const Web3AuthProvider = ({ children }) => {
  const [cookies, setCookie, removeCookie] = useCookies(['user']);
  const [web3auth, setWeb3auth] = useState(null);
  const [web3authProvider, setWeb3authProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentChain, setCurrentChain] = useState('base');
  const [initializationError, setInitializationError] = useState(null);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (isClient) {
          console.log('🚀 Initializing Web3Auth for Vercel deployment...');
          setInitializationError(null);

          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
          const redirectUrl = getRedirectUrl();
          
          const web3authConfig = {
            clientId,
            web3AuthNetwork: network,
            chainConfig: defaultChainConfig,
            enableLogging: env.isDevelopment,
            storageKey: "local",
            // CRITICAL: Set redirectUrl for Vercel
            redirectUrl: redirectUrl,
            uiConfig: {
              loginMethodsOrder: ["google", "twitter", "github", "apple", "email_passwordless"],
              hideExternalWallets: true,
              modalZIndex: "99999",
              displayErrorsOnModal: false,
              logLevel: env.isDevelopment ? "debug" : "error",
              // Force redirect for mobile
              uxMode: isMobile ? "redirect" : "popup",
              mode: "light",
              theme: {
                primary: "#3396FF"
              }
            },
            sessionTime: 86400,
          };

          console.log('🔧 Final Web3Auth Config:', {
            clientId: clientId.substring(0, 10) + '...' + clientId.slice(-10),
            network: env.isDevelopment ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET',
            redirectUrl,
            uxMode: isMobile ? "redirect" : "popup",
            isMobile
          });

          const web3authInstance = new Web3Auth(web3authConfig);
          
          console.log('🔧 Initializing Web3Auth instance...');
          await web3authInstance.init();
          
          setWeb3auth(web3authInstance);

          // Handle mobile redirect result
          if (isMobile) {
            console.log('📱 Mobile device - checking for redirect result...');
            
            // Check URL parameters for redirect result
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            const hasRedirectData = 
              urlParams.has('code') || 
              urlParams.has('state') || 
              hashParams.has('access_token') ||
              document.referrer.includes('web3auth') ||
              document.referrer.includes('auth.web3auth.io');
            
            if (hasRedirectData) {
              console.log('📱 Mobile redirect data detected, processing...');
              // Give Web3Auth time to process the redirect
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // Check for existing session
          console.log('🔍 Checking for existing session...');
          await new Promise(resolve => setTimeout(resolve, 200));

          if (web3authInstance.connected && web3authInstance.provider) {
            console.log('✅ Active session found, restoring...');
            try {
              setLoggedIn(true);
              setWeb3authProvider(web3authInstance.provider);
              const user = await web3authInstance.getUserInfo();
              setUser(user);
              setHasStoredSession(true);
              console.log('✅ Session restored for:', user?.email);
            } catch (sessionError) {
              console.warn('⚠️ Session restoration failed:', sessionError.message);
              setLoggedIn(false);
              setWeb3authProvider(null);
              setUser(null);
              setHasStoredSession(false);
            }
          } else if (web3authInstance.provider && !web3authInstance.connected) {
            console.log('📱 Partial session detected');
            setHasStoredSession(true);
            setLoggedIn(false);
          } else {
            console.log('🆕 No existing session');
            setHasStoredSession(false);
          }
        }
      } catch (error) {
        console.error("❌ Web3Auth initialization failed:", error);
        
        let errorMessage = error.message || 'Failed to initialize Web3Auth';
        
        if (errorMessage.includes('could not validate redirect')) {
          errorMessage = `🚨 VERCEL DEPLOYMENT ISSUE: Domain not whitelisted properly.
          
Required whitelisted URLs in Web3Auth dashboard:
- https://coinrotator-git-ai-playground-teamxx.vercel.app
- https://coinrotator-git-ai-playground-teamxx.vercel.app/web3auth-redirect.html

Client ID: ${clientId.substring(0, 10)}...${clientId.slice(-10)}
Network: ${env.isDevelopment ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET'}`;
        }
        
        setInitializationError(errorMessage);
        console.error('🔧 Configuration Debug:', {
          currentOrigin: window.location.origin,
          expectedWhitelistedUrls: [
            'https://coinrotator-git-ai-playground-teamxx.vercel.app',
            'https://coinrotator-git-ai-playground-teamxx.vercel.app/web3auth-redirect.html'
          ],
          clientId: clientId.substring(0, 10) + '...' + clientId.slice(-10),
          network: env.isDevelopment ? 'SAPPHIRE_DEVNET' : 'SAPPHIRE_MAINNET'
        });
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

  const login = async (loginProvider = null) => {
    try {
      console.log('🚀 Starting Web3Auth login...');
      
      if (!web3auth) {
        throw new Error("Web3Auth not initialized");
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      const redirectUrl = getRedirectUrl();
      
      let connectOptions = {
        loginProvider: loginProvider || undefined,
        mfaLevel: "none",
        // CRITICAL: Always include redirectUrl for Vercel
        redirectUrl: redirectUrl,
      };

      if (isMobile) {
        connectOptions = {
          ...connectOptions,
          uxMode: "redirect",
          display: "page",
        };
        console.log('📱 Mobile login with redirect mode');
      }

      console.log('🔧 Login options:', {
        ...connectOptions,
        clientId: clientId.substring(0, 10) + '...',
        network: env.isDevelopment ? 'DEVNET' : 'MAINNET'
      });

      const web3authProvider = await web3auth.connect(connectOptions);
      
      if (!web3authProvider) {
        throw new Error('No provider returned from Web3Auth connection');
      }

      console.log('✅ Web3Auth connection successful');
      setWeb3authProvider(web3authProvider);
      setLoggedIn(true);
      setHasStoredSession(true);

      const user = await web3auth.getUserInfo();
      setUser(user);

      // Get wallet address
      const ethProvider = new ethers.BrowserProvider(web3authProvider);
      const signer = await ethProvider.getSigner();
      const address = await signer.getAddress();

      try {
        await saveUserToDatabase({
          ...user,
          walletAddress: address,
          provider: user.typeOfLogin || 'unknown',
          web3auth_id: user.verifierId,
        });
        console.log('✅ User saved to database');
      } catch (dbError) {
        console.warn('⚠️ Database save failed:', dbError.message);
      }

      console.log('🎉 Login completed successfully');
      return { user, address };

    } catch (error) {
      console.error('❌ Login failed:', error);
      
      const errorMsg = error.message?.toLowerCase() || '';
      
      if (errorMsg.includes('could not validate redirect')) {
        console.error('🚨 CRITICAL: Redirect validation failed for Vercel deployment');
        console.error('🔧 Check Web3Auth dashboard whitelist for:');
        console.error('   - https://coinrotator-git-ai-playground-teamxx.vercel.app');
        console.error('   - https://coinrotator-git-ai-playground-teamxx.vercel.app/web3auth-redirect.html');
        
        return { 
          success: false, 
          error: new Error('Domain not whitelisted. Check Web3Auth dashboard configuration.'), 
          shouldShowError: true 
        };
      }

      // Handle user cancellation
      const isUserCancellation = 
        errorMsg.includes('popup_closed') ||
        errorMsg.includes('user_cancelled') ||
        errorMsg.includes('cancelled') ||
        error.code === 4001;

      return { 
        success: false, 
        error, 
        shouldShowError: !isUserCancellation 
      };
    }
  };

  const logout = async () => {
    try {
      if (web3auth && web3auth.connected) {
        await web3auth.logout();
      }
      
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setHasStoredSession(false);
      setCurrentChain('base');
      removeCookie('user', { path: '/' });
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('web3auth_session');
      }

      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear state anyway
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setHasStoredSession(false);
      throw error;
    }
  };

  const getAccounts = async () => {
    if (!web3authProvider) {
      return [];
    }

    const ethProvider = new ethers.BrowserProvider(web3authProvider);
    const signer = await ethProvider.getSigner();
    const address = await signer.getAddress();
    return [address];
  };

  const switchChain = async (chainKey) => {
    if (!web3authProvider) {
      return false;
    }

    try {
      const chainConfig = chainConfigs[chainKey];
      if (!chainConfig) {
        throw new Error(`Chain ${chainKey} not supported`);
      }

      await web3authProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      });

      setCurrentChain(chainKey);
      return true;
    } catch (error) {
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
          return true;
        } catch (addError) {
          console.error('Failed to add chain:', addError);
          return false;
        }
      }
      console.error('Failed to switch chain:', error);
      return false;
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
      const response = await fetch('/api/web3auth-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save user data: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Database save error:', error);
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
