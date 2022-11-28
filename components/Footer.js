import Link from 'next/link'
import { Layout, Typography, Row, Col, Space, Divider } from 'antd'

import Logo from './Logo'
import useBreakPoint from '../hooks/useBreakPoint'

import footerStyles from '../styles/footer.module.less'

const Footer = () => {
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

  const quickLinksBlock = <>
    <Space direction="vertical" size={12}>
      <Text type="secondary" strong>Quick Links</Text>
      <Link href="/faq">
        <a>FAQ</a>
      </Link>
      <Link href="/terms">
        <a>Terms &amp; Conditions</a>
      </Link>
      <Link href="https://youtu.be/OcyZcip24pM">
        <a target="_blank">CoinRotator Basic Tutorial</a>
      </Link>
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
          {quickLinksBlock}
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
            {quickLinksBlock}
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
        <Row gutter={10} className={footerStyles.lastRow}>
          <Col span={12}>
            {quickLinksBlock}
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
          <Col span={24} className={footerStyles.lastRow}>
            {quickLinksBlock}
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
    </AntFooter>
  );
}

export default Footer
