import { gql } from '@urql/core';
import strapi from 'coinrotator-utils/strapi.mjs'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const queryResult = await strapi.query(
        gql`
          query ToadySuggestion {
            toadySuggestion {
              data {
                attributes {
                  suggestions
                }
              }
            }
          }
        `
      );

      const suggestions = queryResult?.data?.toadySuggestion?.data?.attributes?.suggestions || "";

      res.status(200).json({ suggestions });
    } catch (error) {
      console.error('Error fetching Shumi suggestions from Strapi (API route):', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}