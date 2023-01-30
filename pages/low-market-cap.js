import { Layout, Card } from 'antd';
import endOfYesterday from 'date-fns/endOfYesterday';
import { useContext } from 'react'
import subDays from 'date-fns/subDays';
import isEqualDate from 'date-fns/isEqual';
import subWeeks from 'date-fns/subWeeks';

import { DarkModeContext } from './_app';
import baseStyles from '../styles/base.module.less'
import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import { signals, defaultAtrPeriods, defaultMultiplier } from '../utils/variables.mjs'
import useBreakPoint from '../hooks/useBreakPoint';
import convertToDailySignals from '../utils/convertToDailySignals';
import getTrends from '../utils/getTrends.mjs'

const { Content } = Layout;

export default function MarketHealth({  }) {
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  return (
    <>
      <PageHeader title="Low market cap coins" />
      <Content className={baseStyles.container}>
        <Card>

        </Card>
      </Content>
    </>
  );
}

export async function getStaticProps() {
  const appData = await globalData();

  return {
    props: {
      appData,
    }
  };
}