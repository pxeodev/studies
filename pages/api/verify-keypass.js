import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'

const KEY_PASS_CONTRACT = '0xdb20e21c95f9b3b1ffb98e765b6664aaf4d6aef6';

const alchemy = axios.create({
  baseURL: 'https://base-mainnet.g.alchemy.com/v2/TbFuq5tQAa5kedmODXaxUO0diDWcPDgf/',
  timeout: 30000,
})
axiosRetry(alchemy, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
alchemy.interceptors.request.use(AxiosLogger.requestLogger);

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
      const result = (await alchemy.get(`getNFTs/?owner=${walletAddress}`)).data
      const contracts = result?.ownedNfts?.map(nft => nft?.contract?.address)
      console.log(contracts)
      res.setHeader('Cache-Control', 'max-age=3600')
      if (contracts?.includes(KEY_PASS_CONTRACT)) {
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