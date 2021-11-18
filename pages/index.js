import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'
import axios from 'axios'
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import groupBy from 'lodash/groupBy'
import isFinite from 'lodash/isFinite'
import subDays from 'date-fns/subDays'
import { useState, useCallback } from 'react'

import mode from '../utils/mode'
import supertrend from '../utils/supertrend'
import isSameUTCDay from '../utils/isSameUTCDay'
import { subHours } from 'date-fns'

const quoteSymbols = ['usd', 'eth', 'btc']
const days = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'cvxcrv', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd']
const excludedTokens = ['thorchain-erc20']
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
  coinGeckoAPI.interceptors.request.use(AxiosLogger.requestLogger);
  rax.attach(coinGeckoAPI)

  const cryptowatchAPI = axios.create({
    baseURL: 'https://api.cryptowat.ch',
    timeout: 30000,
    headers: { 'X-CW-API-Key': process.env.CRYPTOWATCH_API_KEY }
  })
  cryptowatchAPI.defaults.raxConfig = {
    instance: cryptowatchAPI
  }
  cryptowatchAPI.interceptors.request.use(AxiosLogger.requestLogger);
  rax.attach(cryptowatchAPI)

  const coinMarketsPage1 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250')
  const coinMarketsPage2 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=2')
  let coinsMarketData = [...coinMarketsPage1.data, ...coinMarketsPage2.data]
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedSymbols.includes(coinMarket.symbol))
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedTokens.includes(coinMarket.id))
  coinsMarketData = coinsMarketData.map((data) => ({...data, symbol: data.symbol.toLowerCase()}))
  if (process.env.NODE_ENV == "development") {
    coinsMarketData = coinsMarketData.slice(0, 8)
  }

  const cryptowatchMarketsResponse = await cryptowatchAPI.get('/markets')
  const cryptowatchMarkets = cryptowatchMarketsResponse.data.result

  let coinsData = []
  for (let coinMarketData of coinsMarketData) {
    const ohlcRequests = quoteSymbols.map((quoteSymbol) => {
      if(coinMarketData.symbol === quoteSymbol) {
        return ''
      }

      let inverse = false
      let matchingMarkets = cryptowatchMarkets.filter((market) => market.pair === `${coinMarketData.symbol}${quoteSymbol}` && market.active)
      if (!matchingMarkets.length) {
        inverse = true
        matchingMarkets = cryptowatchMarkets.filter((market) => market.pair === `${quoteSymbol}${coinMarketData.symbol}` && market.active)
      }
      const bestMarket = matchingMarkets.find((market) => market.exchange === 'binance') ||
                         matchingMarkets.find((market) => market.exchange === 'bitfinex') ||
                         matchingMarkets.find((market) => market.exchange === 'huobi') ||
                         matchingMarkets[0]

      if (!bestMarket) {
        return {
          coinGecko: true,
          route: `https://api.coingecko.com/api/v3/coins/${coinMarketData.id}/ohlc?vs_currency=${quoteSymbol}&days=${days}`
        }
      }

      let after = subDays(new Date(), days)
      after = Math.round(after.valueOf() / 1000)

      return {
        route: `https://api.cryptowat.ch/markets/${bestMarket.exchange}/${bestMarket.pair}/ohlc?periods=86400&after=${after}`,
        inverse
      }
    })
    let ohlcs = []
    const today = new Date()
    for (let { route, inverse, coinGecko } of ohlcRequests) {
      if (!route) {
        ohlcs.push([])
        continue
      }

      if (coinGecko) {
        // In order to not hit the free Coingecko API rate limit of 50 calls/min
        await new Promise((res) => setTimeout(res, 1200))
        const response = await coinGeckoAPI.get(route)
        let ohlcData = response.data
        // Remove todays 4 hour signals to avoid repainting of the current day
        ohlcData = ohlcData.filter((tohlc) => {
          const date = new Date(tohlc[0])
          return !isSameUTCDay(date, today)
        })
        ohlcData = groupBy(ohlcData, (tohlc) => {
          const date = new Date(tohlc[0])
          return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
        })
        ohlcData = Object.values(ohlcData)
        ohlcData = ohlcData.map((dailyOhlcs) => {
          const dayOpen = dailyOhlcs[0][1]
          const dayHigh = Math.max(...dailyOhlcs.map(ohlc => ohlc[2]))
          const dayLow = Math.min(...dailyOhlcs.map(ohlc => ohlc[3]))
          const dayClose = dailyOhlcs[dailyOhlcs.length - 1][4]

          return [dayOpen, dayHigh, dayLow, dayClose]
        })
        ohlcs.push(ohlcData)
      } else {
        const response = await cryptowatchAPI.get(route)
        let ohlcData = response.data.result['86400']
        // Don't include data of the current day to avoid repainting
        ohlcData = ohlcData.filter((frame) => {
          let date = new Date(frame[0] * 1000)
          // We have to subtract 1 hour from the date, as it's given in it's midnight format and would be recognized as the next day instead
          date = subHours(date, 1)
          return !isSameUTCDay(date, today)
        })
        ohlcData = ohlcData.map((frame) => [frame[1], frame[2], frame[3], frame[4]])
        if (inverse) {
          ohlcData = ohlcData.map((frame) => [1 / frame[0], 1 / frame[1], 1 / frame[2], 1 / frame[3]])
        }
        ohlcs.push(ohlcData)
      }
    }
    coinsData.push({
      symbol: coinMarketData.symbol,
      ohlcs,
      marketCap: coinMarketData.market_cap
    })
  }
  return {
    props: {
      coinsData
    }
  }
}

export default function Home({ coinsData }) {
  const [marketCapMin, setMarketCapMin] = useState(coinsData[coinsData.length - 1].marketCap)
  const [marketCapMax, setMarketCapMax] = useState(coinsData[0].marketCap)
  const [trendLengthMin, setTrendLengthMin] = useState('')
  const [trendLengthMax, setTrendLengthMax] = useState('')
  const [coinNameFilter, setCoinNameFilter] = useState('')
  const [atrPeriods, setAtrPeriods] = useState(5)
  const [multiplier, setMultiplier] = useState(1.5)
  const setValidAtrPeriods = useCallback((e) => {
    const newAtrPeriod = parseInt(e.target.value)
    if (isFinite(newAtrPeriod)) {
      setAtrPeriods(newAtrPeriod)
    }
  }, [])
  const setValidMulitiplier = useCallback((e) => {
    const newMultiplier = parseFloat(e.target.value)
    if (isFinite(newMultiplier)) {
      setMultiplier(newMultiplier)
    }
  }, [])

  let displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           coinData.symbol.toLowerCase().includes(coinNameFilter.toLowerCase())
  })
  displayedCoinData = displayedCoinData.map((coinData) => {
    const trends = coinData.ohlcs.map((ohcls) => {
      const trends = supertrend(ohcls, { atrPeriods, multiplier })
      const lastTrend = trends[trends.length - 1] || ''
      let trendLength = 0
      for (let i = trends.length - 1; i > 0; i--) {
        if (lastTrend === trends[i]) {
          trendLength++
        } else {
          break
        }
      }
      return [lastTrend, trendLength]
    })
    let superSupertrend
    const superTrends = trends.map(trend => trend[0]).filter(trend => trend.length)
    if (superTrends.length === 2) {
      superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : signals.tie
    } else if (superTrends.every(tr => tr === signals.buy)) {
      superSupertrend = signals.strongBuy
    } else if (superTrends.every(tr => tr === signals.sell)) {
      superSupertrend = signals.strongSell
    } else {
      superSupertrend = mode(superTrends)
    }

    return {
      ...coinData,
      trends,
      superSupertrend
    }
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    let min = parseInt(trendLengthMin)
    min = isFinite(min) ? min : 0
    let max = parseInt(trendLengthMax)
    max = isFinite(max) ? max : Number.POSITIVE_INFINITY

    const trends = coinData.trends.filter(trend => trend[0].length)
    if (trends.length === 0) {
      return false;
    }

    return trends
      .map(trend => trend[1])
      .every(trendLength => trendLength >= min && trendLength <= max)
  })

  return (
    <Form>
      <Container className='mt-5'>
        <Row>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Min Market cap</Form.Label>
            <Form.Control type="number" value={marketCapMin} onChange={(e) => setMarketCapMin(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>Max Market cap</Form.Label>
            <Form.Control type="number" value={marketCapMax} onChange={(e) => setMarketCapMax(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Min signal streak</Form.Label>
            <Form.Control type="number" value={trendLengthMin} onChange={(e) => setTrendLengthMin(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>Max signal streak</Form.Label>
            <Form.Control type="number" value={trendLengthMax} onChange={(e) => setTrendLengthMax(e.target.value)}/>
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>ATR periods</Form.Label>
            <Form.Control
              type="number"
              required={true}
              value={atrPeriods}
              min="1"
              onChange={(e) => setValidAtrPeriods(e)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>Multiplier</Form.Label>
            <Form.Control
              type="number"
              required={true}
              step=".01"
              min=".01"
              value={multiplier}
              onChange={(e) => setValidMulitiplier(e)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
            <Form.Label>Search for a coin name</Form.Label>
            <Form.Control
              type="search"
              value={coinNameFilter}
              onChange={(e) => setCoinNameFilter(e.target.value)}
            />
          </Form.Group>
          <Col>
          <Table bordered spellCheck={false}>
            <thead>
              <tr>
                <th className="text-center bg-primary text-white">Coin</th>
                {
                  quoteSymbols.map(quoteSymbol => <th key={`quote-${quoteSymbol}`} className="text-center">{quoteSymbol.toUpperCase()}</th>)
                }
              </tr>
            </thead>
            <tbody>
                {
                  displayedCoinData.map((coinData) => {
                    const classNames = []
                    if (coinData.superSupertrend === signals.buy) {
                      classNames.push("bg-info")
                    } else if (coinData.superSupertrend === signals.sell) {
                      classNames.push("bg-warning")
                    } else if (coinData.superSupertrend === signals.strongBuy) {
                      classNames.push("bg-success")
                    } else if (coinData.superSupertrend === signals.strongSell) {
                      classNames.push("bg-danger")
                    }
                    return (
                      <tr key={coinData.symbol} className={classNames}>
                        <th className="text-center text-uppercase" scope="row">{coinData.symbol}</th>
                        {coinData.trends.map((trend, idx) =>
                          <td key={quoteSymbols[idx]} className="text-center">
                            {trend[0] && `${trend[0]} (${trend[1]})`}
                          </td>
                        )}
                      </tr>
                    )
                  })
                }
            </tbody>
          </Table>
          </Col>
        </Row>
      </Container>
    </Form>
  )
}
