import { Layout, Typography } from 'antd';
import groupBy from 'lodash/groupBy';

import globalData from '../lib/globalData';
import styles from '../styles/404.module.less';
import getFreshSignals from '../utils/getFreshSignals';

export default function DebugSignals(props) {
  const groupedTrends = groupBy(props.coinsData, 'todaySuperSuperTrend')
  return (
    <Layout.Content className={styles.content}>
      <Typography.Title>
        Debug Fresh Signal
      </Typography.Title>
      {Object.entries(groupedTrends).map(([superSuperTrend, trendData]) => {
        return (
          <>
            <Typography.Title level={2}>{superSuperTrend}</Typography.Title>
            <ul>
            {trendData.map((trend) => {
              return (
                <li key={trend.id}>{trend.name}</li>
              )
            })}
            </ul>
          </>
        )
      })}
    </Layout.Content>
  )
}

export async function getStaticProps() {
  const appData = await globalData();
  let coinsData = await getFreshSignals();
  coinsData = coinsData.map((coinData) => {
    delete coinData.ohlcs
    return coinData
  })

  return { props: {
    appData,
    coinsData
  } };
}