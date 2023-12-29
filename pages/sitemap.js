import { Layout, Typography } from 'antd';
import { gql } from '@urql/core'
import Head from 'next/head'
import Link from 'next/link'
import fs from 'fs/promises'
import startCase from 'lodash/startCase'
import slugify from 'slugify';

import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import prisma from "../lib/prisma.mjs";
import strapi from '../utils/strapi';

const { Title } = Typography;

export default function BinanceFuturesScreener({ coinsData, appData, pageData, shallowPages }) {
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
      <Layout.Content className={baseStyles.container}>
        <Title level={2} className={baseStyles.title}>Pages</Title>
        {shallowPages.map(page =>
          <Link href={`/${page}`} key={page}>{startCase(page)}</Link>
        )}
        <Link href={`/categories`} key="categories">Categories</Link>
        <Title level={2} className={baseStyles.title}>Coins</Title>
        {coinsData.map(coin =>
          <Link href={`/coin/${coin.id}`} key={coin.id}>{coin.name}</Link>
        )}
        <Title level={2} className={baseStyles.title}>Categories</Title>
        {appData.categories.map(categoryName =>
          <Link href={`/category/${slugify(categoryName)}`} key={categoryName}>{categoryName}</Link>
        )}
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();
  let shallowPages = await fs.readdir('./pages')
  shallowPages = shallowPages.filter(page =>
    page.endsWith('.js') && page !== 'sitemap.js' && !page.startsWith('_')
  ).map(page => page.slice(0, -3))

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
  const coinQuery = {
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      name: true,
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery })
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