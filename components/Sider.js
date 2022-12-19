import { Layout, Space, Menu } from 'antd'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
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
import classnames from 'classnames'
import { useState, useContext } from 'react'
import Link from 'next/link'

import Logo from './Logo'
import Search from './Search'
import DarkModeSwitch from './DarkModeSwitch'
import { DarkModeContext } from '../pages/_app'
import styles from "../styles/sider.module.less"

const Sider = ({ topCategories, categories, coins }) => {
  const [darkMode, setDarkMode] = useContext(DarkModeContext)
  const [collapsed, setCollapsed] = useState(false)
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
          label: <Link href="team">Team</Link>,
          key: 'team',
          icon: <TeamOutlined className={styles.geekBlue} />
        },
        {
          label: <Link href="faq">FAQ</Link>,
          key: 'faq',
          icon: <QuestionCircleFilled className={styles.sunsetOrange} />
        },
        {
          label: <Link href="terms">Terms & Conditions</Link>,
          key: 'terms',
          icon: <ContainerFilled className={styles.polarGreen} />
        }
      ]
    },
  ]
  let Trigger = MenuFoldOutlined
  if (collapsed) {
    Trigger = MenuUnfoldOutlined
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
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      collapsedWidth={56}
      width={240}
      trigger={<Trigger className={styles.trigger} />}
      className={classnames(styles.sidebar, { [styles.collapsed]: collapsed })}
    >
      <Logo className={styles.logo} showText={!collapsed} />
      <Space size={12} className={styles.tools}>
        <Search categories={categories} coins={coins} collapsed={collapsed} />
        { collapsed ? <></> : <DarkModeSwitch darkMode={darkMode} setDarkMode={setDarkMode} />}
      </Space>
      <Menu
        theme={darkMode ? 'dark' : 'light'}
        mode="inline"
        openKeys={['screenertools', 'topcategories', 'tutorials', 'about']}
        items={menuItems}
        className={styles.menu}
        inlineIndent={0}
      />
      <div className={styles.footer}>
        <Space size={16} className={styles.socials}>
          <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/discord.svg" alt="Discord Logo" />
          </a>
          <a href="https://twitter.com/coinrotatorapp" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/twitter.svg" alt="Twitter Logo" />
          </a>
          <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/medium.svg" alt="Medium Logo" />
          </a>
          <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/telegram.svg" alt="Telegram Logo" />
          </a>
          <a href="https://www.youtube.com/@coinrotator" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/youtube.svg" alt="YouTube Logo" />
          </a>
        </Space>
        { collapsed ? <></> : (
          <>
            <div className={styles.fundedby}>Funded by</div>
            <Space size={16} className={styles.funders}>
              <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">
                <svg fill="none" viewBox="0 0 107 20" xmlns="http://www.w3.org/2000/svg" className={styles.ga}>
                  <g clip-path="url(#a)">
                  <path d="m3.9958 0h102.5l-3.496 20h-102.5l3.4958-20zm14.5 9.5431-0.2655 3.5177c-0.3878 0.1899-0.7986 0.3273-1.222 0.4088-0.4954 0.0989-0.9995 0.1472-1.5045 0.1443-0.6353 0.0183-1.265-0.1246-1.8313-0.4157-0.5042-0.2683-0.9177-0.6821-1.188-1.1886-0.2864-0.5588-0.4291-1.1813-0.4152-1.8104-0.0165-0.70006 0.144-1.3929 0.4663-2.013 0.3019-0.56519 0.7625-1.0277 1.3241-1.3294 0.6221-0.32393 1.3154-0.48348 2.0151-0.46376 0.9159-0.04692 1.8202 0.22336 2.5631 0.76606l-0.6808 1.3157c-0.2526-0.20149-0.5337-0.3636-0.8339-0.48093-0.3055-0.10565-0.6268-0.1568-0.9497-0.15116-0.2799-0.01624-0.5599 0.03015-0.82 0.13585-0.2601 0.10571-0.4939 0.26813-0.6845 0.47563-0.3828 0.49526-0.5729 1.1147-0.5344 1.7417-0.0374 0.5359 0.1253 1.0666 0.4561 1.4875 0.1771 0.1794 0.3903 0.3182 0.6252 0.4071 0.235 0.0889 0.4861 0.1258 0.7364 0.1082 0.2976-0.0039 0.5936-0.0442 0.8816-0.1203l0.0987-1.2882h-1.2254l0.0953-1.2573 2.8933 0.01031zm5.7287 2.5249 0.5004 1.4566h1.7904l-2.7231-7.0492h-1.4705l-3.8055 7.0492h1.8721l0.725-1.4566h3.1112zm-0.5004-1.3947h-1.913l1.1199-2.2466 0.7931 2.2466zm9.3608-4.1979h1.4331l-0.5379 7.0492h-1.61l0.2451-3.1982-1.5794 3.1982h-1.1675l-1.0893-3.1879-0.2451 3.1879h-1.5998l0.5412-7.0492h1.4297l1.7189 4.8712 2.461-4.8712zm8.3294 5.0499c0.0061-0.3673-0.1009-0.7274-0.3064-1.0306h-0.0136c-0.2022-0.2961-0.499-0.51319-0.8407-0.61493 0.3567-0.12387 0.6724-0.34503 0.9122-0.63896 0.2421-0.34799 0.3447-0.77555 0.2872-1.1968-0.0574-0.42122-0.2707-0.80489-0.597-1.0739-0.5141-0.36142-1.1346-0.53584-1.7598-0.49467h-3.2983l-0.5276 7.0492h3.5128c0.6756 0.0336 1.3444-0.1505 1.9096-0.5256 0.2327-0.1652 0.4207-0.3867 0.5468-0.6441 0.1261-0.2575 0.1862-0.5427 0.1748-0.8296zm-1.7787 0.1769c-0.043 0.1023-0.1115 0.1917-0.199 0.2593-0.2561 0.1246-0.5402 0.1791-0.8237 0.158h-1.4501l0.1158-1.4771h1.4534c0.2544-0.0201 0.5085 0.0425 0.7251 0.1786 0.078 0.0686 0.1389 0.1546 0.178 0.2513 0.039 0.0966 0.055 0.2012 0.0466 0.3052 0.0127 0.1105-0.0032 0.2223-0.0461 0.3247zm0.0103-2.8486c-0.0412 0.09411-0.1064 0.17555-0.1888 0.23607l0.0034 0.01718c-0.254 0.11924-0.5343 0.17013-0.8136 0.14771h-1.256l0.1089-1.3741h1.2629c0.2477-0.02116 0.4957 0.03779 0.708 0.16833 0.075 0.05943 0.1345 0.13656 0.173 0.22462 0.0386 0.08806 0.0552 0.18434 0.0482 0.28036 0.0111 0.10229-0.0048 0.20572-0.046 0.29983zm2.5033 4.671 0.5514-7.0492h1.8551l-0.4527 5.5445h2.9546l-0.109 1.5047h-4.7994zm7.9213-5.6235h3.1758l0.1191-1.4256h-4.9833l-0.5514 7.0492h4.9765l0.1055-1.4257h-3.1758l0.1157-1.4462h2.9716l0.1293-1.4256h-2.992l0.109-1.326zm8.7885 3.0161c0.1315 0.1713 0.2276 0.3676 0.2825 0.5771l0.6808 2.0303h-1.9436l-0.725-2.3463c-0.0783-0.2645-0.303-0.3951-0.6808-0.3951h-0.6808l-0.2076 2.7482h-1.8143l0.5378-7.0491h3.4039c0.6212-0.03749 1.2339 0.15966 1.719 0.55308 0.2042 0.18514 0.3654 0.41358 0.4719 0.66896 0.1065 0.25537 0.1557 0.53136 0.1442 0.80819 0 1.1451-0.5424 1.8482-1.6271 2.1093 0.1733 0.0556 0.327 0.1606 0.4425 0.3023l-0.0034-0.0069zm-1.5079-1.5149c0.2581 0.01871 0.5145-0.0542 0.725-0.20611 0.0821-0.07223 0.1467-0.16234 0.1892-0.26351 0.0425-0.10118 0.0616-0.21077 0.0559-0.32049 0.0073-0.10085-0.0075-0.2021-0.0433-0.29652-0.0359-0.09441-0.092-0.17967-0.1643-0.24968-0.191-0.13651-0.4239-0.19984-0.657-0.17864h-1.4603l-0.1157 1.5081 1.4705 0.00687zm3.1245 3.4386c0.4083 0.2603 0.8553 0.4529 1.3241 0.5703v-0.0069c0.5124 0.1347 1.0397 0.2028 1.5692 0.2027 0.7996 0.0505 1.5946-0.1563 2.2703-0.5909 0.2576-0.1842 0.4652-0.4308 0.6037-0.7171 0.1386-0.2863 0.2037-0.6032 0.1894-0.9215 0.0114-0.3734-0.1092-0.7387-0.3403-1.0305-0.2216-0.2643-0.5013-0.47258-0.817-0.60808-0.3873-0.16571-0.7853-0.30458-1.1913-0.41566-0.3518-0.08741-0.694-0.21056-1.0212-0.36757-0.0952-0.03918-0.1766-0.10627-0.2336-0.19262-0.0571-0.08635-0.0871-0.18798-0.0863-0.29175 0.0014-0.10192 0.0317-0.20131 0.0871-0.28649 0.0555-0.08519 0.1339-0.15264 0.226-0.19445 0.2668-0.12617 0.56-0.18511 0.8544-0.17176 0.3404 0.00401 0.6781 0.06197 1.0007 0.17176 0.3405 0.11421 0.6618 0.27984 0.9531 0.49124l0.6569-1.3157c-0.3275-0.26352-0.7052-0.45643-1.1096-0.56681-0.4756-0.13904-0.9685-0.20845-1.4637-0.20612-0.5433-0.01338-1.0841 0.07875-1.593 0.27139-0.4183 0.15642-0.7841 0.42916-1.0552 0.78667-0.2486 0.34227-0.3789 0.75744-0.371 1.1817-0.0169 0.38787 0.1038 0.76911 0.3404 1.0752 0.2196 0.26762 0.4966 0.48139 0.8101 0.62519 0.3858 0.1675 0.7828 0.3076 1.1879 0.4191 0.3461 0.0942 0.6824 0.2219 1.0042 0.3813 0.0939 0.0401 0.1742 0.107 0.231 0.1924s0.0877 0.1857 0.0889 0.2886c0 0.3813-0.3846 0.5737-1.1471 0.5737-0.8097 0.0051-1.6038-0.225-2.2874-0.663l-0.6807 1.3156zm12.06 0.6837-0.5106-1.4566h-3.1111l-0.725 1.4566h-1.8756l3.8056-7.0492h1.4739l2.706 7.0492h-1.7632zm-2.9137-2.8513h1.9164l-0.7965-2.2466-1.1199 2.2466zm10.487 0.821c-0.0559-0.2098-0.1532-0.406-0.2859-0.5771l-0.0068 0.0069c-0.1155-0.1417-0.2692-0.2467-0.4425-0.3023 1.087-0.2611 1.6305-0.96418 1.6305-2.1093 0.0109-0.27707-0.039-0.55315-0.1461-0.8085-0.1071-0.25536-0.2688-0.48368-0.4735-0.66866-0.4804-0.38964-1.0864-0.58658-1.7019-0.55307h-3.4039l-0.5412 7.0491h1.8143l0.2076-2.7482h0.6808c0.3778 0 0.6025 0.1306 0.6808 0.3951l0.7284 2.3463h1.9402l-0.6808-2.0303zm-1.079-2.2982c-0.2105 0.15192-0.4669 0.22482-0.725 0.20612h-1.4705l0.1157-1.515h1.4637c0.233-0.0206 0.4657 0.04268 0.657 0.17864 0.0723 0.07001 0.1284 0.15526 0.1643 0.24968s0.0506 0.19566 0.0433 0.29652c6e-3 0.11009-0.0133 0.2201-0.0564 0.32141s-0.1088 0.19119-0.1921 0.26258zm8.1046-1.2951h-3.1793l-0.1089 1.326h2.992l-0.1259 1.4256h-2.9716l-0.1191 1.4462h3.1792l-0.1078 1.4109-8e-3 0.0148h-4.9662l0.548-7.0492h4.9867l-0.1191 1.4256zm-0.4494 5.6235h0.0068l0.0012-0.0148 3.8043-7.0344h1.4637l2.7231 7.0492h-1.7734l-0.5106-1.4566h-3.1111l-0.7319 1.4566h-1.8721zm5.2249-2.8513h-1.9129l1.1198-2.2466 0.7931 2.2466z" clip-rule="evenodd" fill="#8C8C8C" fill-rule="evenodd"/>
                  </g>
                  <defs>
                  <clipPath id="a">
                  <rect transform="translate(.5)" width="106" height="20" fill="#fff"/>
                  </clipPath>
                  </defs>
                </svg>
              </a>
              <a href="https://kick.com/" target="_blank" rel="noreferrer">
                <svg fill="none" viewBox="0 0 55 18" xmlns="http://www.w3.org/2000/svg" className={styles.kick}>
                  <g clip-path="url(#a)">
                  <path d="m0.5 0h5.7857v4h1.9285v-2h1.9286v-2h5.7857v6h-1.9286v2h-1.9286v2h1.9286v2h1.9286v6h-5.7857v-2h-1.9286v-2h-1.9285v4h-5.7857v-18zm38.571 0h5.7857v4h1.9286v-2h1.9286v-2h5.7857v6h-1.9286v2h-1.9285v2h1.9285v2h1.9286v6h-5.7857v-2h-1.9286v-2h-1.9286v4h-5.7857v-18zm-21.214 0h5.7858v18h-5.7858v-18zm13.5 0h-3.8571v2h-1.9286v14h1.9286v2h9.6429v-6h-5.7858v-6h5.7858v-6h-5.7858z" clip-rule="evenodd" fill="#8C8C8C" fill-rule="evenodd"/>
                  </g>
                  <defs>
                  <clipPath id="a">
                  <rect transform="translate(.5)" width="54" height="18" fill="#fff"/>
                  </clipPath>
                  </defs>
                </svg>
              </a>
            </Space>
          </>
        )
      }
      </div>
    </Layout.Sider>
  );
}

export default Sider