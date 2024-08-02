import { Layout, Table } from 'antd';
import io from 'socket.io-client'
import { useState } from 'react'
import { SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs'
import isToday from 'date-fns/isToday/index.js'

import globalData from '../lib/globalData';
import PageHeader from '../components/PageHeader'
import UpTag from '../components/UpTag';
import DownTag from '../components/DownTag';
import HodlTag from '../components/HodlTag';
import sql from '../lib/database.mjs'
import statusStyles from '../styles/status.module.less'

const { Content } = Layout;

export default function Status({ dataSource }) {
  const [data, setData] = useState(dataSource)
  const [isLoading, setIsLoading] = useState(true)
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
    transports: ["websocket", "webtransport"]
  });

  socket.on("connect", () => {
    const index = data.findIndex(source => source.name === 'Websocket')
    data[index].label = 'Connected, but outdated data'
    data[index].status = 1
    setData(data)
    socket.emit('get_trends', { flavor: SUPERTREND_FLAVOR.coinrotator }, (trends) => {
      if (isToday(trends.lastUpdated)) {
        data[index].label = 'Connected & Updated'
        data[index].status = 0
        setData(data)
      }
      setIsLoading(false)
    })
  });

  socket.on("connect_error", () => {
    const index = data.findIndex(source => source.name === 'Websocket')
    data[index].label = 'Not connected'
    data[index].status = 2
    setData(data)
    setIsLoading(false)
  });
  return (
    <>
      <PageHeader title="Status page" />
      <Content>
        <Table
          rowKey="title"
          className={statusStyles.table}
          columns={[
            {
              'title': 'Service name',
              'dataIndex': 'name'
            },
            {
              'title': 'Status',
              'dataIndex': 'status',
              render: (status, source) => {
                if (status === 0) {
                  return <UpTag label={source.label} />
                } else if (status === 1) {
                  return <HodlTag label={source.label} />
                } else {
                  return <DownTag label={source.label} />
                }
              }
            },
          ]}
          dataSource={dataSource}
          pagination={{ position: ['none', 'none'] }}
          loading={isLoading}
          bordered
        />
      </Content>
    </>
  );
}

export async function getServerSideProps() {
  let lastCandle, lastTrend, appData, databaseStatus, databaseLabel
  appData = {
    topCategories: [],
    categories: []
  }
  try {
    appData = await globalData();
    const lastCandle = await sql`SELECT * FROM "Ohlc" ORDER BY "closeTime" DESC LIMIT 1`[0]
    const lastTrend = await sql`SELECT * FROM "SuperTrend" ORDER BY date DESC LIMIT 1`[0]
    if (isToday(lastCandle.closeTime)) {
      if (isToday(lastTrend.date)) {
        databaseLabel = 'Connected & Updated'
        databaseStatus = 0
      } else {
        databaseLabel = 'Connected, but outdated trend data'
        databaseStatus = 1
      }
    } else {
      databaseLabel = 'Connected, but outdated candle data'
      databaseStatus = 1
    }
  } catch(err) {
    if (err.message.includes(`Can't reach database`)) {
      databaseLabel = 'Not connected'
    } else {
      databaseLabel = err.message
    }
    databaseStatus = 2
  }

  const dataSource = [
    {
      name: 'Websocket',
      status: 0,
      label: 'Connected & Updated'
    },
    {
      name: 'Database',
      status: databaseStatus,
      label: databaseLabel
    }
  ]

  return { props: {
    appData,
    dataSource
  } };
}