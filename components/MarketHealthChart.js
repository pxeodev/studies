import { Line } from '@ant-design/plots';

import variableStyles from '../styles/variables.module.less'
import { signals } from '../utils/variables'

const MarketHealthChart = ({ historicDailySuperSuperTrends, screens, darkMode }) => {
  return (
    <Line
      data={historicDailySuperSuperTrends}
      autoFit={false}
      height={200}
      width={screens.lg ? 700 : 327}
      seriesField={'trend'}
      xField="date"
      yField="amount"
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