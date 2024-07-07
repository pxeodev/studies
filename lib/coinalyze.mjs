import axios from 'axios'
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import * as AxiosLogger from 'axios-logger'
import subDays from 'date-fns/subDays/index.js';

const API_KEYS = [
  '8e46528a-2b35-4b0c-b89b-b73e536a2894',
  'e3b3b41f-d2be-4b3e-8281-1f42d9687840',
  'f3bde557-60db-4b4e-8a91-d5cf9fb6abb5',
  '7228310f-b658-4889-970c-c960a474781b',
  'c05e48af-3880-4a17-8954-04af5c0e6906',
  '70a8ac50-7496-4c44-a10c-95c3d068c755',
  '69165bd5-9ba5-4c37-adfa-5cc7c9737f1b',
  'd1184b9e-cb82-4379-b878-f7828717b383',
  '5a75ffa8-e08c-437d-9a8f-af61e7db0f6b',
  '7e305a76-ae63-4358-91c8-7de90987d842',
  '9574ab98-78d7-4f04-877b-88161be9e326',
  '3a99f14b-c034-4484-9af6-75e81eb57e62',
  'e0ff0d45-c281-4e92-a97f-f9a219f5f65c',
  'b290f080-113b-47f1-a3f8-c4f135e8280a',
  '0cee5dd4-451c-4cd5-9b59-4ce4832c5f13',
  '377c30d6-a856-42d1-93a7-c2c6742f73fc',
  '5eb9d821-6443-4e44-aad5-abfe5a900a77',
  '67aa742f-6c75-484b-bce8-1748c1f35256',
  'e6f2f09c-2902-4c87-96e5-b9ae03eff27f',
  '9c0f453b-e1e8-47f1-a215-6c3ae4794602',
  'a49decf4-70f9-492e-83a6-88544565b840',
  'bd63d6ec-be55-47f0-9905-9abfd6770679',
  '7319e629-ca5f-4cf9-b7c3-33558a641f8a',
  '309ff372-d263-4dd0-a9e4-8faa1fa24c7c',
  '9268b903-d42a-4a68-aebb-ea23c02b67d6',
  'a11b0e03-0ad2-470c-9569-b183020b863e',
  'ddfb25f0-1c46-4d62-b954-a8a9e0dc6ec6',
  'f620c6ab-e8ac-4699-b7ff-e31d399d86c6',
  '530ef5b9-a883-4111-81a8-1528d13fb1f8',
  '85b6fca6-307d-4051-aa48-e78437a8b829',
  'ae5772dc-27a7-42d7-bf08-a72aee54b2a5',
  '4d2cd934-f9a4-43d9-9999-91e3f7107baf',
  'd44d00d6-c360-4668-8fe1-db6a62ab67fc',
  'b1271dee-8850-4de9-a04d-59a53b2f50e4',
  '6a6ee48e-f340-4784-8a18-4d9e16d24067',
  '9f13535f-d232-40bc-899e-2e5a16ad5846',
  '5f8b122c-9a7a-4e0d-9905-ec1d72155a80',
  '35a08e00-c1f9-4aa9-a53d-404141872a6d',
  '8869a641-eb32-463c-9e4f-8272c521af70',
  'a0573f5f-7fca-41c4-aacb-0d1e862924b2',
  '4359e39b-d027-449b-bf23-8918158d6a0f',
  'b6d797de-ed44-42f9-adcf-e4e295f01d10',
  '6b54c407-b6aa-4cf4-af83-a51f6c529072',
  '4d999a12-9193-42b2-b034-6907f38564b5',
  '415f1698-46f0-4a87-894b-a62869abf883',
  'd02e08a3-58d3-4934-b88d-975ffd86016d',
  'a9380c32-ea73-4657-ac99-f93cb1b60750',
  '615a6b9e-12a8-4ab7-a40d-00a8795dbc43',
  'bac3ca06-890d-47e0-9783-a4b0409679dc',
  'f45e8fa0-e194-4c16-a88f-47a24530f3e0',
  '828b7092-fc56-45fb-ad97-cafbd849abe0',
  '81b1aa7a-de51-4efc-a46c-79d5c2daa317',
  '0f69c730-fefe-4bb0-b3cc-bd067d66a09c',
  '69dadbb6-2c8d-44f5-92cc-e73fbe08d841',
  '61075e83-eb51-46a7-98c2-2827647aa83b',
  '411740e8-697a-44e0-b695-a1247603de06',
  '51049472-fe6f-46f6-bab2-68e85d88931d',
  '69af5210-6aba-4465-8bfc-0326ea34565f',
  'a81e1d6c-b802-4f1c-a65d-3fed8482ca2a',
  '2de74cef-a0b1-492b-9be4-365b058c0de7',
  '4986319a-c188-42c1-b348-174054c372c3',
  '19bc8f31-35d1-4c3a-ae64-ce62e3a05292',
  '99b420f8-9f31-45b3-b22e-f5ba904621db',
  '029f6f9c-a1ff-4196-8333-ff8c11abc571',
  'c078de5e-a523-47fc-8b91-8f046467b8c9',
  '4fbba268-1711-4ec6-b701-693ae54ed87b',
  '534e3ddd-73cc-4d29-ab7d-1f72bdfcb59a',
  '8d25ac20-87dd-4207-8db7-0d43f1fbfb8c',
  '8e6b32bb-34f7-4122-9af3-e9b7e117b9a2',
  '2ed1c6f6-fb48-4b39-8b6d-ac1eed358922',
  '3e798345-29aa-498b-839e-104d879a11bd',
  '27db48f8-a05a-4379-9c2e-7e2959c3d19b',
  'b80da245-71ca-46ec-ac24-84dddcb92cd8',
  'e41689e4-ada7-4b80-9467-78404482586a',
  '56e5e2de-4308-4c60-bc81-3b11136ed4ff',
  'ee194d14-d35a-4fa6-95c9-bada5ffd320f',
  '668c2103-4ff4-4cdf-8ba5-590cd55b8534',
  '7d4a85ff-9bb0-4adc-808b-1a8ef22ed770',
  '87f1559e-db55-4b2e-a88b-44bec214903b',
  '0090f553-bc16-41a6-9a09-de23631a8418',
  '59d5c3cd-ab5d-4f1f-890b-35571553601c',
  '2029f228-9050-4698-a2fa-c08b195fecc2',
  '5e84df15-eb65-4021-a8ed-e42570ce8d80',
  '26cc424e-caec-423a-8729-f47b8025bc5d',
  '6fb3f6c0-925c-4a76-ae9e-13e0b265461e',
  '81a51750-76fb-4f71-9b5a-20f0ce3a6f27',
  '87d63934-7dd6-4717-9086-ce95d0973f4e',
  '402834fe-b031-4698-931b-970432413bcf',
  'f3f0aad5-af36-4ffa-96e9-a0d0da3509ee',
  'dc2285a4-a89c-4846-a16e-aa2cd812af38',
  '61c78977-7d44-48ad-8a3d-8f37e89b8f28',
  'e10bd27f-27a7-4b94-a55d-a22ad1ea4efe',
  'cbca6962-3b1a-4461-8ab8-1370bb61b154',
  '83fcacc6-f369-416f-bfbb-d8ac52dbd7fc',
  'f9365d18-f5e7-4157-922e-03ebaba6297d',
  '268c0b6b-13c7-46df-8bf2-8f9841cba55e',
  'f8738f33-7475-4fc7-bb58-c7fd3a901ee2',
  'd18190dc-66bd-42ca-b0d7-38eafc93365b',
  '1033e922-aa1a-4ac7-ac4a-26f139d016c8',
  '76082c40-3c46-4e47-8a2b-5a4a22a81b72',
  'a8ebe6cd-7ed9-417a-b08f-395422e274db',
  '5347a5f6-288b-482a-8df6-6442b247c058',
  'bb9a0990-250e-4972-98d0-a1c25390a966'
]
let apiKeyIndex = 0

const coinalyze = axios.create({
  baseURL: 'https://api.coinalyze.net/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  }
})

axiosRetry(coinalyze, {
  retries: 5,
  retryDelay: (_count, error) => {
    const retryAfterSeconds = error?.response?.headers?.['retry-after'] || 60
    return 1000 * retryAfterSeconds;
  },
  onRetry: (_count, err) => console.log(_count, err),
  shouldResetTimeout: true,
  retryCondition: (e) => {
    return (
      isNetworkOrIdempotentRequestError(e) ||
      e?.code === 'ECONNABORTED' ||
      e?.code === 'ECONNRESET' ||
      e.response?.status === 429
    );
  }
})
coinalyze.interceptors.request.use(AxiosLogger.requestLogger);
coinalyze.interceptors.request.use((config) => {
  config.headers.api_key = API_KEYS[apiKeyIndex++ % API_KEYS.length]
  return config
}, null, { synchronous: true })

export const getSupportedExchanges = () => {
  return coinalyze.get(`exchanges`)
}

export const getSupportedFutureMarkets = () => {
  return coinalyze.get(`future-markets`)
}

export const getOpenInterest = async (symbol, market) => {
  const data = await coinalyze.get(`open-interest?symbols=${symbol}`)
  const value = data.data[0]?.value
  return { openInterest: value, symbol, market }
}

export const getFundingRate = async (symbol, market) => {
  const data = await coinalyze.get(`funding-rate?symbols=${symbol}`)
  const value = data.data[0]?.value
  return { fundingRate: value, symbol, market }
}

export const getVolume24h = async (symbol, market) => {
  let yesterday = subDays(new Date(), 1)
  yesterday = parseInt(+yesterday / 1000)
  const today = parseInt(+new Date() / 1000)
  const data = await coinalyze.get(`ohlcv-history?symbols=${symbol}&interval=daily&from=${yesterday}&to=${today}`)
  const value = data.data[0]?.history?.[0]?.v
  return { futuresVolume24h: value, symbol, market }
}
