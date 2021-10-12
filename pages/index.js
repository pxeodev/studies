import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import axios from 'axios'
import chunk from 'lodash/chunk'

import mode from '../utils/mode'
import supertrend from '../utils/supertrend'

const FETCH_ERROR = 'FETCH_ERROR'

export async function getStaticProps() {
  const markets = ['usd', 'eth', 'btc']
  const days = 30
  const atrPeriods = 5
  const multiplier = 1.5

  const coins = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/coins/markets?vs_currency=usd`)
  let results = []
  for (let coin of coins.data) {
    const ohlcRoutes = markets.map(market => {
      if(market === coin.symbol) { return '' }

      return `${process.env.NEXT_PUBLIC_API_URL}/coins/${coin.id}/ohlc?vs_currency=${market}&days=${days}`
    })
    let trends = []
    for (let route of ohlcRoutes) {
      if (!route) {
        trends.push('')
        continue
      }
      try {
        console.log(`Requesting ${route}`)
        const response = await axios.get(route)

        // Convert 4 hour chunks into days
        let ohlcs = response.data
        ohlcs.reverse()
        ohlcs = chunk(ohlcs, 6)
        // Remove the last chunk if it's not containing a full day
        if (ohlcs[ohlcs.length - 1].length < 6) {
          ohlcs.pop()
        }
        ohlcs = ohlcs.map((dailyOhlcs) => {
          const dayOpen = dailyOhlcs[dailyOhlcs.length - 1][1]
          const dayHigh = Math.max(...dailyOhlcs.map(ohlc => ohlc[2]))
          const dayLow = Math.min(...dailyOhlcs.map(ohlc => ohlc[3]))
          const dayClose = dailyOhlcs[0][4]

          return [dayOpen, dayHigh, dayLow, dayClose]
        })
        ohlcs.reverse()

        // REFACTOR: Move this to the FE in order to be able to filter data
        // REFACTOR: The supertrend should only take the OHLC data as parameters without volume
        // REFACTOR: The supertrend return value should only be binary buy/sell
        let trend = supertrend(ohlcs, { atrPeriods, multiplier })
        trends.push(trend[trend.length - 1] || '')
        // In order to not hit the free Coingecko API rate limit of 50 calls/min
        await new Promise((res) => setTimeout(res, 1200))
      } catch (error) {
        console.error(`Error retrieving history for ${route}`)
        console.error(error.message)
        trends.push(FETCH_ERROR)
      }
    }
    let superSupertrend;
    const superTrends = trends.filter(trend => trend.length)
    if (trends.includes(FETCH_ERROR)) {
      superSupertrend = FETCH_ERROR
    } else if (superTrends.length === 2) {
      superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : 'tie'
    } else {
      superSupertrend = mode(superTrends)
    }
    results.push([coin.symbol, ...trends, superSupertrend])
  }
  return ({
    props: {
      markets,
      results
    },
    revalidate: 60 * 60 * 24
  })
}

export default function Home({ markets, results }) {
  return (
    <Container className='mt-5'>
      <Row>
        <Col>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th className="text-center bg-primary text-white">Coin</th>
              {
                markets.map(market => <th key={`market-${market}`} className="text-center">{market.toUpperCase()}</th>)
              }
              <th className="text-center bg-secondary text-white">Super SuperTrend</th>
            </tr>
          </thead>
          <tbody>
              {
                results.map((result) => {
                  return (
                    <tr key={`row-${result[0]}`}>
                      {result.map((res, idx, arr) => {
                        const value = res === FETCH_ERROR ? 'API Error' : res;
                        const classNames = ["text-center"]
                        if (arr.length - 1 === idx) {
                          if (value === 'buy') {
                            classNames.push("bg-info")
                          } if (value === 'sell') {
                            classNames.push("bg-warning")
                          }
                        }
                        return (
                          // eslint-disable-next-line react/jsx-key
                          <td className={classNames.join(' ')}>{value}</td>
                        );
                      })}
                    </tr>
                  );
                })
              }
          </tbody>
        </Table>
        </Col>
      </Row>
    </Container>
  )
}
