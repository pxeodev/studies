import { Row, Layout } from 'antd'
import Head from 'next/head'
import { gql } from '@urql/core'
import pick from 'lodash/pick'

import CoinTable from '../components/CoinTable';
import PageHeader from '../components/PageHeader';
import TableFilters from '../components/TableFilters'
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import sql from '../lib/database.mjs'
import globalData from '../lib/globalData';
import chunkedPromiseAll from 'coinrotator-utils/chunkedPromiseAll.mjs'
import { getImageSlug } from '../utils/minifyImageURL';
import useTableFilters from '../hooks/useTableFilters';
import strapi from 'coinrotator-utils/strapi.mjs'

import indexStyles from '../styles/index.module.less'

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
  hiddenCoins = hiddenCoins.data.coins.data.map(coin => coin.attributes.slug)
  let coinsData = await sql`
    SELECT id, symbol, name, images, "marketCap", "marketCapRank", categories, "coingeckoCategories", tickers, derivatives, "fullyDilutedValuation", "circulatingSupply", "totalSupply", "ath", "atl"
    FROM "Coin"
    ORDER BY "marketCapRank" ASC
    LIMIT ${process.env.NODE_ENV === 'development' ? 20 : 1000}
  `
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    coinData.exchanges = convertTickersToExchanges(coinData.tickers)
    coinData.imageSlug = getImageSlug(coinData.images.large)
    coinData.derivatives = coinData.derivatives?.map(derivative => derivative.market)
    coinData.fullyDilutedValuation = Number(coinData.fullyDilutedValuation)
    coinData.circulatingSupply = Number(coinData.circulatingSupply)
    coinData.totalSupply = Number(coinData.totalSupply)
    coinData.ath = Number(coinData.ath)
    coinData.atl = Number(coinData.atl)

    coinData = pick(coinData, [
      'id',
      'symbol',
      'name',
      'marketCap',
      'marketCapRank',
      'fullyDilutedValuation',
      'circulatingSupply',
      'totalSupply',
      'ath',
      'atl',
      'categories',
      'coingeckoCategories',
      'imageSlug',
      'derivatives',
      'exchanges'
    ])

    return coinData
  })
  const exchangeData = await sql`SELECT * FROM "Exchange"`
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
            formState={formState}
            defaultFormState={defaultFormState}
          />
        </Row>
      </Layout.Content>
    </>
  );
}
