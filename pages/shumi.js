import Head from 'next/head';
import { gql } from '@urql/core';
import globalData from '../lib/globalData'
import Shumi from '../components/Shumi';
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
        slug: 'shumi',
      }
    );
  } catch (error) {
    console.error("Error fetching page data from Strapi:", error);
    // Handle error appropriately, maybe return default pageData
  }

  const pageData = pageQuery?.data?.pages?.data[0]?.attributes || {};

  let shumiSuggestionsQuery = null;
  try {
    shumiSuggestionsQuery = await strapi.query(
      gql`
        query ShumiSuggestion {
          shumiSuggestion {
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

  const shumiSuggestions = shumiSuggestionsQuery?.data?.shumiSuggestion?.data?.attributes?.suggestions || "";

  return {
    props: {
      appData,
      pageData,
      shumiSuggestions,
    },
  }
}

const ShumiPage = ({ pageData, shumiSuggestions }) => {
  return (
    <>
      <Head>
        <title key="title">{pageData?.metaTitle}</title>
        <meta name="description" key="description" content={pageData?.metaDescription} />
      </Head>
      <PageHeader title={pageData?.title} explainer={pageData.content} />
      <Shumi isActive={true} initialSuggestions={shumiSuggestions} />
    </>
  );
};

export default ShumiPage;