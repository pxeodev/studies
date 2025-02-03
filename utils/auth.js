import axios from 'axios'
import axiosRetry, { exponentialDelay } from 'axios-retry'
import * as AxiosLogger from 'axios-logger'
import { setupCache } from 'axios-cache-interceptor'

const KEY_PASS_CONTRACT = '0xdb20e21c95f9b3b1ffb98e765b6664aaf4d6aef6';

let alchemy = axios.create({
  baseURL: 'https://base-mainnet.g.alchemy.com/v2/TbFuq5tQAa5kedmODXaxUO0diDWcPDgf/',
  timeout: 30000,
})
axiosRetry(alchemy, {
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryDelay: exponentialDelay
})
alchemy = setupCache(alchemy)
alchemy.interceptors.request.use(AxiosLogger.requestLogger);

export default async function auth(walletAddress) {
  let result
  try {
    result = await alchemy.get(`getNFTs/?owner=${walletAddress}`)
  } catch (e) {
    console.error(e)
    return false
  }
  const contracts = result.data?.ownedNfts?.map(nft => nft?.contract?.address)
  console.log(contracts)
  return contracts?.includes(KEY_PASS_CONTRACT)
}