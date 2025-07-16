import sql from '../../lib/database.mjs';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Update user to remove Telegram data
    const updatedUser = (await sql`
      UPDATE "User" 
      SET 
        "telegramId" = NULL,
        "telegramUserName" = NULL,
        "updatedAt" = NOW()
      WHERE "walletAddress" = ${walletAddress}
      RETURNING "id", "walletAddress"
    `)[0];

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Telegram unlinked for user: ${updatedUser.walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Telegram account unlinked successfully'
    });

  } catch (error) {
    console.error('Error unlinking Telegram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;