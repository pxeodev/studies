import { Layout } from 'antd';
import { gql } from '@apollo/client'
import ReactMarkdown from 'react-markdown'

import strapi from '../utils/strapi'
import baseStyles from '../styles/base.module.less'
import PageLayout from '../layouts/page';

function Home({ content }) {
  return (
    <>
      <Layout.Content className={baseStyles.container}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const { data } = await strapi.query({
    query: gql`
      query Home {
        pages(filters: { slug: { eq: "/" }}) {
          data {
            attributes {
              title
              metaDescription
              content
            }
          }
        }
      }
    `,
  })

  return {
    props: {
      ...data.pages.data[0].attributes,
    }
  }
}

Home.getLayout = function getLayout(page, pageProps) {
  return PageLayout(page, pageProps)
}

export default Home;