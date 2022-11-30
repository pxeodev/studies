import prisma from '../../lib/prisma'

const handler = async (req, res) => {
  const requestedCoins = req.query['coins[]']
  if (req.method !== 'GET' || !requestedCoins instanceof Array) {
    res.status(400)
  } else {
    const coins = await prisma.coin.findMany({
      where: {
        id: {
          in: requestedCoins
        }
      },
      select: {
        id: true,
        name: true,
        images: true,
        symbol: true
      }
    })
    res.status(200).json({ coins })
  }
}

export default handler