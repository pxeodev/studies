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
  ReadFilled
} from '@ant-design/icons'
import Link from 'next/link'

import styles from "../styles/navigationmenu.module.less"

const NavigationMenu = ({ collapsed = false , topCategories }) => {
  let menuItems = [
    {
      label: 'Screener Tools',
      key: 'screenertools',
      children: [
        {
          label: <Link href="watchlist">Watchlist</Link>,
          key: 'watchlist',
          icon: <StarFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="trends">Trends</Link>,
          key: 'trends',
          icon: <UpCircleFilled className={styles.polarGreen} />
        },
        {
          label: <Link href="market-health">Market Health</Link>,
          key: 'market-health',
          icon: <HeartFilled className={styles.dustRed} />
        },
        {
          label: <Link href="top-coins">Top Coins</Link>,
          key: 'top-coins',
          icon: <RiseOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="gainers-and-losers">Gainers & Losers</Link>,
          key: 'gainers-and-losers',
          icon: <LineChartOutlined className={styles.goldenPurple} />
        },
        {
          label: <Link href="new-pairs">New Pairs</Link>,
          key: 'new-pairs',
          icon: <AlertFilled className={styles.daybreakBlue} />
        },
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
          label: <Link href={`/?category=${category}`}>{category}</Link>,
          key: category
        }
      })
    },
    {
      label: 'About',
      key: 'about',
      children: [
        {
          label: <Link href="/team">Team</Link>,
          key: 'team',
          icon: <TeamOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="/faq">FAQ</Link>,
          key: 'faq',
          icon: <QuestionCircleFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="/terms">Terms & Conditions</Link>,
          key: 'terms',
          icon: <ContainerFilled className={styles.polarGreen} />
        }
      ]
    },
  ]
  if (collapsed) {
    menuItems = [
      {
        label: 'Watchlist',
        icon: <Link href="watchlist"><StarFilled className={styles.sunsetOrange} /></Link>,
        key: 'watchlist',
      },
      {
        label: 'Trends',
        icon: <Link href="trends"><UpCircleFilled className={styles.polarGreen} /></Link>,
        key: 'trends'
      },
      {
        label: 'Market Health',
        icon: <Link href="market-health"><HeartFilled className={styles.dustRed} /></Link>,
        key: 'market-health',
      },
      {
        label: 'Top Coins',
        icon: <Link href="top-coins"><RiseOutlined className={styles.geekBlue} /></Link>,
        key: 'top-coins'
      },
      {
        label: 'Gainser and Losers',
        icon: <Link href="gainers-and-losers"><LineChartOutlined className={styles.goldenPurple} /></Link>,
        key: 'gainers-and-losers'
      },
      {
        label: 'New Pairs',
        icon: <Link href="new-pairs"><AlertFilled className={styles.daybreakBlue} /></Link>,
        key: 'new-pairs'
      },
      {
        label: 'Team',
        icon: <Link href="team"><TeamOutlined className={styles.geekBlue} /></Link>,
        key: 'team'
      },
      {
        label: 'FAQ',
        icon: <Link href="faq"><QuestionCircleFilled className={styles.sunsetOrange} /></Link>,
        key: 'faq'
      },
      {
        label: 'Terms & Conditions',
        icon: <Link href="terms"><ContainerFilled className={styles.polarGreen} /></Link>,
        key: 'terms'
      }
    ]
  }
  return (
    <Menu
      mode="inline"
      openKeys={['screenertools', 'topcategories', 'tutorials', 'about']}
      items={menuItems}
      className={styles.menu}
      inlineIndent={0}
    />
  );
}

export default NavigationMenu