import { Layout, Row } from 'antd';
import { gql } from '@urql/core'
import Head from 'next/head'
import pick from 'lodash/pick'

import baseStyles from '../styles/base.module.less'
import indexStyles from '../styles/index.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import TableFilters from '../components/TableFilters'
import CoinTable from '../components/CoinTable';
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import chunkedPromiseAll from 'coinrotator-utils/chunkedPromiseAll.mjs'
import { getImageSlug } from '../utils/minifyImageURL';
import useTableFilters from '../hooks/useTableFilters';
import prisma from "../lib/prisma.mjs";
import strapi from '../utils/strapi';

export default function OldestTrends({ coinsData, hiddenCoins, appData, exchangeData, pageData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData, true)
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated}  title={pageData.title} explainer={pageData.content} />
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['derivatives', 'exchanges']}
        />
        <Row className={indexStyles.tableRow}>
          <CoinTable
            coinsData={coinsData}
            hiddenCoins={hiddenCoins}
            exchangeData={exchangeData}
            marketCapMax={formState.marketCapMax}
            marketCapMin={formState.marketCapMin}
            trendLengthMin={formState.trendLengthMin}
            trendLengthMax={formState.trendLengthMax}
            portfolio={formState.portfolio}
            category={formState.category}
            trendType={formState.trendType}
            defaultCategory={defaultFormState.category}
            exchanges={formState.exchanges}
            derivatives={formState.derivatives}
            showDerivatives={formState.showDerivatives}
            superTrendFlavor={formState.superTrendFlavor}
            defaultSort={['dailySuperSuperTrendStreak', 'descend']}
          />
        </Row>
      </Layout.Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();
  const coinQuery = {
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      symbol: true,
      name: true,
      images: true,
      marketCap: true,
      marketCapRank: true,
      categories: true,
      coingeckoCategories: true,
      tickers: true,
      derivatives: true,
    }
  }
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
      slug: 'oldest-trends',
    }
  )
  data = data.pages.data[0].attributes
  let hiddenCoins = await strapi.query(
    gql`
      query Coin {
        coins(filters: {hideOnTables: {eq: true}}) {
          data {
            attributes {
              slug
            }
          }
        }
      }
    `,
  )
  hiddenCoins = data.coins.data.map(coin => coin.attributes.slug)
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    coinData.exchanges = convertTickersToExchanges(coinData.tickers)
    coinData.imageSlug = getImageSlug(coinData.images.large)
    coinData.derivatives = coinData.derivatives?.slice(0, 5)

    coinData = pick(coinData, [
      'id',
      'symbol',
      'name',
      'marketCap',
      'marketCapRank',
      'categories',
      'coingeckoCategories',
      'exchanges',
      'derivatives',
      'imageSlug',
    ])

    return coinData
  })
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      hiddenCoins,
      exchangeData,
      appData,
      pageData: data
    }
  }
}