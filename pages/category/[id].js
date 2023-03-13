import { Layout, Row } from 'antd';
import Head from 'next/head'

import baseStyles from '../../styles/base.module.less'
import indexStyles from '../../styles/index.module.less'
import globalData from '../../lib/globalData';
import PageHeader from '../../components/PageHeader'
import TableFilters from '../../components/TableFilters'
import CoinTable from '../../components/CoinTable';
import { SUPERTREND_FLAVOR } from '../../utils/variables.mjs'
import convertTickersToExchanges from '../../utils/convertTickersToExchanges';
import { getSuperTrends } from '../../utils/getTrends.mjs'
import useTableFilters from '../../hooks/useTableFilters';
import prisma from "../../lib/prisma.mjs";
import { getCategories } from '../../utils/categories.mjs'
import chunkedPromiseAll from '../../utils/chunkedPromiseAll.mjs'

export default function Category({ coinsData, appData, exchangeData, category, currentUrl }) {
  const [formState, formDispatch, defaultFormState, portfolioInputValue, setPortfolioInputValue] = useTableFilters(coinsData)
  const metaTitle = `${category.name} coins - CoinRotator`
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
        title={`${category.name} coins`}
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
    },
    where: {
      categories: {
        hasSome: category.name
      }
    }
  }
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
      dailySuperSuperTrendStreak,
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
      category
    }
  }
}