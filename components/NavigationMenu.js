import { Menu } from 'antd'
import {
  StarFilled,
  UpCircleFilled,
  HeartFilled,
  RiseOutlined,
  LineChartOutlined,
  AlertFilled,
  TeamOutlined,
  QuestionCircleFilled,
  ContainerFilled,
  VideoCameraFilled,
  PlayCircleOutlined,
  VerticalAlignBottomOutlined,
  ReadFilled
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/router'

import styles from "../styles/navigationmenu.module.less"

const NavigationMenu = ({ collapsed = false , topCategories }) => {
  const router = useRouter()
  let menuItems = [
    {
      label: 'Screener Tools',
      key: 'screenertools',
      children: [
        {
          label: <Link href="/watchlist">Watchlist</Link>,
          key: '/watchlist',
          icon: <StarFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="/" prefetch={false}>Trends</Link>,
          key: '/',
          icon: <UpCircleFilled className={styles.polarGreen} />
        },
        {
          label: <Link href="/market-health" prefetch={false}>Market Health</Link>,
          key: '/market-health',
          icon: <HeartFilled className={styles.dustRed} />
        },
        {
          label: <Link href="/todays-trends" prefetch={false}>Today&apos;s Trends</Link>,
          key: '/todays-trends',
          icon: <AlertFilled className={styles.daybreakBlue} />
        },
        {
          label: <Link href="/current-narratives" prefetch={false}>Current narratives</Link>,
          key: '/current-narratives',
          icon: <PlayCircleOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="/low-market-cap" prefetch={false}>Low market cap</Link>,
          key: '/low-market-cap',
          icon: <VerticalAlignBottomOutlined className={styles.goldenPurple} />
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
          label: <Link href={`/category/${category.slug}`} prefetch={false}>{category.name}</Link>,
          key: `/${category.slug}`
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
          label: <Link href="/terms">Terms & Conditions</Link>,
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
        icon: <Link href="/watchlist"><StarFilled className={styles.sunsetOrange} /></Link>,
        key: '/watchlist',
      },
      {
        label: 'Trends',
        icon: <Link href="/"><UpCircleFilled className={styles.polarGreen} /></Link>,
        key: '/'
      },
      {
        label: 'Market Health',
        icon: <Link href="/market-health"><HeartFilled className={styles.dustRed} /></Link>,
        key: '/market-health',
      },
      {
        label: 'Top Coins',
        icon: <Link href="/top-coins"><RiseOutlined className={styles.geekBlue} /></Link>,
        key: '/top-coins'
      },
      {
        label: 'Gainser and Losers',
        icon: <Link href="/gainers-and-losers"><LineChartOutlined className={styles.goldenPurple} /></Link>,
        key: '/gainers-and-losers'
      },
      {
        label: 'New Pairs',
        icon: <Link href="/new-pairs"><AlertFilled className={styles.daybreakBlue} /></Link>,
        key: '/new-pairs'
      },
      {
        label: 'Team',
        icon: <Link href="/team"><TeamOutlined className={styles.geekBlue} /></Link>,
        key: '/team'
      },
      {
        label: 'FAQ',
        icon: <Link href="/faq"><QuestionCircleFilled className={styles.sunsetOrange} /></Link>,
        key: '/faq'
      },
      {
        label: 'Terms & Conditions',
        icon: <Link href="/terms"><ContainerFilled className={styles.polarGreen} /></Link>,
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
      openKeys={['screenertools', 'topcategories', 'tutorials', 'about']}
      items={menuItems}
      className={styles.menu}
      inlineIndent={0}
      selectedKeys={[selectedKey]}
    />
  );
}

export default NavigationMenu