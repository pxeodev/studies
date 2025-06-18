import { Menu } from 'antd'
import {
  StarFilled,
  UpCircleFilled,
  HeartFilled,
  AlertFilled,
  SnippetsOutlined,
  QuestionCircleFilled,
  ContainerFilled,
  VideoCameraFilled,
  VerticalAlignBottomOutlined,
  SwapOutlined,
  ReadFilled,
  StepBackwardOutlined,
  LineChartOutlined,
  TagsOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/router'
import slugify from 'slugify'

import styles from "../styles/navigationmenu.module.less"
import { currentNarratives } from 'coinrotator-utils/variables.mjs'
import useBreakPoint from '../hooks/useBreakPoint'

const NavigationMenu = ({ collapsed = false, topCategories, onMenuItemSelected }) => {
  const router = useRouter()
  const screens = useBreakPoint()

  let menuItems = [
    {
      label: 'Screener Tools',
      key: 'screenertools',
      children: [
        {
          label: <Link href="/shumi" prefetch={false}>Shumi AI</Link>,
          key: '/shumi',
          icon: <img src="/toad-ai.png" alt="Shumi" width="22" height="22" />
        },
        {
          label: <Link href="/" prefetch={false}>Crypto Trends</Link>,
          key: '/',
          icon: <UpCircleFilled className={styles.polarGreen} />
        },
        {
          label: <Link href="/market-health" prefetch={false}>Market Health</Link>,
          key: '/market-health',
          icon: <HeartFilled className={styles.dustRed} />
        },
        {
          label: <Link href="/new-coins" prefetch={false}>New Coins</Link>,
          key: '/new-coins',
          icon: <AlertFilled className={styles.daybreakBlue} />
        },
        {
          label: <Link href="/categories" prefetch={false}>Categories</Link>,
          key: '/categories',
          icon: <TagsOutlined className={styles.sunsetOrange} />
        },
        {
          label: <Link href="/4h-alerts">4h Alerts</Link>,
          key: '/4h-alerts',
          icon: <TagsOutlined className={styles.daybreakBlue} />
        },
        {
          label: <Link href="https://www.tradingview.com/script/yNrotMjf-CoinRotator" target="_blank"  rel="noopener noreferrer">TradingView indicator</Link>,
          key: '/tradingview-indicator',
          icon: <LineChartOutlined className={styles.goldenPurple} />
        },
        {
          label: <Link href="/watchlist">Watchlist</Link>,
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
            label: <Link href={`/category/${slug}`} prefetch={false}>{category}</Link>,
            key: `narrative-${slug}`,
            icon: <TagsOutlined className={styles.goldenPurple} />
          }
        )
      })
    },
    {
      label: 'Tutorials',
      key: 'tutorials',
      children: [
        {
          label: <Link href="https://youtu.be/OcyZcip24pM" target="_blank" rel="noreferrer">Video Tutorials</Link>,
          key: 'video-tutorials',
          icon: <VideoCameraFilled className={styles.dustRed} />
        },
        {
          label: <Link href="https://coinrotator.medium.com/how-to-search-the-most-profitable-altcoins-daily-d8ac02d52e23" target="_blank" rel="noreferrer">Article Tutorials</Link>,
          key: 'article-tutorials',
          icon: <ReadFilled className={styles.gray} />
        }
      ]
    },
      {
        label: 'Preselects',
        key: 'preselects',
        children: [
          {
            label: <Link href="/low-market-cap" prefetch={false}>Low Market Cap</Link>,
            key: '/low-market-cap',
            icon: <VerticalAlignBottomOutlined className={styles.goldenPurple} />
          },
          {
            label: <Link href="/oldest-trends" prefetch={false}>Oldest Trends</Link>,
            key: '/oldest-trends',
            icon: <StepBackwardOutlined className={styles.sunsetOrange} />
          },
          {
            label: <Link href="/bybit-futures-screener" prefetch={false}>Bybit Futures Screener</Link>,
            key: '/bybit-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/binance-futures-screener" prefetch={false}>Binance Futures Screener</Link>,
            key: '/binance-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/kucoin-futures-screener" prefetch={false}>Kucoin Futures Screener</Link>,
            key: '/kucoin-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/okx-futures-screener" prefetch={false}>OKX Futures Screener</Link>,
            key: '/okx-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/mexc-futures-screener" prefetch={false}>MEXC Futures Screener</Link>,
            key: '/mexc-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/bitget-futures-screener" prefetch={false}>Bitget Futures Screener</Link>,
            key: '/bitget-futures-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/bingx-futures-screener" prefetch={false}>BingX Futures Screener</Link>,
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
            label: <Link href="/binance-screener" prefetch={false}>Binance</Link>,
            key: '/binance-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/kucoin-screener" prefetch={false}>Kucoin</Link>,
            key: '/kucoin-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          },
          {
            label: <Link href="/solana-screener" prefetch={false}>Solana</Link>,
            key: '/solana-screener',
            icon: <SwapOutlined className={styles.geekBlue} />
          }
        ]
      },
    {
      label: 'Top Categories',
      key: 'topcategories',
      children: topCategories.map((category) => {
        return {
          label: <Link href={`/category/${category.slug}`} prefetch={false}>{category.name}</Link>,
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
        //   label: <Link href="/team">Team</Link>,
        //   key: '/team',
        //   icon: <TeamOutlined className={styles.geekBlue} />
        // },
        {
          label: <Link href="/faq">FAQ</Link>,
          key: '/faq',
          icon: <QuestionCircleFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="/changelog">Changelog</Link>,
          key: '/changelog',
          icon: <DoubleRightOutlined className={styles.sunsetOrange} />
        },
        {
          label: <Link href="/terms">Terms & Conditions</Link>,
          key: '/terms',
          icon: <ContainerFilled className={styles.polarGreen} />
        },
        {
          label: 'Sitemap',
          icon: <Link href="/sitemap"><SnippetsOutlined className={styles.daybreakBlue} /></Link>,
          key: '/sitemap'
        }
      ]
    },
  ]
  // if (hasKeyPass) {
  //   menuItems.unshift({
  //     label: `🍄 KEY PASS 🍄`,
  //     key: 'keypass',
  //     children: [
  //       {
  //         label: 'Lower timeframes',
  //         icon: <a href="https://coinrotator-git-websockt-candles-my-team-49a155bf.vercel.app/" target="_blank"><LinkOutlined className={styles.daybreakBlue} /></a>,
  //         key: 'lowertimeframes'
  //       }
  //     ]
  //   })
  // }
  if (collapsed) {
    menuItems = [
      {
        label: 'Shumi AI',
        icon: <Link href="/shumi" prefetch={false}><img src="/toad-ai.png" alt="Shumi" width="22" height="22" /></Link>,
        key: '/shumi',
      },
      {
        label: 'Watchlist',
        icon: <Link href="/watchlist" prefetch={false}><StarFilled className={styles.sunsetOrange} /></Link>,
        key: '/watchlist',
      },
      {
        label: 'All Trends',
        icon: <Link href="/" prefetch={false}><UpCircleFilled className={styles.polarGreen} /></Link>,
        key: '/'
      },
      {
        label: 'Market Health',
        icon: <Link href="/market-health" prefetch={false}><HeartFilled className={styles.dustRed} /></Link>,
        key: '/market-health',
      },
      {
        label: "Today's Trends",
        key: '/todays-trends',
        icon: <Link href="/todays-trends" prefetch={false}><AlertFilled className={styles.daybreakBlue} /></Link>
      },
      {
        label: "Low Market Cap",
        key: '/low-market-cap',
        icon: <Link href="/low-market-cap" prefetch={false}><VerticalAlignBottomOutlined className={styles.goldenPurple} /></Link>
      },
      // {
      //   label: 'Team',
      //   icon: <Link href="/team"><TeamOutlined className={styles.geekBlue} /></Link>,
      //   key: '/team'
      // },
      {
        label: 'FAQ',
        icon: <Link href="/faq"><QuestionCircleFilled className={styles.sunsetOrange} /></Link>,
        key: '/faq'
      },
      {
        label: 'Changelog',
        icon: <Link href="/changelog"><DoubleRightOutlined className={styles.sunsetOrange} /></Link>,
        key: '/changelog'
      },
      {
        label: 'Terms & Conditions',
        icon: <Link href="/terms"><ContainerFilled className={styles.polarGreen} /></Link>,
        key: '/terms'
      },
      {
        label: 'Sitemap',
        icon: <Link href="/sitemap.xml"><SnippetsOutlined className={styles.daybreakBlue} /></Link>,
        key: '/sitemap'
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

  let props = {
    openKeys: ['screenertools']
  }
  if (!screens.lg) {
    props.openKeys = ['keypass', 'screenertools', 'currentnarratives', 'exchanges', 'preselects', 'topcategories', 'tutorials', 'about']
  }

  const handleMenuClick = (e) => {
    if (onMenuItemSelected) {
      onMenuItemSelected(e);
    }
  }

  return (
    <Menu
      mode="inline"
      motion={{}}
      items={menuItems}
      className={styles.menu}
      selectedKeys={[selectedKey]}
      {...props}
    />
  );
}

export default NavigationMenu
