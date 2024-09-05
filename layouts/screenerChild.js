import Head from 'next/head'
import { Layout } from 'antd'
import { createContext, useEffect } from "react"
import { Client } from "react-hydration-provider";
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'

import { base } from 'wagmi/chains'

import Header from '../components/Header'
import Banner from '../components/Banner'
import Sider from '../components/Sider'
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import useKeyPass from '../hooks/useKeyPass';
import baseStyles from "../styles/base.module.less"
import SharedLayout from "../layouts/shared"
import variableStyles from '../styles/variables.module.less'

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

const projectId = '6789ab4356c448d7b46d927fc92f6a96'
let url = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL
if (process.env.VERCEL_ENV === 'preview') {
  url = `https://${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}`
}
const metadata = {
  name: 'CoinRotator',
  url,
  icons: ['https://coinrotator.app/coin.svg']
}
const chains = [base]
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true
})

export default function ScreenerLayout({ page, pageProps }) {
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
  createWeb3Modal({
    defaultChain: base,
    wagmiConfig: config,
    projectId,
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
      '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1'
    ],
    enableAnalytics: true,
    themeMode: isDark ? 'dark' : 'light',
    themeVariables: {
      '--w3m-font-family': variableStyles.fontFamily,
    },
  })
  useEffect(() => {
    const html = document.querySelector('html');
    html.dataset.theme = isDark ? 'theme-dark' : 'theme-light';
  }, [isDark])
  const screens = useBreakPoint();
  const hasKeyPass = useKeyPass()

  const {topCategories,categories} = pageProps.appData

  return (
    <>
      { hasKeyPass ? <></> : <Banner /> }
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
    </>
  )
}