import { Layout, Typography, Button } from 'antd';

import globalData from '../lib/globalData';
import styles from '../styles/404.module.less';

const { Title, Paragraph } = Typography;

export default function Custom404() {
  return (
    <Layout.Content className={styles.content}>
      <img src="/coin.svg" alt="CoinRotator Logo Grayscaled" className={styles.logoGrayscaled} />
      <div className={styles.text}>
        <Title className={styles.title}>Page Not Found</Title>
        <Paragraph className={styles.paragraph}>The page you’re trying to reach doesn’t exist or couldn’t be found.</Paragraph>
      </div>
      <Button type="primary" size="large" href="/">Back to Home</Button>
    </Layout.Content>
  )
}

export async function getStaticProps() {
  const appData = await globalData();

  return { props: { appData } };
}