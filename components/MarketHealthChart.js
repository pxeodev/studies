import { Line } from '@ant-design/plots';

import variableStyles from '../styles/variables.module.less'
import { signals } from '../utils/variables'

const MarketHealthChart = ({ historicDailySuperSuperTrends, screens, darkMode }) => {

  // TODO: Add extremes

  return (
    <Line
      data={historicDailySuperSuperTrends}
      autoFit={false}
      height={200}
      width={screens.lg ? 700 : 327}
      seriesField={'trend'}
      xField="date"
      yField="amount"
      xAxis={({
        title: {
          text: 'Last 30 days'
        },
        label: {
          style: {
            fill: darkMode ? 'white' : variableStyles.crGray4,
            fontFamily: variableStyles.fontFamily
          }
        },
        line: {
          style: {
            stroke: darkMode ? variableStyles.crGray4 : variableStyles.crGray9,
          }
        },
        tickLine: {
          length: 5,
          style: {
            stroke: variableStyles.crGray7,
          }
        }
      })}
      yAxis={({
        title: {
          text: 'Trends'
        },
        label: {
          style: {
            fill:  darkMode ? 'white' : variableStyles.crGray4,
            fontFamily: variableStyles.fontFamily
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
      // annotations={[
      //   {
      //     type: 'region',
      //     start: ['start', bullExtremeMin],
      //     end: ['end', totalUpAndDownTrends],
      //     style: {
      //       fill: darkMode ? '#2a1215' : '#fff1f0',
      //       fillOpacity: 1,
      //       opacity: 1
      //     }
      //   }
      // ]}
    />
  )
}

export default MarketHealthChart