import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'

import useDarkMode from '../hooks/usedarkmode'
import DarkModeSwitch from '../components/DarkModeSwitch'
import Footer from '../components/Footer'
import Header from '../components/Header'

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useDarkMode();
  const router = useRouter();

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  pageProps.currentUrl = currentUrl
  const {topCoins, topCategories} = pageProps.appData
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
    <>
      {googleAnalytics}
      <Head>
        <title key="title">CoinRotator</title>
        <meta name="description" key="description" content="Coinrotator screens the top 1000 crypto coins daily for fresh trends. Always be on the right side of the market."/>
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
