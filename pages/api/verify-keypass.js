import auth from '../../utils/auth.js'

const handler = async (req, res) => {
  const walletAddress = req.query.walletAddress
  const validWallet = walletAddress?.startsWith('0x')
  console.log(walletAddress, validWallet)
  if (req.method !== 'GET' || !validWallet) {
    res.status(400).json({ ok: false })
  } else {
    try {
      const hasKeyPass = await auth(walletAddress)

      // Set cache headers for better caching
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
      // Add a cache tag for this specific wallet
      res.setHeader('Cache-Tag', `wallet-${walletAddress}`)
      // Add Vary header to ensure proper caching by wallet address
      res.setHeader('Vary', 'Accept-Encoding, X-Wallet-Address')
      res.setHeader('X-Wallet-Address', walletAddress)

      if (hasKeyPass) {
        res.status(200).json({ ok: true })
      } else {
        res.status(403).json({ ok: false })
      }
    } catch(e) {
      res.status(500).json({ ok: false })
    }
  }
}

export default handler