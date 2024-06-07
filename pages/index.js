import { Row, Layout } from 'antd'
import Head from 'next/head'
import { gql } from '@urql/core'
import pick from 'lodash/pick'

import CoinTable from '../components/CoinTable';
import PageHeader from '../components/PageHeader';
import TableFilters from '../components/TableFilters'
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import prisma from '../lib/prisma.mjs'
import globalData from '../lib/globalData';
import chunkedPromiseAll from 'coinrotator-utils/chunkedPromiseAll.mjs'
import { getImageSlug } from '../utils/minifyImageURL';
import useTableFilters from '../hooks/useTableFilters';
import strapi from '../utils/strapi';

import indexStyles from '../styles/index.module.less'

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
      slug: '/',
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
      'imageSlug',
      'derivatives',
      'exchanges'
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

export default function Home({ coinsData, hiddenCoins, appData, exchangeData, pageData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)

  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader
        lastUpdated={appData.lastUpdated}
        title={pageData.title}
        explainer={pageData.content}
      />
      <Layout.Content className={indexStyles.container}>
        {/* For quick alerts */}
        {/* <Alert message={<span>Win 100 USDT. Please answer our <b>super brief</b> CoinRotator <a href='https://docs.google.com/forms/d/e/1FAIpQLSdaAbzeWl0wUMSnE3RZZEyX-MxqE9XOnVSCyWXg3Gcpv-rzdg/viewform' target='_blank' rel='noreferrer'>survey</a>.</span>} type="info" closable className={indexStyles.message}/> */}
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
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
          />
        </Row>
      </Layout.Content>
    </>
  );
}
