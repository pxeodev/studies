import auth from '../../utils/auth.js'

const handler = async (req, res) => {
  const walletAddress = req.query.walletAddress
  const validWallet = walletAddress?.startsWith('0x')
  const isLocal = req.headers?.referer?.includes('localhost:300')
  const isPreview = req.headers?.referer?.includes(process.env.VERCEL_BRANCH_URL) || req.headers?.host?.includes(process.env.DEPLOY_URL)
  const isProd = req.headers?.referer?.includes('coinrotator.app') || req.headers?.host?.includes('coinrotator.app')
  const isCoinrotatorReferrer = isLocal || isPreview || isProd
  console.dir(req.headers, { depth: null })
  console.log(walletAddress, validWallet, isLocal, isPreview, isProd)
  if (req.method !== 'GET' || !validWallet || !isCoinrotatorReferrer) {
    res.status(400).json({ ok: false })
  } else {
    try {
      const hasKeyPass = await auth(walletAddress)
      res.setHeader('Cache-Control', 'max-age=3600')
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