import { Layout, Row } from 'antd';
import Head from 'next/head'
import { useState, useCallback, useEffect } from 'react';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';
import { gql } from '@urql/core'

import baseStyles from '../../styles/base.module.less'
import indexStyles from '../../styles/index.module.less'
import categoryStyles from '../../styles/category.module.less'
import globalData from '../../lib/globalData';
import PageHeader from '../../components/PageHeader'
import TableFilters from '../../components/TableFilters'
import CoinTable from '../../components/CoinTable';
import UpTag from '../../components/UpTag';
import DownTag from '../../components/DownTag';
import HodlTag from '../../components/HodlTag';
import LoadingTag from '../../components/LoadingTag';
import { signals } from 'coinrotator-utils/variables.mjs'
import convertTickersToExchanges from '../../utils/convertTickersToExchanges';
import useTableFilters from '../../hooks/useTableFilters';
import sql from "../../lib/database.mjs";
import { getCategories } from '../../utils/categories.mjs'
import chunkedPromiseAll from 'coinrotator-utils/chunkedPromiseAll.mjs'
import { getImageSlug } from '../../utils/minifyImageURL';
import useSocketStore from '../../hooks/useSocketStore';
import strapi from '../../utils/strapi';

export default function Category({ coinsData, hiddenCoins, appData, exchangeData, category, currentUrl }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  const socket = useSocketStore(state => state.socket)
  const [trends, setTrends] = useState(null)
  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_category_trends', {
        flavor: SUPERTREND_FLAVOR.coinrotator,
        category: category.name
      }, (trends) => setTrends(trends))
    }
  }, [socket, category.name])
  useEffect(() => {
    console.log('useeffect fetch trends')
    fetchTrends()
  }, [fetchTrends])
  useEffect(() => {
    if (socket) {
      socket.on('new_trends', fetchTrends)
    }
    return () => {
      if (socket) {
        socket.off('new_trends')
      }
    }
  }, [socket, fetchTrends])
  let categorySuperTrend
  if (trends) {
    categorySuperTrend = trends.daily?.trend || trends['1d']?.trend
  }
  const metaTitle = `Trend Analysis for ${coinsData.length} ${category.name} coins`
  let dailySignalTag
  switch (categorySuperTrend) {
    case signals.buy:
      dailySignalTag = <UpTag className={categoryStyles.tag} />
      break;
    case signals.sell:
      dailySignalTag = <DownTag className={categoryStyles.tag} />
      break;
    case signals.hodl:
      dailySignalTag = <HodlTag className={categoryStyles.tag} />
      break;
    default:
      dailySignalTag = <LoadingTag />
  }
  return (
    <>
      <Head>
        <title key="title">{metaTitle}</title>
        <meta name="description" key="description" content={category.metaDescription}/>
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={category.metaDescription} />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="app" />
        <meta property="og:locale" content="en_US" />
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated}
        title={<>
          <span>{category.name}</span>&nbsp;&nbsp;
          {dailySignalTag}
        </>}
        explainer={category.description}
        showSource
      />
      <Layout.Content className={baseStyles.container}>
        <TableFilters
          coinsData={coinsData}
          categories={appData.categories}
          portfolioInputValue={portfolioInputValue}
          formState={formState}
          formDispatch={formDispatch}
          defaultFormState={defaultFormState}
          setPortfolioInputValue={setPortfolioInputValue}
          hiddenFilters={['category']}
        />
        <Row className={indexStyles.tableRow}>
          <CoinTable
            coinsData={coinsData}
            hiddenCoins={hiddenCoins}
            exchangeData={exchangeData}
            formState={formState}
            defaultFormState={defaultFormState}
            passTrends={setTrends}
          />
        </Row>
      </Layout.Content>
    </>
  );
}

export async function getStaticPaths() {
  const categories = await getCategories()

  return {
    paths: categories.map(category => ({ params: {id: category.slug} }) ),
    fallback: false
  }
}

export async function getStaticProps({ params }) {
  const categories = await getCategories()
  const category = categories.find(cat => cat.slug === params.id)
  const appData = await globalData();
  let coinsData = await sql`
    SELECT
      "id", "symbol", "name", "images", "marketCap", "marketCapRank", "categories", "tickers", "derivatives", "fullyDilutedValuation", "circulatingSupply", "totalSupply", "ath", "atl"
    FROM "Coin"
    WHERE
    ("categories" @> ${sql.array([category.name])}::text[]) OR
    ("coingeckoCategories" @> ${sql.array([category.name])}::text[])
    ORDER BY "marketCapRank" ASC
    LIMIT ${process.env.NODE_ENV === 'development' ? 20 : 1000}
  `
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    coinData.exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    coinData.derivatives = coinData.derivatives?.map(derivative => derivative.market)

    coinData.imageSlug = getImageSlug(coinData.images.large)
    delete coinData.images

    coinData.fullyDilutedValuation = Number(coinData.fullyDilutedValuation)
    coinData.circulatingSupply = Number(coinData.circulatingSupply)
    coinData.totalSupply = Number(coinData.totalSupply)

    return coinData
  })
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
  const exchangeData = await sql`SELECT * FROM "Exchange"`
  return {
    props: {
      coinsData,
      hiddenCoins,
      exchangeData,
      appData,
      category
    }
  }
}