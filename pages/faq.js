import { Breadcrumb, Typography, Collapse, Layout } from 'antd';
import Link from 'next/link'

import styles from '../styles/faq.module.css'

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { Content } = Layout;

export default function Faq() {
  return (
    <Content className={styles.content}>
      <Breadcrumb className={styles.breadcrumbs}>
        <Breadcrumb.Item><Link href="/">Home</Link></Breadcrumb.Item>
        <Breadcrumb.Item>FAQ</Breadcrumb.Item>
      </Breadcrumb>
      <Title>FAQ</Title>
      <Paragraph type="secondary" className={styles.subTitle}>Find answers to your frequently asked questions here.</Paragraph>
      <Collapse defaultActiveKey={['1']} accordion>
        <Panel header="How do you use CoinRotator?" key="1">
          <p>CoinRotator screens the entire market for the strongest coins to buy. It updates once daily and provides granular data for each coin, so you know how fresh the trend is. CoinRotator is not a stand-alone system, But it is a long-term tool that will always keep you on the right side of the market.</p>
        </Panel>
        <Panel header="Does CoinRotator work in bear markets?" key="2">
          <p>Yes! CoinRotator provides three forms of signals. Buy, HODL, and Sell. When Bitcoin is weak, sell signals are better than buy signals.</p>
        </Panel>
        <Panel header="What is CoinRotator based on?" key="3">
          <p>Primarily on the SuperTrend indicator. CoinRotator&apos;s default settings are faster than the respective indicator found on Tradingview.</p>
        </Panel>
        <Panel header="How accurate are the CoinRotator signals?" key="4">
          <p>They are not designed to be a complete trading system. You&apos;ll need to check the trend health of the overall market before taking any position. Check out the Twitter feed for your chosen coin, and then check Bitcoin. If things look positive (or excessively negative, for that matter), it&apos;s a likely winner.</p>
        </Panel>
        <Panel header="Do you have any backtest data?" key="5">
          <p>Q1 2022.</p>
        </Panel>
        <Panel header="Can we access your API?" key="6">
          <p>Q1 2022</p>
        </Panel>
        <Panel header="Why does my coin say 'Buy', but it's down a lot today?" key="7">
          <p>CoinRotator is still in beta. Small conversions between coins create some curious bugs. We have marked most of these markets, but possibly we missed one. You can always message us if you&apos;re unsure. @CoinRotator</p>
        </Panel>
      </Collapse>
    </Content>);
}