import { Layout, Typography, Breadcrumb } from 'antd';
import { gql } from '@urql/core'
import Head from 'next/head'
import Link from 'next/link'
import fs from 'fs/promises'
import startCase from 'lodash/startCase'
import slugify from 'slugify';
import classnames from 'classnames';

import sitemapStyles from '../styles/sitemap.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import sql from "../lib/database.mjs";
import strapi from '../utils/strapi';

const { Title } = Typography;
const EXCLUDED_PAGES = ['_app.js', '_document.js', '_error.js', 'sitemap.js', '404.js', '500.js', 'index.js']
const SHALLOW_PAGES_FILTER = (page) =>
  page.endsWith('.js') &&
  !page.startsWith('_') &&
  !EXCLUDED_PAGES.includes(page)
const HUMAN_PAGE_NAMES_EXCEPTIONS = {
  '4h-alerts': '4H Alerts',
  'index': 'Home'
}
const HUMANIZE_PAGE_NAMES = page => HUMAN_PAGE_NAMES_EXCEPTIONS[page] || startCase(page)
const INFOMATION_PAGES = ['terms', 'faq']

export default function Sitemap({ coinsData, appData, pageData, shallowPages }) {
  const breadCrumbItemClass = classnames('ant-breadcrumb-link', sitemapStyles.breadcrumb)
  const toolsPages = shallowPages.filter(page => !INFOMATION_PAGES.includes(page))
  const informationPages = shallowPages.filter(page => INFOMATION_PAGES.includes(page))
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
      <Layout.Content className={sitemapStyles.container}>
        <Breadcrumb separator="|" className={sitemapStyles.breadcrumbs}>
          <Breadcrumb.Item href="#tools" className={breadCrumbItemClass}>Tools</Breadcrumb.Item>
          <Breadcrumb.Item href="#information" className={breadCrumbItemClass}>Information</Breadcrumb.Item>
          <Breadcrumb.Item href="#coins" className={breadCrumbItemClass}>Coins</Breadcrumb.Item>
          <Breadcrumb.Item href="#categories" className={breadCrumbItemClass}>Categories</Breadcrumb.Item>
        </Breadcrumb>
        <Title id="tools" level={2} className={sitemapStyles.title}>Tools</Title>
        <Link prefetch={false} className={sitemapStyles.link} href={`/`} key="home">Home</Link>
        {toolsPages.map(page =>
          <Link prefetch={false} className={sitemapStyles.link} href={`/${page}`} key={page}>{HUMANIZE_PAGE_NAMES(page)}</Link>
        )}
        <Title id="information" level={2} className={sitemapStyles.title}>Information</Title>
        {informationPages.map(page =>
          <Link prefetch={false} className={sitemapStyles.link} href={`/${page}`} key={page}>{HUMANIZE_PAGE_NAMES(page)}</Link>
        )}

        <Title id="coins"  level={2} className={sitemapStyles.title}>Coins</Title>
        {coinsData.map(coin =>
          <Link prefetch={false} className={sitemapStyles.link} href={`/coin/${coin.id}`} key={coin.id}>{coin.name}</Link>
        )}
        <Title id="categories" level={2} className={sitemapStyles.title}>Categories</Title>
        {appData.categories.map(categoryName =>
          <Link prefetch={false} className={sitemapStyles.link} href={`/category/${slugify(categoryName)}`} key={categoryName}>{categoryName}</Link>
        )}
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();
  let shallowPages = await fs.readdir('./pages')
  shallowPages = shallowPages.filter(SHALLOW_PAGES_FILTER).map(page => page.slice(0, -3))

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
      slug: 'sitemap',
    }
  )
  data = data.pages.data[0].attributes
  const coinQuery = `
    SELECT id, name
    FROM "Coin"
    ORDER BY "marketCapRank" ASC
  `;
  let coinsData;
  if (process.env.NODE_ENV === 'development') {
    coinsData = await sql`${coinQuery} LIMIT 20`;
  } else {
    coinsData = await sql`${coinQuery}`;
  }
  return {
    props: {
      coinsData,
      appData,
      pageData: data,
      shallowPages,
    }
  }
}