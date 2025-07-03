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

    // Get user's Telegram data
    const user = (await sql`
      SELECT "telegramId", "telegramUserName" 
      FROM "User" 
      WHERE "walletAddress" = ${walletAddress}
    `)[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      telegramId: user.telegramId,
      telegramUserName: user.telegramUserName,
      isLinked: !!user.telegramId
    });

  } catch (error) {
    console.error('Error fetching user Telegram status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;