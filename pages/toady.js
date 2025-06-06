import Head from 'next/head';
import { gql } from '@urql/core';
import globalData from '../lib/globalData'
import ToadyComponent from '../components/Toady';
import strapi from 'coinrotator-utils/strapi.mjs'
import PageHeader from '../components/PageHeader'

export async function getStaticProps() {
  const appData = await globalData()

  let pageQuery = null;
  try {
    pageQuery = await strapi.query(
      gql`
        query Pages($slug: String) {
          pages(filters: {slug: {eq: $slug}}) {
            data {
              attributes {
                title
                content
                metaTitle
                metaDescription
              }
            }
          }
        }
      `,
      {
        slug: 'toady',
      }
    );
  } catch (error) {
    console.error("Error fetching page data from Strapi:", error);
    // Handle error appropriately, maybe return default pageData
  }

  const pageData = pageQuery?.data?.pages?.data[0]?.attributes || {};

  let toadySuggestionsQuery = null;
  try {
    toadySuggestionsQuery = await strapi.query(
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
  } catch (error) {
    console.error("Error fetching Shumi suggestions from Strapi:", error);
  }

  const toadySuggestions = toadySuggestionsQuery?.data?.toadySuggestion?.data?.attributes?.suggestions || "";

  return {
    props: {
      appData,
      pageData,
      toadySuggestions,
    },
  }
}

const ToadyPage = ({ pageData, toadySuggestions }) => {
  return (
    <>
      <Head>
        <title key="title">{pageData?.metaTitle}</title>
        <meta name="description" key="description" content={pageData?.metaDescription} />
      </Head>
      <PageHeader title={pageData?.title} explainer={pageData.content} />
      <ToadyComponent isActive={true} initialSuggestions={toadySuggestions} />
    </>
  );
};

export default ToadyPage;