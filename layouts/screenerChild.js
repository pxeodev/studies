import Head from 'next/head'
import { Layout } from 'antd'
import { createContext, useEffect } from "react"
import { Client } from "react-hydration-provider";
import { Web3AuthProvider } from '../contexts/Web3AuthContext'
import { KeyPassProvider } from '../context/KeyPassContext'

import Header from '../components/Header'
import Banner from '../components/Banner'
import Sider from '../components/Sider'
import MobileConnectButton from '../components/MobileConnectButton'
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import baseStyles from "../styles/base.module.less"
import SharedLayout from "../layouts/shared"

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

export default function ScreenerLayout({ page, pageProps }) {
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
  
  useEffect(() => {
    const html = document.querySelector('html');
    html.dataset.theme = isDark ? 'theme-dark' : 'theme-light';
  }, [isDark])
  
  const screens = useBreakPoint();
  const {topCategories, categories} = pageProps.appData

  return (
    <>
      <Web3AuthProvider>
        <KeyPassProvider>
          <Banner />
          <Layout className={baseStyles.outerLayout}>
            <SharedLayout pageProps={pageProps} />
            <Head>
              <title key="title">CoinRotator - Coin Screener for Bullish & Bearish Crypto Trends</title>
              <meta name="description" key="description" content="A crypto screener spotting high momentum trades using the popular Supertrend. Check CoinRotator each day to ensure you are trading with the trend."/>
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
              {page}
            </Layout>
          </Layout>
          <MobileConnectButton />
        </KeyPassProvider>
      </Web3AuthProvider>
    </>
  )
}