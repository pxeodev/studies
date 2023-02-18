import Link from 'next/link'
import { Layout, Typography, Row, Col, Space, Divider } from 'antd'

import Logo from './Logo'
import useBreakPoint from '../hooks/useBreakPoint'

import footerStyles from '../styles/footer.module.less'

const Footer = ({ topCoins, topCategories }) => {
  const { Footer: AntFooter } = Layout;
  const { Text, Paragraph, Link: LinkText } = Typography;

  const logo = <>
    <Logo className={footerStyles.logo} />
    <Paragraph type="secondary" className={footerStyles.paragraph}>
      This crypto coin screener is for informational purposes only. Users should not consider anything here as investment or financial advice. NFA.
    </Paragraph>
  </>

  const verticalDivider = <Divider type="vertical" className={footerStyles.verticalDivider} />
  const horizontalDivider = <Divider className={footerStyles.horizontalDivider} />

  const topCoinsBlock = <>
    <Space direction="vertical" size={12}>
      <Text type="secondary" strong>Top Coins</Text>
      {topCoins.map(coin =>
      (
        <Link href={`/coin/${coin.id}`} key={coin.id} passHref legacyBehavior>
          <LinkText>
            {coin.name}
          </LinkText>
        </Link>
      )
      )}
    </Space>
  </>

  const topCategoriesBlock = <>
    <Space direction="vertical" size={12}>
      <Text type="secondary" strong>Top Categories</Text>
      {topCategories.map(category =>
      (
        <Link href={`/?category=${category}`} key={category} passHref legacyBehavior>
          <LinkText>
            {category}
          </LinkText>
        </Link>
      )
      )}
    </Space>
  </>

  const quickLinksBlock = <>
    <Space direction="vertical" size={12}>
      <Text type="secondary" strong>Quick Links</Text>
      <Link href="/faq">
        FAQ
      </Link>
      <Link href="/terms">
        Terms &amp; Conditions
      </Link>
      <Link href="https://youtu.be/OcyZcip24pM" target="_blank">
        CoinRotator Basic Tutorial
      </Link>
    </Space>
  </>

  const socialMediaBlock = <>
    <Space direction="vertical" size={12} className={footerStyles.socials}>
      <Text type="secondary" strong>Social Media</Text>
      <Space size={12}>
        <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/discord.svg" alt="Discord Logo" width={24} height={19} />
        </a>
        <a href="https://twitter.com/coinrotatorapp" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/twitter.svg" alt="Twitter Logo" width={24} height={20} />
        </a>
        <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5374 11.8277C13.5374 15.5984 10.5069 18.6552 6.76884 18.6552C3.03073 18.6552 0 15.5977 0 11.8277C0 8.05767 3.0305 5 6.76884 5C10.5072 5 13.5374 8.05698 13.5374 11.8277Z" className={footerStyles.mediumIcon}/>
            <path d="M20.9628 11.8277C20.9628 15.377 19.4476 18.2555 17.5784 18.2555C15.7092 18.2555 14.194 15.377 14.194 11.8277C14.194 8.2784 15.709 5.39996 17.5782 5.39996C19.4473 5.39996 20.9626 8.27748 20.9626 11.8277" className={footerStyles.mediumIcon}/>
            <path d="M24 11.8277C24 15.007 23.4671 17.586 22.8096 17.586C22.1522 17.586 21.6196 15.0077 21.6196 11.8277C21.6196 8.6477 22.1524 6.06946 22.8096 6.06946C23.4669 6.06946 24 8.64747 24 11.8277Z" className={footerStyles.mediumIcon}/>
          </svg>
        </a>
        <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/telegram.svg" alt="Telegram Logo" width={24} height={24} />
        </a>
      </Space>
    </Space>
  </>

  const screens = useBreakPoint();

  let grid;

  if (screens.xl) {
    grid = (
      <Row gutter={32}>
        <Col span={6}>
          {logo}
        </Col>
        <Col xs>
          {verticalDivider}
        </Col>
        <Col span={4}>
          {topCoinsBlock}
        </Col>
        <Col span={4}>
          {topCategoriesBlock}
        </Col>
        <Col span={4}>
          {quickLinksBlock}
        </Col>
        <Col span={4}>
          {socialMediaBlock}
        </Col>
      </Row>
    )
  } else if (screens.lg) {
    grid = (
      <>
        <Row>
          <Col span={24}>{logo}</Col>
        </Row>
        <Row>
          <Col span={24}>{horizontalDivider}</Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            {topCoinsBlock}
          </Col>
          <Col span={6}>
            {topCategoriesBlock}
          </Col>
          <Col span={6}>
            {quickLinksBlock}
          </Col>
          <Col span={6}>
            {socialMediaBlock}
          </Col>
        </Row>
      </>
    )
  } else if (screens.md) {
    grid = (
      <span>
        <Row>
          <Col span={24}>{logo}</Col>
        </Row>
        <Row>
          <Col span={24}>{horizontalDivider}</Col>
        </Row>
        <Row gutter={10}>
          <Col span={12}>
            {topCoinsBlock}
          </Col>
          <Col span={12}>
            {topCategoriesBlock}
          </Col>
        </Row>
        <Row gutter={10} className={footerStyles.lastRow}>
          <Col span={12}>
            {quickLinksBlock}
          </Col>
          <Col span={12}>
            {socialMediaBlock}
          </Col>
        </Row>
      </span>
    )
  } else {
    grid = (
      <span>
        <Row>
          <Col span={24}>{logo}</Col>
        </Row>
        <Row>
          <Col span={24}>{horizontalDivider}</Col>
        </Row>
        <Row gutter={10}>
          <Col span={12}>
            {topCoinsBlock}
          </Col>
          <Col span={12}>
            {topCategoriesBlock}
          </Col>
        </Row>
        <Row gutter={10}>
          <Col span={24} className={footerStyles.lastRow}>
            {quickLinksBlock}
          </Col>
        </Row>
        <Row gutter={10} className={footerStyles.lastRow}>
          <Col span={24}>
            {socialMediaBlock}
          </Col>
        </Row>
      </span>
    )
  }

  return (
    <AntFooter className={footerStyles.wrapper}>
      <div className={footerStyles.footerPrimary}>
        {grid}
      </div>
      <Typography.Paragraph className={footerStyles.footerSecondary} type="secondary">
        Proudly funded by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </Typography.Paragraph>
    </AntFooter>
  );
}

export default Footer
