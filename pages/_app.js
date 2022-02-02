import "../styles/ant.less"
import styles from '../styles/globals.module.css'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Layout, Menu, Typography } from 'antd'

import useDarkMode from '../hooks/usedarkmode'
import DarkModeSwitch from '../components/DarkModeSwitch'

const { Header, Footer } = Layout;

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useDarkMode();
  const router = useRouter();
  const currentUrl = `https://www.coinrotator.app${router.asPath}`
  pageProps.currentUrl = currentUrl

  return (
    <>
      <Head>
        <title key="title">CoinRotator</title>
        <meta name="description" key="description" content="Coinrotator issues a daily signal for the top 1000 crypto coins. Always be on the right side of the market."/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="canonical" href={currentUrl} />
      </Head>
      <Header className={styles.header}>
        <Menu mode="horizontal">
          <Menu.Item key="logo" className={styles.logo} data-id="logo">
            <Link href="/" passHref>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/coin.svg" alt="Logo" height={24} width={24} className={styles.logoSvg}/>
            </Link>
            <Link href="/" passHref>
              <span className={styles.logoTitle}><b>Coin</b>Rotator</span>
            </Link>
          </Menu.Item>
          <Menu.Item key="faq"><Link href="/faq">FAQ</Link></Menu.Item>
          {/* <Menu.Item key="dark-mode"><DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode}/></Menu.Item> */}
        </Menu>
      </Header>
      <Component {...pageProps} />
      <Footer className={styles.footer}>
        <b className={styles.footerTitle}>CoinRotator</b>
        <Typography.Paragraph className={styles.footerLove} type="secondary">
          Made with 💙 by <a className={styles.gaLink} href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
        </Typography.Paragraph>
      </Footer>
    </>
  )
}

export default MyApp
