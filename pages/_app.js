import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { useEffect } from "react";

import useDarkMode from '../hooks/usedarkmode'
import DarkModeSwitch from '../components/DarkModeSwitch'
import Footer from '../components/Footer'
import Header from '../components/Header'
import * as gtag from '../lib/gtag'

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useDarkMode();
  const router = useRouter();
  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  pageProps.currentUrl = currentUrl

  const {topCoins, topCategories} = pageProps.appData

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `,
        }}
      />
      <Head>
        <title key="title">CoinRotator</title>
        <meta name="description" key="description" content="Coinrotator screens the top 1000 crypto coins daily for fresh signals. Always be on the right side of the market."/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="canonical" href={currentUrl} />
      </Head>
      <Header />
      <Component {...pageProps} />
      <Footer topCoins={topCoins} topCategories={topCategories} />
    </>
  )
}

export default MyApp
