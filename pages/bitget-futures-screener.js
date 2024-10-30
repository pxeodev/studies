import { Layout, Row } from 'antd';
import { gql } from '@urql/core'
import Head from 'next/head'
import pick from 'lodash/pick';

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
import sql from "../lib/database.mjs";
import strapi from '../utils/strapi';

export default function BitgetFuturesScreener({ coinsData, hiddenCoins, appData, exchangeData, pageData }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
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
            formState={formState}
            defaultFormState={defaultFormState}
          />
        </Row>
      </Layout.Content>
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
      slug: 'bitget-futures-screener',
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
  coinsData = coinsData.filter((coinData) => {
    return coinData.derivatives?.some((derivative) => {
      return derivative.market === 'Bitget'
    })
  })
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
      'imageSlug',
      'marketCap',
      'marketCapRank',
      'fullyDilutedValuation',
      'circulatingSupply',
      'totalSupply',
      'ath',
      'atl',
      'derivatives',
      'categories',
      'coingeckoCategories',
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