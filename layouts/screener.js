import { notification } from 'antd'
import { createContext, useEffect } from "react"
import { HydrationProvider } from "react-hydration-provider";
import { CookiesProvider } from 'react-cookie';
import io from 'socket.io-client'

import useDarkMode from "../hooks/usedarkmode"
import useSocketStore from "../hooks/useSocketStore"
import ScreenerChild from './screenerChild'

export const DarkModeContext = createContext(null);
export const NotificationContext = createContext(null);

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
  // In Ant Design v4, notification is a static object, not a hook
  // We provide it via context for consistency, but no contextHolder is needed

  return (
    <HydrationProvider>
      <DarkModeContext.Provider value={darkMode}>
          <CookiesProvider defaultSetOptions={{ path: '/' }}>
              <NotificationContext.Provider value={notification}>
                <ScreenerChild pageProps={pageProps} page={page} />
              </NotificationContext.Provider>
          </CookiesProvider>
      </DarkModeContext.Provider>
    </HydrationProvider>
  )
}