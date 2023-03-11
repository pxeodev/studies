import clone from 'lodash/clone.js';
import chunk from 'lodash/chunk.js';
import max from 'date-fns/max/index.js';

export default function convertToWeeklySignals(ohlcs, returnWeek = false) {
  let weeklyOhcls = clone(ohlcs).reverse();
  weeklyOhcls = chunk(weeklyOhcls, 7);
  weeklyOhcls = weeklyOhcls.filter(ohlc => ohlc.length === 7);
  weeklyOhcls.reverse()
  weeklyOhcls = weeklyOhcls.map(weeklyOhlcData => weeklyOhlcData.reverse());
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