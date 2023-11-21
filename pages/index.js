import { Row, Layout } from 'antd'
import Head from 'next/head'
import { gql } from '@urql/core'

import CoinTable from '../components/CoinTable';
import PageHeader from '../components/PageHeader';
import TableFilters from '../components/TableFilters'
import { SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import prisma from '../lib/prisma.mjs'
import globalData from '../lib/globalData';
import { getSuperTrends } from '../utils/getTrends.mjs'
import chunkedPromiseAll from '../utils/chunkedPromiseAll.mjs'
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
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  coinsData = await chunkedPromiseAll(coinsData, 5, async (coinData) => {
    const [_dailyTrends, dailySuperSuperTrend, dailySuperSuperTrendStreak] = await getSuperTrends(coinData.id)
    const [_weeklyTrends, weeklySuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true })
    const [_dailyClassicTrends, dailyClassicSuperSuperTrend, dailyClassicSuperSuperTrendStreak] = await getSuperTrends(coinData.id, { flavor: SUPERTREND_FLAVOR.classic })
    const [_weeklyClassicTrends, weeklyClassicSuperSuperTrend] = await getSuperTrends(coinData.id, { weekly: true, flavor: SUPERTREND_FLAVOR.classic })

    const exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    return {
      ...coinData,
      dailySuperSuperTrend,
      weeklySuperSuperTrend,
      dailyClassicSuperSuperTrend,
      weeklyClassicSuperSuperTrend,
      dailySuperSuperTrendStreak,
      dailyClassicSuperSuperTrendStreak,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValue: Number(coinData.fullyDilutedValue),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      exchanges
    }
  })
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      exchangeData,
      appData,
      pageData: data
    }
  }
}

export default function Home({ coinsData, appData, exchangeData, pageData }) {
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
