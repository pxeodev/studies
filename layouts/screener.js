import Head from 'next/head'
import { Layout, notification } from 'antd'
import { createContext, useEffect } from "react"
import { HydrationProvider, Client } from "react-hydration-provider";
import io from 'socket.io-client'

import Header from '../components/Header'
import Sider from '../components/Sider'
import useDarkMode from "../hooks/usedarkmode"
import useBreakPoint from "../hooks/useBreakPoint"
import useSocketStore from "../hooks/useSocketStore"
import baseStyles from "../styles/base.module.less"
import SharedLayout from "../layouts/shared"

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

export default function ScreenerLayout(page, pageProps) {
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
  const setSocket = useSocketStore(state => state.setSocket)
  useEffect(() => {
    console.log("Connecting to WebSocket server...");
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
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
      </DarkModeContext.Provider>
    </HydrationProvider>
  )
}