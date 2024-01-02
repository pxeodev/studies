import { Layout, Row } from 'antd';
import Head from 'next/head'
import { useState, useCallback, useEffect } from 'react';
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs';

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
import prisma from "../../lib/prisma.mjs";
import { getCategories } from '../../utils/categories.mjs'
import chunkedPromiseAll from '../../utils/chunkedPromiseAll.mjs'
import { getImageSlug } from '../../utils/minifyImageURL';
import useSocketStore from '../../hooks/useSocketStore';

export default function Category({ coinsData, appData, exchangeData, category, currentUrl }) {
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
    categorySuperTrend = trends.daily[0]
  }
  const metaTitle = `Find the daily trends of all ${coinsData.length} ${category.name} coins | CoinRotator`
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
        hasSome: [category.name]
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
    coinData.exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    coinData.imageSlug = getImageSlug(coinData.images.large)
    delete coinData.images

    return coinData
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