import { Client, cacheExchange, fetchExchange } from '@urql/core';

const strapi = new Client({
  url: process.env.STRAPI_URL,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    return {
      headers: { authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
    };
  },
});

export default strapi