import { Layout, Card, Skeleton } from 'antd';
import { useContext, useCallback, useEffect, useState } from 'react'
import Head from 'next/head';
import { gql } from '@urql/core'

import { DarkModeContext } from '../layouts/screener.js';
import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import MarketHealthChart from '../components/MarketHealthChart';
import useBreakPoint from '../hooks/useBreakPoint';
import strapi from 'coinrotator-utils/strapi.mjs'
import useSocketStore from '../hooks/useSocketStore';

import styles from "../styles/market-health.module.less"

const { Content } = Layout;

export default function MarketHealth({ appData, pageData }) {
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  const socket = useSocketStore(state => state.socket)
  const [trends, setTrends] = useState(null)
  const fetchTrends = useCallback(() => {
    if (socket) {
      socket.emit('get_historical_trends', (trends) => setTrends(trends))
    }
  }, [socket])
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
  return (
    <>
      <Head>
        <title key="title">{pageData.metaTitle || pageData.title}</title>
        <meta name="description" key="description" content={pageData.metaDescription}/>
      </Head>
      <PageHeader lastUpdated={appData.lastUpdated} title={pageData.title} explainer={pageData.content}/>
      <Content className={baseStyles.container}>
        <Card className={styles.marketHealthCard}>
          { trends === null ? <Skeleton paragraph={{ rows: 11 }} active/> : (
            <MarketHealthChart
              historicDailySuperSuperTrends={trends}
              screens={screens}
              darkMode={darkMode}
            />
          )}
        </Card>
      </Content>
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
      slug: 'market-health',
    }
  )
  data = data.pages.data[0].attributes

  return {
    props: {
      appData,
      pageData: data
    }
  };
}