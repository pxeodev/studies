import { Client, cacheExchange, fetchExchange } from '@urql/core';
import { retryExchange } from '@urql/exchange-retry';
import dotenv from 'dotenv';

dotenv.config();

const strapi = new Client({
  url: process.env.STRAPI_URL,
  exchanges: [
    cacheExchange,
    retryExchange({
      retryIf: error => {
        return !!(error.graphQLErrors.length > 0 || error.networkError);
      },
    }),
    fetchExchange
  ],
  fetchOptions: () => {
    return {
      headers: { authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
    };
  },
});

export default strapi