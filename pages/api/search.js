import prisma from '../../lib/prisma.mjs'

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    const coins = await prisma.coin.findMany({
      select: {
        id: true,
        name: true,
        symbol: true,
        images: true,
      },
      orderBy: { marketCapRank: 'asc' },
    })
    for (let coin of coins) {
      coin.image = coin.images.small
      delete coin.images
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json({ coins })
  }
}

export default handler