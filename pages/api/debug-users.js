import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get recent users with Web3Auth authentication
    const recentUsers = await sql`
      SELECT
        id,
        "walletAddress",
        "web3authId",
        provider,
        email,
        name,
        "authMethod",
        "createdAt",
        "updatedAt"
      FROM "User"
      WHERE "authMethod" = 'web3auth'
      ORDER BY "updatedAt" DESC
      LIMIT 10
    `;

    // Get total count of Web3Auth users
    const totalCount = await sql`
      SELECT COUNT(*) as count
      FROM "User"
      WHERE "authMethod" = 'web3auth'
    `;

    res.status(200).json({
      success: true,
      totalWeb3AuthUsers: totalCount[0].count,
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        walletAddress: user.walletAddress,
        provider: user.provider,
        email: user.email,
        name: user.name,
        authMethod: user.authMethod,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Database query failed',
      details: error.message 
    });
  }
};

export default handler;