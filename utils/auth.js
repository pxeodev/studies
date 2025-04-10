import { retry } from '@lifeomic/attempt';

const KEY_PASS_CONTRACT = '0xdb20e21c95f9b3b1ffb98e765b6664aaf4d6aef6';
const ALCHEMY_BASE_URL = 'https://base-mainnet.g.alchemy.com/nft/v3/TbFuq5tQAa5kedmODXaxUO0diDWcPDgf/';

export default async function auth(walletAddress) {
  try {
    const result = await retry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(`${ALCHEMY_BASE_URL}getNFTsForOwner/?owner=${walletAddress}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      {
        maxAttempts: 3,
        delay: 1000,
        factor: 2
      }
    );

    const contracts = result?.ownedNfts?.map(nft => nft?.contract?.address?.toLowerCase());
    return contracts?.includes(KEY_PASS_CONTRACT);
  } catch (e) {
    console.log('Auth Error')
    console.error(e);
    return false;
  }
}