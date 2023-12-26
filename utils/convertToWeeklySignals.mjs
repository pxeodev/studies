import groupBy from 'lodash/groupBy.js';
import getWeek from 'date-fns/getWeek/index.js';
import max from 'date-fns/max/index.js';

export default function convertToWeeklySignals(ohlcs, returnWeek = false) {
  let weeklyOhcls = groupBy(ohlcs, (ohlc) => getWeek(ohlc[4], { weekStartsOn: 1 }))
  weeklyOhcls = Object.values(weeklyOhcls)
  weeklyOhcls = weeklyOhcls.filter(ohlc => ohlc.length === 7);
  weeklyOhcls = weeklyOhcls.map((weeklyOhlcData) => {
    const weekOpen = weeklyOhlcData[0][0]
    const weekHigh = Math.max(...weeklyOhlcData.map(ohlc => ohlc[1]))
    const weekLow = Math.min(...weeklyOhlcData.map(ohlc => ohlc[2]))
    const weekClose = weeklyOhlcData[weeklyOhlcData.length - 1][3]

    const weekOhlc = [weekOpen, weekHigh, weekLow, weekClose]

    if (returnWeek) {
      const weekEnd = max(weeklyOhlcData.map(ohlc => ohlc[4]))
      weekOhlc.push(weekEnd)
    }

    return weekOhlc
  })
  return weeklyOhcls;
}