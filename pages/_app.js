import "../styles/ant.less"
import styles from '../styles/globals.module.css'
import Head from 'next/head'
import Image from 'next/image'
import { Layout, Menu, Typography } from 'antd'

import useDarkMode from '../hooks/usedarkmode'
import DarkModeSwitch from '../components/DarkModeSwitch'
import Paragraph from "antd/lib/skeleton/Paragraph"

const { Header, Content, Footer } = Layout;

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useDarkMode();

  return (
    <>
      <Head>
        <title>CoinRotator</title>
        <meta name="description" content="Daily Supertrend values for the top 500 crypto currency tokens."/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
        <Header className={styles.header}>
          <Menu mode="horizontal">
            <Menu.Item key="logo" className={styles.logo} data-id="logo">
              <Image src="/coin.svg" alt="Logo" height={24} width={24} className={styles.logoSvg}/>
              <span className={styles.logoTitle}><b>Coin</b>Rotator</span>
            </Menu.Item>
            {/* <Menu.Item key="faq">FAQ</Menu.Item> */}
            {/* <Menu.Item key="dark-mode"><DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode}/></Menu.Item> */}
          </Menu>
        </Header>
        <Content className={styles.content}>
          <Component {...pageProps} />
        </Content>
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
