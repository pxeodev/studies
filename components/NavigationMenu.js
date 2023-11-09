import { Menu } from 'antd'
import {
  StarFilled,
  UpCircleFilled,
  HeartFilled,
  AlertFilled,
  TeamOutlined,
  QuestionCircleFilled,
  ContainerFilled,
  VideoCameraFilled,
  VerticalAlignBottomOutlined,
  SwapOutlined,
  ReadFilled,
  StepBackwardOutlined,
  LineChartOutlined,
  TagsOutlined
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/router'
import slugify from 'slugify'

import styles from "../styles/navigationmenu.module.less"
import { currentNarratives } from '../utils/variables.mjs'

const NavigationMenu = ({ collapsed = false , topCategories, onMenuItemSelected }) => {
  const router = useRouter()
  let menuItems = [
    {
      label: 'Screener Tools',
      key: 'screenertools',
      children: [
        {
          label: <a href="/" prefetch={false}>Crypto Trends</a>,
          key: '/',
          icon: <UpCircleFilled className={styles.polarGreen} />
        },
        {
          label: <a href="/market-health" prefetch={false}>Market Health</a>,
          key: '/market-health',
          icon: <HeartFilled className={styles.dustRed} />
        },
        {
          label: <a href="/todays-trends" prefetch={false}>Today&apos;s Trends</a>,
          key: '/todays-trends',
          icon: <AlertFilled className={styles.daybreakBlue} />
        },
        {
          label: <a href="/categories" prefetch={false}>Categories</a>,
          key: '/categories',
          icon: <TagsOutlined className={styles.sunsetOrange} />
        },
        // {
        //   label: <a href="/4h-alerts" prefetch={false}>4h Alerts</a>,
        //   key: '/4h-alerts',
        //   icon: <TagsOutlined className={styles.daybreakBlue} />
        // },
        {
          label: <a href="https://www.tradingview.com/script/yNrotMjf-CoinRotator" target="_blank"  rel="noopener noreferrer">TradingView indicator</a>,
          key: '/tradingview-indicator',
          icon: <LineChartOutlined className={styles.goldenPurple} />
        },
        {
          label: <a href="/watchlist">Watchlist</a>,
          key: '/watchlist',
          icon: <StarFilled className={styles.sunsetOrange} />
        }
      ]
    },
    {
      label: 'Current Narratives',
      key: 'currentnarratives',
      children: currentNarratives.map((category) => {
        const slug = slugify(category)
        return (
          {
            label: <a href={`/category/${slug}`} prefetch={false}>{category}</a>,
            key: `narrative-${slug}`,
            icon: <TagsOutlined className={styles.goldenPurple} />
          }
          )
        })
      },
      {
        label: 'Preselects',
        key: 'preselects',
        children: [
          {
            label: <a href="/low-market-cap" prefetch={false}>Low Market Cap</a>,
            key: '/low-market-cap',
            icon: <VerticalAlignBottomOutlined className={styles.goldenPurple} />
          },
          {
            label: <a href="/oldest-trends" prefetch={false}>Oldest Trends</a>,
            key: '/oldest-trends',
            icon: <StepBackwardOutlined className={styles.sunsetOrange} />
          },
          {
            label: <a href="/bybit-futures-screener" prefetch={false}>Bybit Futures Screener</a>,
            key: '/bybit-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/binance-futures-screener" prefetch={false}>Binance Futures Screener</a>,
            key: '/binance-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/kucoin-futures-screener" prefetch={false}>Kucoin Futures Screener</a>,
            key: '/kucoin-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/okx-futures-screener" prefetch={false}>OKX Futures Screener</a>,
            key: '/okx-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/mexc-futures-screener" prefetch={false}>MEXC Futures Screener</a>,
            key: '/mexc-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/bitget-futures-screener" prefetch={false}>Bitget Futures Screener</a>,
            key: '/bitget-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/bingx-futures-screener" prefetch={false}>BingX Futures Screener</a>,
            key: '/bingx-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          }
        ]
      },
      {
        label: 'Exchanges',
        key: 'exchanges',
        children: [
          {
            label: <a href="/binance-screener" prefetch={false}>Binance</a>,
            key: '/binance-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/kucoin-screener" prefetch={false}>Kucoin</a>,
            key: '/kucoin-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <a href="/solana-screener" prefetch={false}>Solana</a>,
            key: '/solana-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          }
        ]
      },
    {
      label: 'Tutorials',
      key: 'tutorials',
      children: [
        {
          label: <a href="https://youtu.be/OcyZcip24pM" target="_blank" rel="noreferrer">Video Tutorials</a>,
          key: 'video-tutorials',
          icon: <VideoCameraFilled className={styles.dustRed} />
        },
        {
          label: <a href="https://coinrotator.medium.com/how-to-search-the-most-profitable-altcoins-daily-d8ac02d52e23" target="_blank" rel="noreferrer">Article Tutorials</a>,
          key: 'article-tutorials',
          icon: <ReadFilled className={styles.gray} />
        }
      ]
    },
    {
      label: 'Top Categories',
      key: 'topcategories',
      children: topCategories.map((category) => {
        return {
          label: <a href={`/category/${category.slug}`} prefetch={false}>{category.name}</a>,
          key: `/${category.slug}`,
          icon: <TagsOutlined className={styles.goldenPurple} />
        }
      })
    },
    {
      label: 'About',
      key: 'about',
      children: [
        // {
        //   label: <a href="/team">Team</a>,
        //   key: '/team',
        //   icon: <TeamOutlined className={styles.geekBlue} />
        // },
        {
          label: <a href="/faq">FAQ</a>,
          key: '/faq',
          icon: <QuestionCircleFilled className={styles.sunsetOrange} />
        },
        {
          label: <a href="/terms">Terms & Conditions</a>,
          key: '/terms',
          icon: <ContainerFilled className={styles.polarGreen} />
        }
      ]
    },
  ]
  if (collapsed) {
    menuItems = [
      {
        label: 'Watchlist',
        icon: <a href="/watchlist" prefetch={false}><StarFilled className={styles.sunsetOrange} /></a>,
        key: '/watchlist',
      },
      {
        label: 'All Trends',
        icon: <a href="/" prefetch={false}><UpCircleFilled className={styles.polarGreen} /></a>,
        key: '/'
      },
      {
        label: 'Market Health',
        icon: <a href="/market-health" prefetch={false}><HeartFilled className={styles.dustRed} /></a>,
        key: '/market-health',
      },
      {
        label: "Today's Trends",
        key: '/todays-trends',
        icon: <a href="/todays-trends" prefetch={false}><AlertFilled className={styles.daybreakBlue} /></a>
      },
      {
        label: "Low Market Cap",
        key: '/low-market-cap',
        icon: <a href="/low-market-cap" prefetch={false}><VerticalAlignBottomOutlined className={styles.goldenPurple} /></a>
      },
      // {
      //   label: 'Team',
      //   icon: <a href="/team"><TeamOutlined className={styles.geekBlue} /></a>,
      //   key: '/team'
      // },
      {
        label: 'FAQ',
        icon: <a href="/faq"><QuestionCircleFilled className={styles.sunsetOrange} /></a>,
        key: '/faq'
      },
      {
        label: 'Terms & Conditions',
        icon: <a href="/terms"><ContainerFilled className={styles.polarGreen} /></a>,
        key: '/terms'
      }
    ]
  }
  let selectedKey = null
  for (const item of menuItems) {
    if (item.children) {
      for (const child of item.children) {
        if (child.key === router.pathname) {
          selectedKey = child.key
        }
      }
    } else {
      if (item.key === router.pathname) {
        selectedKey = item.key
      }
    }
  }

  return (
    <Menu
      mode="inline"
      motion={{}}
      openKeys={['screenertools', 'currentnarratives', 'exchanges', 'preselects', 'topcategories', 'tutorials', 'about']}
      items={menuItems}
      className={styles.menu}
      inlineIndent={0}
      selectedKeys={[selectedKey]}
      onClick={onMenuItemSelected}
    />
  );
}

export default NavigationMenu
