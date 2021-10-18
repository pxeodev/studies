import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import axios from 'axios'
import * as rax from 'retry-axios'
import groupBy from 'lodash/groupBy'

import mode from '../utils/mode'
import supertrend from '../utils/supertrend'

const markets = ['usd', 'eth', 'btc']
const days = 30
const atrPeriods = 5
const multiplier = 1.5
const excludedMarkets = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd']
const signals = {
  buy: 'buy',
  sell: 'sell',
  strongBuy: 'strong buy',
  strongSell: 'strong sell',
  tie: 'tie'
}

export async function getStaticProps() {
  const coinGeckoAPI = axios.create({
    baseURL: 'https://api.coingecko.com/api/v3',
    timeout: 30000
  })
  coinGeckoAPI.defaults.raxConfig = {
    instance: coinGeckoAPI
  }
  rax.attach(coinGeckoAPI)

  const coinsMarketResponse = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250')
  let coinsMarketData = coinsMarketResponse.data.filter(coinMarket => !excludedMarkets.includes(coinMarket.symbol))
  if (process.env.NODE_ENV == "development") {
    coinsMarketData = coinsMarketData.slice(0, 3)
  }

  let coinsOHLCs = []
  for (let coinMarketData of coinsMarketData) {
    const ohlcRoutes = markets.map(market => {
      if(market === coinMarketData.symbol) { return '' }

      return `https://api.coingecko.com/api/v3/coins/${coinMarketData.id}/ohlc?vs_currency=${market}&days=${days}`
    })
    let data = []
    for (let route of ohlcRoutes) {
      if (!route) {
        data.push([])
        continue
      }
      console.log(`Requesting ${route}`)
      const response = await coinGeckoAPI.get(route)
      data.push(response.data)
      // In order to not hit the free Coingecko API rate limit of 50 calls/min
      await new Promise((res) => setTimeout(res, 1200))
    }
    coinsOHLCs.push({
      coin: coinMarketData.symbol,
      data,
    })
  }
  return ({
    props: {
      markets,
      coinsOHLCs
    },
    revalidate: 60 * 60 * 24
  })
}

export default function Home({ coinsOHLCs }) {
  return (
    <Container className='mt-5'>
      <Row>
        <Col>
        <Table bordered spellCheck={false}>
          <thead>
            <tr>
              <th className="text-center bg-primary text-white">Coin</th>
              {
                markets.map(market => <th key={`market-${market}`} className="text-center">{market.toUpperCase()}</th>)
              }
            </tr>
          </thead>
          <tbody>
              {
                coinsOHLCs.map((coinOHLC) => {
                  const trends = coinOHLC.data.map((coinOHLCdata) => {
                    // Convert 4 hour chunks into days
                    coinOHLCdata = groupBy(coinOHLCdata, (tohlc) => {
                      const date = new Date(tohlc[0])
                      return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
                    })
                    coinOHLCdata = Object.values(coinOHLCdata)
                    coinOHLCdata = coinOHLCdata.map((dailyOhlcs) => {
                      const dayOpen = dailyOhlcs[0][1]
                      const dayHigh = Math.max(...dailyOhlcs.map(ohlc => ohlc[2]))
                      const dayLow = Math.min(...dailyOhlcs.map(ohlc => ohlc[3]))
                      const dayClose = dailyOhlcs[dailyOhlcs.length - 1][4]

                      return [dayOpen, dayHigh, dayLow, dayClose]
                    })
                    let trend = supertrend(coinOHLCdata, { atrPeriods, multiplier })
                    return trend[trend.length - 1] || ''
                  })

                  let superSupertrend
                  const superTrends = trends.filter(trend => trend.length)
                  if (superTrends.length === 2) {
                    superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : signals.tie
                  } else if (superTrends.every(tr => tr === signals.buy)) {
                    superSupertrend = signals.strongBuy
                  } else if (superTrends.every(tr => tr === signals.sell)) {
                    superSupertrend = signals.strongSell
                  } else {
                    superSupertrend = mode(superTrends)
                  }
                  const classNames = []
                  if (superSupertrend === signals.buy) {
                    classNames.push("bg-info")
                  } else if (superSupertrend === signals.sell) {
                    classNames.push("bg-warning")
                  } else if (superSupertrend === signals.strongBuy) {
                    classNames.push("bg-success")
                  } else if (superSupertrend === signals.strongSell) {
                    classNames.push("bg-danger")
                  }
                  return (
                    <tr key={coinOHLC.coin} className={classNames}>
                      <th className="text-center text-uppercase" scope="row">{coinOHLC.coin}</th>
                      {trends.map((trend, idx) => <td key={markets[idx]} className="text-center">{trend}</td>)}
                    </tr>
                  )
                })
              }
          </tbody>
        </Table>
        </Col>
      </Row>
    </Container>
  )
}
