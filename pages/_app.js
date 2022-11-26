import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { Layout } from 'antd'
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons'

import Footer from '../components/Footer'
import Header from '../components/Header'
import SubHeader from '../components/SubHeader'
import { useState, createContext } from "react"
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import baseStyles from "../styles/base.module.less"

export const DarkModeContext = createContext(null);

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const darkMode = useDarkMode();
  const screens = useBreakPoint();
  const [collapsed, setCollapsed] = useState(false);

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  pageProps.currentUrl = currentUrl
  const {topCoins, topCategories, categories, coins} = pageProps.appData
  const googleAnalytics = process.env.NODE_ENV === 'production' ? (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
      <Script
        id="google-analytics"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `,
        }}
      />
    </>
  ) : <></>

  return (
    <DarkModeContext.Provider value={darkMode}>
      <Layout>
        {googleAnalytics}
        <Head>
        <title key="title">CoinRotator - Coin Screener for Bullish & Bearish Crypto Trends</title>
          <meta name="description" key="description" content="A crypto screener spotting high momentum trades using the popular Supertrend. Check CoinRotator each day to ensure you are trading with the trend."/>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />
          <link rel="canonical" href={currentUrl} />
        </Head>
        <Layout.Sider
          collapsible
          collapsed={collapsed}
          onCollapse={value => setCollapsed(value)}
          collapsedWidth={56}
          width={240}
          theme={darkMode ? 'dark' : 'light'}
          trigger={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        >
          {/* TODO: Only show sider for desktop, show stuff hidden in hamburger mobile menu */}
        </Layout.Sider>
        <Layout className={baseStyles.innerLayout}>
          <Header categories={categories} coins={coins} renderSearch={screens.sm}/>
          <SubHeader categories={categories} coins={coins} render={!screens.sm}/>
          <Component {...pageProps} />
          <Footer topCoins={topCoins} topCategories={topCategories} />
        </Layout>
      </Layout>
    </DarkModeContext.Provider>
  )
}

export default MyApp
