import { notification } from 'antd'
import { createContext, useEffect } from "react"
import { HydrationProvider } from "react-hydration-provider";
import { CookiesProvider } from 'react-cookie';
import io from 'socket.io-client'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'

import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import useDarkMode from "../hooks/usedarkmode"
import useSocketStore from "../hooks/useSocketStore"
import ScreenerChild from './screenerChild'

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
const chains = [base]
const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true
})

export default function ScreenerLayout(page, pageProps) {
  const darkMode = useDarkMode();
  const isDark = darkMode[0]
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
  const [api, contextHolder] = notification.useNotification();

  return (
    <HydrationProvider>
      <DarkModeContext.Provider value={darkMode}>
        <WagmiProvider config={config}>
          <CookiesProvider defaultSetOptions={{ path: '/' }}>
            <QueryClientProvider client={queryClient}>
              <NotificationContext.Provider value={api}>
                {contextHolder}
                <ScreenerChild pageProps={pageProps} page={page} />
              </NotificationContext.Provider>
            </QueryClientProvider>
          </CookiesProvider>
        </WagmiProvider>
      </DarkModeContext.Provider>
    </HydrationProvider>
  )
}