import { useCookies } from 'react-cookie';
import { useWeb3Auth } from '../contexts/Web3AuthContext';
import { useState, useEffect } from 'react';

const useAccount = () => {
  const { loggedIn, getAccounts } = useWeb3Auth();
  const [cookies] = useCookies(['user']);
  const [walletAddress, setWalletAddress] = useState(null);

  // Get wallet address from Web3Auth
  useEffect(() => {
    const fetchAddress = async () => {
      if (loggedIn) {
        try {
          const accounts = await getAccounts();
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error fetching wallet address:', error);
        }
      } else {
        setWalletAddress(null);
      }
    };

    fetchAddress();
  }, [loggedIn, getAccounts]);

  // Only return wallet address if actually connected via Web3Auth
  // Remove cookie fallback to prevent false "connected" state
  return walletAddress;
}

export default useAccount