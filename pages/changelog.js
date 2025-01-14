import { Layout } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import classnames from 'classnames';

import faqStyles from "../styles/faq.module.less"

import PageHeader from '../components/PageHeader'
import globalData from '../lib/globalData';
import strapi from '../utils/strapi';
import { gql } from '@urql/core'

const { Content } = Layout;

export default function Changelog({ pageData }) {
  return (
    <>
      <PageHeader title="Changelog" />
      <Content className={classnames(faqStyles.container, faqStyles.content)}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{pageData.content}</ReactMarkdown>
      </Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();
  let { data } = await strapi.query(
    gql`
      query Pages($slug: String) {
        pages(filters: {slug: {eq: $slug}}) {
          data {
            attributes {
              title
              metaTitle
              metaDescription
              content
            }
          }
        }
      }
    `,
    {
      slug: 'changelog',
    }
  )
  data = data.pages.data[0].attributes

  return { props: { appData, pageData: data } };
}
