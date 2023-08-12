import { Line } from '@ant-design/plots';

import variableStyles from '../styles/variables.module.less'
import { signals } from '../utils/variables'

const MarketHealthChart = ({ historicDailySuperSuperTrends, darkMode }) => {
  return (
    <Line
      data={historicDailySuperSuperTrends}
      seriesField={'trend'}
      xField="date"
      yField="amount"
      theme={darkMode ? 'dark' : 'light'}
      legend={{
        position: 'top'
      }}
      tooltip={{
        domStyles: {
          'g2-tooltip': {
            fontFamily: variableStyles.fontFamily,
            color: darkMode ? 'white' : variableStyles.crGray4,
            boxShadow: null,
            opacity: 1,
            border: `1px solid ${darkMode ? variableStyles.crGray4 : variableStyles.crGray9}`
          }
        }
      }}
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
        maxLimit: 1000,
        title: {
          text: 'Trends'
        },
        grid: {
          line: {
            style: {
              stroke: darkMode ? variableStyles.crGray4 : variableStyles.crGray9,
            }
          }
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
          type: 'text',
          position: ['min', 600],
          content: 'Market Extreme 🚨',
          offsetY: -4,
          style: {
            fill:  darkMode ? 'white' : variableStyles.crGray4,
            textBaseline: 'bottom',
            opacity: 0.8
          },
        },
        {
          type: 'line',
          start: ['min', 600],
          end: ['max', 600],
          style: {
            stroke: '#F4664A',
            lineDash: [2, 2],
          }
        }
      ]}
    />
  )
}

export default MarketHealthChart