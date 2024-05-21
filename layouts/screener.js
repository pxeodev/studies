import Head from 'next/head'
import { Layout, notification } from 'antd'
import { createContext, useEffect } from "react"
import { HydrationProvider, Client } from "react-hydration-provider";
import io from 'socket.io-client'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'

import { WagmiProvider } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Header from '../components/Header'
import Sider from '../components/Sider'
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import useSocketStore from "../hooks/useSocketStore"
import baseStyles from "../styles/base.module.less"
import SharedLayout from "../layouts/shared"
import variableStyles from '../styles/variables.module.less'

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

const queryClient = new QueryClient()
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
const chains = [mainnet, base]
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true
})

export default function ScreenerLayout(page, pageProps) {
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
  createWeb3Modal({
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
  const setSocket = useSocketStore(state => state.setSocket)
  useEffect(() => {
    const date = new Date();
    console.log("Connecting to WebSocket server...", date.toLocaleTimeString(), date.getMilliseconds());
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
      transports: ["websocket", "webtransport"],
    });

    newSocket.on("connect", () => {
      const date = new Date();
      console.log("Connected to WebSocket server", date.toLocaleTimeString(), date.getMilliseconds());
    });

    setSocket(newSocket);

    return () => {
      console.log("Disconnecting from WebSocket server...");
      newSocket.disconnect();
    };
  }, [setSocket]);
  useEffect(() => {
    const html = document.querySelector('html');
    html.dataset.theme = isDark ? 'theme-dark' : 'theme-light';
  }, [isDark])
  const screens = useBreakPoint();
  const [api, contextHolder] = notification.useNotification();

  const {topCategories,categories} = pageProps.appData

  return (
    <HydrationProvider>
      <DarkModeContext.Provider value={darkMode}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <NotificationContext.Provider value={api}>
              {contextHolder}
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
            </NotificationContext.Provider>
          </QueryClientProvider>
        </WagmiProvider>
      </DarkModeContext.Provider>
    </HydrationProvider>
  )
}