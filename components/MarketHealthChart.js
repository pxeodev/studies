import { Bar } from '@ant-design/plots';

import variableStyles from '../styles/variables.module.less'
import { signals } from '../utils/variables'

const MarketHealthChart = ({ coinsData, screens, darkMode }) => {
  const amountUpTrends = coinsData.filter(coin => coin.dailySuperSuperTrend === signals.buy).length
  const amountHodlTrends = coinsData.filter(coin => coin.dailySuperSuperTrend === signals.hodl).length
  const amountDownTrends = coinsData.filter(coin => coin.dailySuperSuperTrend === signals.sell).length

  const totalUpAndDownTrends = amountUpTrends + amountHodlTrends + amountDownTrends
  const bearExtremeMax = totalUpAndDownTrends * 0.2
  const bullExtremeMin = totalUpAndDownTrends * 0.8

  return (
    <Bar
      data={
        [
          {
            trend: signals.buy,
            amount: amountUpTrends
          },
          {
            trend: signals.hodl,
            amount: amountHodlTrends
          },
          {
            trend: signals.sell,
            amount: amountDownTrends
          },
        ]
      }
      autoFit={false}
      height={200}
      width={screens.lg ? 700 : 327}
      xField="amount"
      yField="trend"
      label={(
        {
          position: "left",
          style: {
            fill: '#ffffff',
            fontWeight: 'bold'
          }
        }
      )}
      xAxis={({
        label: {
          style: {
            fill: darkMode ? 'white' : variableStyles.crGray4
          }
        },
        line: {
          style: {
            stroke: darkMode ? variableStyles.crGray4 : '#fafafa',
          }
        },
        grid: {
          line: {
            style: {
              stroke: darkMode ? variableStyles.crGray4 : variableStyles.crGray9,
            }
          }
        },
        tickLine: {
          length: 5,
          style: {
            stroke: variableStyles.crGray7,
          }
        },
        max: totalUpAndDownTrends
      })}
      yAxis={({
        label: {
          style: {
            fill:  darkMode ? 'white' : variableStyles.crGray4
          }
        },
        line: {
          style: {
            stroke: darkMode ? variableStyles.crGray4 : variableStyles.crGray9,
          }
        },
        tickLine: null
      })}
      interactions={[{ type: 'tooltip', enable: false }]}
      color={( {trend} ) => {
        switch (trend) {
          case signals.buy:
            return darkMode ? variableStyles.darkSuccessColor : variableStyles.lightSuccessColor;
          case signals.hodl:
            return darkMode ? variableStyles.darkPrimaryColor : variableStyles.lightPrimaryColor;
          case signals.sell:
            return darkMode ? variableStyles.darkErrorColor : variableStyles.lightErrorColor;
        }
      }}
      annotations={[
        {
          type: 'region',
          start: ['min', 0],
          end: ['max', bearExtremeMax],
          style: {
            fill: '#ffeeec',
            fillOpacity: 1,
            opacity: 1
          }
        },
        {
          type: 'region',
          start: ['min', bullExtremeMin],
          end: ['max', totalUpAndDownTrends],
          style: {
            fill: '#ffeeec',
            fillOpacity: 1,
            opacity: 1
          }
        }
      ]}
    />
  )
}

export default MarketHealthChart