import Link from 'next/link'
import { Layout, Typography, Row, Col, Space, Divider } from 'antd'

import Logo from './Logo'
import useBreakPoint from '../hooks/useBreakPoint'

import footerStyles from '../styles/footer.module.less'

const Footer = ({ topCoins, topCategories }) => {
  const { Footer: AntFooter } = Layout;
  const { Text, Paragraph, Link: LinkText } = Typography;

  const logo = <>
    <Logo className={footerStyles.logo}/>
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
          <Link href={`/coin/${coin.id}`} key={coin.id} passHref>
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
          <Link href={`/?category=${category}`} key={category} passHref>
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
        <a>FAQ</a>
      </Link>
      <Link href="/terms">
        <a>Terms &amp; Conditions</a>
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
          <img src="/twitter.svg" alt="Twitter Logo" width={24} height={20}/>
        </a>
        <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/medium.svg" alt="Medium Logo" width={24} height={24}/>
        </a>
        <a href="https://t.me/+8DRbgvB2NxE2YmFk" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/telegram.svg" alt="Telegram Logo" width={24} height={24}/>
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
        Proudly funded in part by <a href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </Typography.Paragraph>
    </AntFooter>
  );
}

export default Footer
