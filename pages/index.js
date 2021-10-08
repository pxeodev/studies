import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import axios from 'axios'
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
      try {
        if (route) {
          console.log(`Requesting ${route}`)
          const response = await axios.get(route)
          // REFACTOR: Move this to the FE in order to be able to filter data
          let trend = supertrend(response.data, { atrPeriods, multiplier })
          trends.push(trend[trend.length - 1] || '')
          // In order to not hit the free Coingecko API rate limit of 50 calls/min
          await new Promise((res) => setTimeout(res, 1200))
        } else {
          trends.push('')
        }
      } catch (error) {
        console.error(`Error retrieving history for ${route}`)
        console.error(error.message)
        trends.push(FETCH_ERROR)
      }
    }
    results.push([coin.symbol, ...trends])
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
            </tr>
          </thead>
          <tbody>
              {
                results.map((result) => {
                  return (
                    <tr key={`row-${result[0]}`}>
                      {result.map((res) => {
                        const value = res === FETCH_ERROR ? 'API Error' : res;
                        return (
                          // eslint-disable-next-line react/jsx-key
                          <td className="text-center">{value}</td>
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
