import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'
import Script from 'next/script'

import Footer from '../components/Footer'
import Header from '../components/Header'

function MyApp({ Component, pageProps }) {
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
        <title key="title">CoinRotator - The Most Effective Cryptocurrency Trend Screener</title>
        <meta name="description" key="description" content="Coinrotator screens the top 1000 crypto coins daily for trends. With up to date tokenomics data spot hidden opportunites that inform you earlier than the crowd."/>
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
