import { signals } from './variables'

// Input:
// {
//   eth: 'UP',
//   btc: 'UP',
//   usd: 'DOWN'
// }
const supersupertrend = (trends) => {
  let superSupertrend
  const superTrends = Object.values(trends).filter(trend => trend.length)
  if (superTrends.length === 2) {
    superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : signals.hodl
  } else if (superTrends.every(tr => tr === signals.buy)) {
    superSupertrend = signals.buy
  } else if (superTrends.every(tr => tr === signals.sell)) {
    superSupertrend = signals.sell
  } else {
    superSupertrend = signals.hodl
  }
  return superSupertrend;
}

export default supersupertrend;