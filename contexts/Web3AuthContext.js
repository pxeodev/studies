const login = async (loginProvider = null) => {
  try {
    console.log('🚀 Starting Web3Auth login...');
    if (!web3auth) {
      throw new Error("Web3Auth not initialized");
    }

    // Detect if mobile device for specific handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Check if we have a stored session that can be auto-connected
    if (hasStoredSession && !loggedIn) {
      console.log('📱 Auto-connecting with stored session...');
    } else {
      console.log('Connecting to Web3Auth...');
    }

    // Configure login options - EXPLICITLY set redirectUrl to null
    let connectOptions = {
      loginProvider: loginProvider || undefined,
      mfaLevel: "none", // Disable MFA for smoother experience
      redirectUrl: null, // 🔥 FIX: Explicitly set to null to use same page redirect
    };

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
