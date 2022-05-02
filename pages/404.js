// TP
import { Layout, Typography, Button } from 'antd';

// Functions
import globalData from '../lib/globalData';

// Styles
import baseStyles from '../styles/base.module.less';
import notFoundStyles from '../styles/404.module.less';

// Code
const { Title, Paragraph } = Typography;

export default function Custom404() {
  return (
    <Layout.Content className={notFoundStyles.container}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coin.svg" alt="CoinRotator Logo Grayscaled" className={notFoundStyles.logoGrayscaled} />
      <div className={notFoundStyles.textWrapper}>
        <Title className={baseStyles.title}>Page Not Found</Title>
        <Paragraph className={notFoundStyles.paragraph}>The page you’re trying to reach doesn’t exist or couldn’t be found.</Paragraph>
      </div>
      <Button type="primary" size="large" href="/">Back to Home</Button>
    </Layout.Content>
  )
}

export async function getStaticProps() {
  const appData = await globalData();

  return { props: { appData } };
}