import "../styles/ant.less"
import Head from 'next/head'
import { useRouter } from 'next/router'

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

  return (
    <>
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
