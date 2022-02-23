import Link from 'next/link'
import { Layout, Typography, Row, Col, Space, Divider } from 'antd'

import styles from '../styles/footer.module.less'
import Logo from './Logo'
import useBreakPoint from '../utils/useBreakPoint'

const Footer = ({ topCoins, topCategories }) => {
  const { Footer: AntFooter } = Layout;
  const { Text, Paragraph, Link: LinkText } = Typography;

  const logo = <>
    <Logo className={styles.logo}/>
    <Paragraph type="secondary">
      This website is for informational purposes only, you should not construe any such information or other material as investment or financial advice.
    </Paragraph>
  </>

  const verticalDivider = <Divider type="vertical" className={styles.verticalDivider} />
  const horizontalDivider = <Divider className={styles.horizontalDivider} />

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
    <Space direction="vertical" size={12}>
      <Text type="secondary" strong>Social Media</Text>
      <Space size={12}>
        <a href="https://discord.gg/zfnxHyrhSK" target="_blank" rel="noreferrer" className={styles.socialLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/discord.svg" alt="Discord Logo" className={styles.socialImage}/>
        </a>
        <a href="https://twitter.com/coinrotatorapp" target="_blank" rel="noreferrer" className={styles.socialLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/twitter.svg" alt="Twitter Logo" className={styles.socialImage}/>
        </a>
        <a href="https://coinrotator.medium.com/" target="_blank" rel="noreferrer" className={styles.socialLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/medium.svg" alt="Medium Logo" className={styles.socialImage}/>
        </a>
      </Space>
    </Space>
  </>

  const screens = useBreakPoint();

  let grid;

  if (screens.xl) {
    grid = (
      <Row gutter={30}>
        <Col span={6}>
          {logo}
        </Col>
        <Col span={2}>
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
        <Row gutter={15}>
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
        <Row gutter={10} className={styles.bottomRow}>
          <Col span={12}>
            {quickLinksBlock}
          </Col>
          <Col span={12}>
            {socialMediaBlock}
          </Col>
        </Row>
      </span>
    )
  }

  return (
    <AntFooter className={styles.footer}>
      <div className={styles.mainFooter}>
        {grid}
      </div>
      <Typography.Paragraph className={styles.sponsor} type="secondary">
        Proudly funded in part by <a className={styles.sponsorLink} href="https://gamblersarea.com/" target="_blank" rel="noreferrer">GamblersArea</a>
      </Typography.Paragraph>
    </AntFooter>
  );
}

export default Footer