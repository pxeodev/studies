import subDays from 'date-fns/subDays'
import endOfYesterday from 'date-fns/endOfYesterday'
import prisma from '../../lib/prisma.mjs'

// TODO: Make him use an API key
const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(400)
  } else {
    // TODO: How far back
    // TODO: Top 100
    const coins = await prisma.coin.findMany({
      orderBy: { marketCapRank: 'asc' },
      take: 2,
      include: {
        ohlcs: {
          select: {
            closeTime: true,
            open: true,
            high: true,
            low: true,
            close: true,
            quoteSymbol: true
          },
          where: {
            closeTime: {
              lte: endOfYesterday(),
            }
          },
          orderBy: { closeTime: 'asc' },
        }
      }
    })
    res.status(200).json({ coins })
  }
}

export default handler