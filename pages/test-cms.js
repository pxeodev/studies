import { Layout, Row } from 'antd';
import Head from 'next/head';
import { gql } from '@apollo/client'
import ReactMarkdown from 'react-markdown'

import strapi from '../utils/strapi'
import globalData from '../lib/globalData';
import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'

export default function TestCMS({ title, metaDescription, content }) {
  return (
    <>
      <Head>
        <title key="title">{title}</title>
        <meta name="description" key="description" content={metaDescription} />
        <meta key="noindex" name="robots" content="noindex"/>
        <meta key="nofollow" name="robots" content="nofollow"/>
      </Head>
      <Layout.Content className={baseStyles.container}>
        <Row className={indexStyles.tableRow}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Row>
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const { data } = await strapi.query({
    query: gql`
      query TestCMS {
        pages(filters: { title: { eq: "test-cms" }}) {
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

  // TODO: Remove the shell for landing pages
  const appData = await globalData();
  return {
    props: {
      appData,
      ...data.pages.data[0].attributes,
    }
  }
}