import { createContext, useContext, useEffect, useState } from 'react';
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider, WALLET_ADAPTERS, WEB3AUTH_NETWORK } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { ethers } from 'ethers';

const Web3AuthContext = createContext(null);

export const useWeb3Auth = () => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
};

const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

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
            web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
            privateKeyProvider,
            uiConfig: {
              appName: "CoinRotator",
              mode: "light",
              logoLight: "https://coinrotator.app/coin.svg",
              logoDark: "https://coinrotator.app/coin.svg",
              defaultLanguage: "en",
              theme: {
                primary: "#1890ff",
              },
            },
          });

          console.log('Web3Auth initialized with SAPPHIRE_MAINNET');

          await web3authInstance.init();
          setWeb3auth(web3authInstance);
          setWeb3authProvider(web3authInstance.provider);

          if (web3authInstance.connected) {
            setLoggedIn(true);
            const user = await web3authInstance.getUserInfo();
            setUser(user);
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
      
      if (!web3auth) {
        console.error("Web3Auth not initialized");
        throw new Error("Web3Auth not initialized");
      }
      
      console.log('Web3Auth instance available, attempting to connect...');
      const web3authProvider = await web3auth.connect();
      console.log('Web3Auth connect successful, provider:', !!web3authProvider);
      
      setWeb3authProvider(web3authProvider);
      
      if (web3auth.connected) {
        console.log('Web3Auth connected, getting user info...');
        const user = await web3auth.getUserInfo();
        console.log('User info received:', { name: user?.name, email: user?.email, provider: user?.typeOfLogin });
        
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
            provider: user.typeOfLogin,
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
      
      // Clear any cookies as well
      document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear state even if logout fails
      setWeb3authProvider(null);
      setUser(null);
      setLoggedIn(false);
      setCurrentChain('base');
      
      // Clear cookies
      document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
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