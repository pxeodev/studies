import { createContext, useState, useEffect, useRef } from 'react';
import useAccount from '../hooks/useAccount';

// Create the context
export const KeyPassContext = createContext({ hasKeyPass: false, loading: false });

export function KeyPassProvider({ children }) {
  const finalWalletAddress = useAccount();
  const [hasKeyPass, setHasKeyPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use refs to track verification state across renders
  const verifiedWallets = useRef(new Map());
  const pendingVerification = useRef(null); // Changed to null for better tracking

  // Separate useEffect just for logging wallet connection status
  useEffect(() => {
    if (finalWalletAddress) {
      console.log('Wallet connected in KeyPassProvider:', finalWalletAddress);
    } else {
      console.log('No wallet connected in KeyPassProvider');
    }
  }, [finalWalletAddress]);

  // Main verification effect
  useEffect(() => {
    let isMounted = true;

    const verifyWallet = async () => {
      if (!finalWalletAddress) {
        if (isMounted) setHasKeyPass(false);
        return;
      }

      if (verifiedWallets.current.has(finalWalletAddress)) {
        const cachedResult = verifiedWallets.current.get(finalWalletAddress);
        if (isMounted) setHasKeyPass(cachedResult);
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const response = await fetch(`/api/verify-keypass?walletAddress=${finalWalletAddress}`, {
          headers: {
            'Cache-Control': 'max-age=3600',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        verifiedWallets.current.set(finalWalletAddress, data.ok);
        if (isMounted) setHasKeyPass(data.ok);
      } catch (error) {
        console.error('KeyPass verification failed:', error.message);
        if (isMounted) setHasKeyPass(false);
      } finally {
        if (isMounted) setLoading(false);
        pendingVerification.current = null;
      }
    };

    if (finalWalletAddress && pendingVerification.current !== finalWalletAddress) {
      pendingVerification.current = finalWalletAddress;
      verifyWallet();
    }

    return () => {
      isMounted = false;
    };
  }, [finalWalletAddress]);

  // Return both the status and loading state
  const contextValue = { hasKeyPass, loading, walletAddress: finalWalletAddress };

  return (
    <KeyPassContext.Provider value={contextValue}>
      {children}
    </KeyPassContext.Provider>
  );
}