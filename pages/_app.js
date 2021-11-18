import '../styles/globals.css'
import "../styles/ant.less";
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Coinrotator</title>
        <meta name="description" content="Daily Supertrend values for the top 250 crypto currency tokens."/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
        <div>
          <div>
            <div href="#home">Coinrotator - Daily Supertrend</div>
          </div>
        </div>
        <Component {...pageProps} className="mt-5" />
    </>
  )
}

export default MyApp
