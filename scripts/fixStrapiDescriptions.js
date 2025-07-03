import dotenv from 'dotenv';
import strapi from 'coinrotator-utils/strapi.mjs'
import { gql } from '@urql/core'

dotenv.config();

const fixStrapiDescriptions = async () => {
  let { data } = await strapi.query(
    gql`
      query CoinDescriptions() {
        coins(pagination: { page: 1, pageSize: 100000 }) {
          data {
            id
            attributes {
              slug
              description
            }
          }
        }
      }
    `,
    {
    }
  )

  for (const coin of data.coins.data) {
    if (!coin.attributes.description) {
      continue;
    }
    let updatedDescription = coin.attributes.description.replace(/\((https?:\/\/(www\.)?coinrotator\.app\/[^\s)]+)\)/g, (match, p1) => {
      let relativeLink = p1.replace(/https?:\/\/(www\.)?coinrotator\.app/, '');
      return `(${relativeLink})`;
    });

    console.log(`Updating ${coin.attributes.slug}`);
    await strapi.mutation(
      gql`
        mutation UpdateCoinDescription($id: ID!, $description: String!) {
          updateCoin(id: $id, data: { description: $description }) {
            data {
              id
              attributes {
                description
              }
            }
          }
        }
      `,
      {
        id: coin.id,
        description: updatedDescription
      }
    );
  }
}

fixStrapiDescriptions();