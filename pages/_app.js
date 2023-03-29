import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { Layout, notification } from 'antd'
import { createContext, useEffect } from "react"
import { HydrationProvider, Client } from "react-hydration-provider";

import Header from '../components/Header'
import Sider from '../components/Sider'
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import baseStyles from "../styles/base.module.less"

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
  useEffect(() => {
    const html = document.querySelector('html');
    html.dataset.theme = isDark ? 'theme-dark' : 'theme-light';
  }, [isDark])
  const screens = useBreakPoint();
  const [api, contextHolder] = notification.useNotification();

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  pageProps.currentUrl = currentUrl
  const {topCategories,categories} = pageProps.appData
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
    <HydrationProvider>
      <DarkModeContext.Provider value={darkMode}>
        <NotificationContext.Provider value={api}>
          {contextHolder}
          <Layout className={baseStyles.outerLayout}>
            {googleAnalytics}
            <Head>
              <title key="title">CoinRotator - Coin Screener for Bullish & Bearish Crypto Trends</title>
              <meta name="description" key="description" content="A crypto screener spotting high momentum trades using the popular Supertrend. Check CoinRotator each day to ensure you are trading with the trend."/>
              <meta name="viewport" content="initial-scale=1.0, width=device-width" />
              <link rel="canonical" href={currentUrl} />
            </Head>
            <Client>
              { screens.lg && <Sider topCategories={topCategories} categories={categories} /> }
            </Client>
            <Layout className={baseStyles.innerLayout}>
              <Client>
                <Header
                  categories={categories}
                  screens={screens}
                  topCategories={topCategories}
                />
              </Client>
              <Component {...pageProps} />
            </Layout>
          </Layout>
        </NotificationContext.Provider>
      </DarkModeContext.Provider>
    </HydrationProvider>
  )
}

export default MyApp
