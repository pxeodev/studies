import axios from 'axios'
import classnames from 'classnames';
import * as rax from 'retry-axios'
import * as AxiosLogger from 'axios-logger'
import groupBy from 'lodash/groupBy'
import isFinite from 'lodash/isFinite'
import subDays from 'date-fns/subDays'
import { useState, useCallback, useEffect, useRef } from 'react'
import { subHours } from 'date-fns'
import { Typography, Card, Row, Col, Input, Button, Select, Table, Tag } from 'antd'

import supertrend from '../utils/supertrend'
import isSameUTCDay from '../utils/isSameUTCDay'
import styles from '../styles/index.module.css'

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const quoteSymbols = ['usd', 'eth', 'btc']
const days = 30
const excludedSymbols = ['usdt', 'dai', 'ust', 'weth', 'wbtc', 'usdc', 'busd', 'ceth', 'steth', 'cdai', 'cusdc', 'tusd', 'hbtc', 'renbtc', 'seth', 'xsushi', 'cvxcrv', 'husd', 'usdp', 'cusdt', 'lusd', 'usdn', 'sbtc', 'vai', 'xsgd', 'rsr', 'fei', 'frax', 'tribe', 'gusd', 'usdx', 'eurt', 'tryb', 'itl', 'usds', 'xchf', 'xaur', 'eosdt', 'dgx', 'bitcny', 'idrt', 'ousd', 'usdk', 'rsv', 'musd', 'qc', 'dgd', 'eurs', 'susd']
const excludedTokens = ['thorchain-erc20']
const signals = {
  all: 'All',
  buy: 'Buy',
  sell: 'Sell',
  hodl: 'HODL'
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
  const coinMarketsPage3 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=3')
  const coinMarketsPage4 = await coinGeckoAPI.get('/coins/markets?vs_currency=usd&per_page=250&page=4')
  let coinsMarketData = [...coinMarketsPage1.data, ...coinMarketsPage2.data, ...coinMarketsPage3.data, ...coinMarketsPage4.data]
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedSymbols.includes(coinMarket.symbol))
  coinsMarketData = coinsMarketData.filter(coinMarket => !excludedTokens.includes(coinMarket.id))
  coinsMarketData = coinsMarketData.map((data) => ({...data, symbol: data.symbol.toLowerCase()}))
  if (process.env.NODE_ENV == "development") {
    coinsMarketData = coinsMarketData.slice(0, 3)
  }

  const cryptowatchMarketsResponse = await cryptowatchAPI.get('/markets')
  let cryptowatchMarkets = cryptowatchMarketsResponse.data.result
  cryptowatchMarkets = cryptowatchMarkets.filter(market => market.active)

  let coinsData = []
  let after = subDays(new Date(), days)
  after = Math.round(after.valueOf() / 1000)
  // We have to potentially try to get OHLC data from all of these markets, since some of them might only recently have listed a pair
  let marketPriority = ['binance', 'bitfinex', 'huobi', 'ftx']
  marketPriority.reverse()

  for (let coinMarketData of coinsMarketData) {
    const ohlcPerQuoteSymbolEndpoints = quoteSymbols.map((quoteSymbol) => {
      if(coinMarketData.symbol === quoteSymbol) {
        return []
      }

      let matchingMarkets = cryptowatchMarkets.filter((market) => {
        const realQuoteSymbol = quoteSymbol === 'usd' ? 'usdt' : quoteSymbol
        if (market.pair === `${coinMarketData.symbol}${realQuoteSymbol}`) {
          market.inverse = false
          return true
        } else if (market.pair === `${realQuoteSymbol}${coinMarketData.symbol}`) {
          market.inverse = true
          return true
        } else {
          return false
      }
      })

      matchingMarkets = matchingMarkets.sort((a, b) => marketPriority.indexOf(b.exchange) - marketPriority.indexOf(a.exchange))

      const endPoints = matchingMarkets.map((market) => {
        return {
          inverse: market.inverse,
          route: `https://api.cryptowat.ch/markets/${market.exchange}/${market.pair}/ohlc?periods=86400&after=${after}`
        }
      })

      endPoints.push({
        coinGecko: true,
        route: `https://api.coingecko.com/api/v3/coins/${coinMarketData.id}/ohlc?vs_currency=${quoteSymbol}&days=${days}`
      })

      return endPoints
    })
    let ohlcs = []
    const today = new Date()
    for (let ohlcEndPoints of ohlcPerQuoteSymbolEndpoints) {
      if (!ohlcEndPoints.length) {
        ohlcs.push([])
        continue
      }
      for (let { route, inverse, coinGecko } of ohlcEndPoints) {
      if (coinGecko) {
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
          // Sometimes cryptowatch can't give us all the OHLC data, because a coin just recently got listed on an exchange
          if (ohlcData.length < days) {
            continue
        }
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
          break
        }
      }
    }
    coinsData.push({
      symbol: coinMarketData.symbol,
      name: coinMarketData.name,
      thumb: coinMarketData.image,
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
  const defaultMarketCapMin = coinsData[coinsData.length - 1].marketCap
  const defaultMarketCapMax = coinsData[0].marketCap
  const defaultTrendType = signals.all

  const [marketCapMin, setMarketCapMin] = useState(defaultMarketCapMin)
  const [marketCapMax, setMarketCapMax] = useState(defaultMarketCapMax)
  const [trendLengthMin, setTrendLengthMin] = useState('')
  const [trendLengthMax, setTrendLengthMax] = useState('')
  const [trendType, setTrendType] = useState(defaultTrendType)
  const [coinNameFilter, setCoinNameFilter] = useState('')
  const [atrPeriods, setAtrPeriods] = useState(5)
  const [multiplier, setMultiplier] = useState(1.5)

  const inputRef = useRef(null)
  useEffect(() => {
    inputRef.current.input?.focus();
  }, [])

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
  const setValidTrendLengthMin = useCallback((e) => {
    let newTrendLengthMin = e.target.value
    if (newTrendLengthMin === '') {
      setTrendLengthMin('')
    }
    newTrendLengthMin = parseInt(newTrendLengthMin)
    if (isFinite(newTrendLengthMin)) {
      setTrendLengthMin(newTrendLengthMin)
    }
  }, [])
  const setValidTrendLengthMax = useCallback((e) => {
    let newTrendLengthMax = e.target.value
    if (newTrendLengthMax === '') {
      setTrendLengthMax('')
    }
    newTrendLengthMax = parseInt(newTrendLengthMax)
    if (isFinite(newTrendLengthMax)) {
      setTrendLengthMax(newTrendLengthMax)
    }
  }, [])
  const setValidMarketCapMin = useCallback((e) => {
    let newMarketCapMin = e.target.value
    if (newMarketCapMin === '') {
      setMarketCapMin(defaultMarketCapMin)
    }
    newMarketCapMin = parseInt(newMarketCapMin)
    if (isFinite(newMarketCapMin)) {
      setMarketCapMin(newMarketCapMin)
    }
  }, [defaultMarketCapMin])
  const setValidMarketCapMax = useCallback((e) => {
    let newMarketCapMax = e.target.value
    if (newMarketCapMax === '') {
      setMarketCapMax(defaultMarketCapMax)
    }
    newMarketCapMax = parseInt(newMarketCapMax)
    if (isFinite(newMarketCapMax)) {
      setMarketCapMax(newMarketCapMax)
    }
  }, [defaultMarketCapMax])

  let displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    const matchesNameFilter = coinNameFilter === '' ||
      coinData.name.toLowerCase().includes(coinNameFilter.toLowerCase()) ||
      coinData.symbol.toLowerCase().includes(coinNameFilter.toLowerCase())
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesNameFilter
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
      superSupertrend = superTrends[0] === superTrends[1] ? superTrends[0] : signals.hodl
    } else if (superTrends.every(tr => tr === signals.buy)) {
      superSupertrend = signals.buy
    } else if (superTrends.every(tr => tr === signals.sell)) {
      superSupertrend = signals.sell
    } else {
      superSupertrend = signals.hodl
    }

    return {
      ...coinData,
      trends,
      symbol: coinData.symbol,
      thumb: coinData.thumb,
      name: coinData.name,
      marketCap: coinData.marketCap,
      superSupertrend,
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
  displayedCoinData = displayedCoinData.filter((coinData) => {
    if (trendType === signals.all) {
      return true
    } else if (trendType === signals.buy) {
      return coinData.superSupertrend === signals.buy
    } else if (trendType === signals.sell) {
      return coinData.superSupertrend === signals.sell
    }
  })

  const tableData = displayedCoinData.map((coinData) => {
    const data = {
      coinData: {
        symbol: coinData.symbol,
        thumb: coinData.thumb,
        name: coinData.name
      },
      marketCap: coinData.marketCap,
      superSupertrend: coinData.superSupertrend,
    }

    coinData.trends.forEach((trend, i) => {
      if (trend[0] === '') {
        data[quoteSymbols[i]] = '-'
      } else {
        data[quoteSymbols[i]] = `${trend[0]} (${trend[1]})`
      }
    })

    return data
  })

  const setPredefinedMarketCap1 = useCallback(() => {
    setMarketCapMin(0)
    setMarketCapMax(100000000)
  }, [])
  const setPredefinedMarketCap2 = useCallback(() => {
    setMarketCapMin(100000000)
    setMarketCapMax(1000000000)
  }, [])
  const setPredefinedMarketCap3 = useCallback(() => {
    setMarketCapMin(1000000000)
    setMarketCapMax(10000000000)
  }, [])
  const setPredefinedMarketCap4 = useCallback(() => {
    setMarketCapMin(10000000000)
    setMarketCapMax(coinsData[0].marketCap)
  }, [coinsData])

  const setPredefinedTrendLength1 = useCallback(() => {
    setTrendLengthMin(1)
    setTrendLengthMax(5)
  }, [])
  const setPredefinedTrendLength2 = useCallback(() => {
    setTrendLengthMin(5)
    setTrendLengthMax(10)
  }, [])
  const setPredefinedTrendLength3 = useCallback(() => {
    setTrendLengthMin(10)
    setTrendLengthMax(20)
  }, [])
  const setPredefinedTrendLength4 = useCallback(() => {
    setTrendLengthMin(20)
    setTrendLengthMax('')
  }, [])

  const columns = [
    {
      title: 'Coin',
      dataIndex: 'coinData',
      render: (coinData) => {
        const imageSrc = coinData.thumb.replace('/large/', '/thumb/')
        return (
          <span className={styles.tableCoinWrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt={coinData.name} className={styles.tableCoinThumb} />
            <span className={styles.tableCoinName}>{coinData.name}</span>
            <span className={styles.tableCoinSymbol}>{coinData.symbol}</span>
          </span>
        )
      }
    },
    {
      title: 'Signal',
      dataIndex: 'superSupertrend',
      align: 'center',
      width: 72,
      render: (superSupertrend) => {
        switch (superSupertrend) {
          case signals.buy:
            return <Tag className={styles.tableTag} color="#52C41A">Buy</Tag>
          case signals.sell:
            return <Tag className={styles.tableTag} color="#F5222D">Sell</Tag>
          default:
            return <Tag className={styles.tableTag} color="#2F54EB">HODL</Tag>
        }
      }
    },
    {
      title: 'USD',
      dataIndex: 'usd',
    },
    {
      title: 'ETH',
      dataIndex: 'eth',
    },
    {
      title: 'BTC',
      dataIndex: 'btc',
    },
  ];

  return <>
    <Title className={styles.title}>Rotate. Your. Dinero. Amigo.</Title>
    <Paragraph className={styles.subTitle} type="secondary">Use the SuperTrend to find promising coins. Swap your portfolio to be in a constant bull market.</Paragraph>
    {/* <Button className={styles.marketHealth} type="primary">Market Health</Button> */}
    <Row className={styles.formRow}>
      <Col span={6}>
        <Card className={styles.formCard}>
          <div className={styles.formLabel}>Coin</div>
          <Input ref={inputRef} placeholder="Bitcoin, ETH, Polygon..." allowClear onChange={(e) => setCoinNameFilter(e.target.value)} size="large"></Input>
        </Card>
      </Col>
      <Col span={3}><Card className={classnames(styles.formCard, styles.noFormBorderRight, styles.noFormBorderLeft, styles.parameterCard)}>
        <div className={styles.formLabel}>ATR periods</div>
        <Input size="large" onChange={setValidAtrPeriods} value={atrPeriods}></Input>
      </Card></Col>
      <Col span={3}><Card className={classnames(styles.formCard, styles.noFormBorderLeft, styles.parameterCard)}>
        <div className={styles.formLabel}>Multiplier</div>
        <Input size="large" onChange={setValidMulitiplier} value={multiplier}></Input>
      </Card></Col>
      <Col span={12}><Card className={styles.formCard}>
        <div className={styles.formLabel}>Market Cap</div>
        <Input className={styles.formRangeInput} size="large" onChange={setValidMarketCapMin} value={marketCapMin} placeholder="$1"></Input>
        <Text type="secondary" className={styles.formRangeLabel}>TO</Text>
        <Input className={styles.formRangeInput} size="large" onChange={setValidMarketCapMax} value={marketCapMax} placeholder="$100,000"></Input>
        <Button size="large" className={styles.formButton} onClick={setPredefinedMarketCap1}>$0-$100M</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedMarketCap2}>$100M-$1B</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedMarketCap3}>$1B-$10B</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedMarketCap4}>$10B+</Button>
      </Card></Col>
    </Row>
    <Row className={classnames(styles.formRow, styles.signalRow)}>
      <Col span={6}><Card className={classnames(styles.formCard, styles.noFormBorderTop, styles.noFormBorderRight)}>
        <div className={styles.formLabel}>Signal</div>
        <Select size="large" value={trendType} onChange={setTrendType} className={styles.formSelect}>
          <Option value={signals.all}>All</Option>
          <Option value={signals.buy}>Buy</Option>
          <Option value={signals.sell}>Sell</Option>
        </Select>
      </Card></Col>
      <Col span={18}><Card className={classnames(styles.formCard, styles.noFormBorderTop, styles.noFormBorderLeft)}>
        <div className={styles.formLabel}>Signal Streak</div>
        <Input className={styles.formRangeInput} size="large" onChange={setValidTrendLengthMin} value={trendLengthMin} placeholder="1"></Input>
        <Text type="secondary" className={styles.formRangeLabel}>TO</Text>
        <Input className={styles.formRangeInput} size="large" onChange={setValidTrendLengthMax} value={trendLengthMax} placeholder="50"></Input>
        <Button size="large" className={styles.formButton} onClick={setPredefinedTrendLength1}>1-5</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedTrendLength2}>5-10</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedTrendLength3}>10-20</Button>
        <Button size="large" className={styles.formButton} onClick={setPredefinedTrendLength4}>20+</Button>
      </Card></Col>
    </Row>
    <Row className={styles.tableRow}>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{ position: ['none', 'none'], pageSize: 1000 }}
        bordered
        className={styles.coinsTable}
      />
    </Row>
  </>
}
