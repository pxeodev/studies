import crypto from 'crypto';
import encrypt from '../../utils/encrypt.js';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Generate a unique verification token
    const timestamp = Math.floor(Date.now() / 1000);
    const verificationData = `telegramId?PENDING:telegramUserName?PENDING:walletAddress?${walletAddress}:dateTime?${timestamp}`;
    
    // Encrypt the verification data
    const encryptedData = encrypt(verificationData, process.env.TELEGRAM_LOGIN_SECRET_KEY, process.env.TELEGRAM_LOGIN_IV);
    const signature = Buffer.from(encryptedData).toString('base64');
    
    // Create the Telegram bot URL with the verification link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'coinrotator_bot';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const verificationUrl = `${siteUrl}/api/telegram-login?signature=${encodeURIComponent(signature)}`;
    
    const telegramBotUrl = `https://t.me/${botUsername}?start=verify_${Buffer.from(walletAddress).toString('base64')}`;

    res.status(200).json({
      telegramBotUrl,
      verificationUrl,
      expiresAt: timestamp + 300 // 5 minutes from now
    });

  } catch (error) {
    console.error('Error generating Telegram link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;