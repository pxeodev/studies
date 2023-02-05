import { Typography, Card, Row, Col, Input, Button, Select, Tag, Modal, Divider, Layout, Tooltip, Radio } from 'antd'
import { CloseCircleOutlined, SlidersOutlined, CheckCircleOutlined, QuestionCircleFilled, InfoCircleFilled } from '@ant-design/icons'
import { useRouter } from 'next/router'
import { useMemo, useState, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import debounce from 'lodash/debounce'
import isFinite from 'lodash/isFinite'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import isNil from 'lodash/isNil'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import isEqualDate from 'date-fns/isEqual';
import endOfYesterday from 'date-fns/endOfYesterday';
import subDays from 'date-fns/subDays';
import subWeeks from 'date-fns/subWeeks';
import classnames from 'classnames';

import { DarkModeContext } from './_app';
import HomePageTable from '../components/HomePageTable';
import MarketHealthChart from '../components/MarketHealthChart';
import useBreakPoint from '../hooks/useBreakPoint';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals, defaultAtrPeriods, defaultMultiplier, SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import convertToDailySignals from '../utils/convertToDailySignals';
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import prisma from '../lib/prisma.mjs'
import globalData from '../lib/globalData';
import getTrends from '../utils/getTrends.mjs'

import indexStyles from '../styles/index.module.less'
import baseStyles from '../styles/base.module.less'

const { Title, Paragraph, Text } = Typography;
const { Option, OptGroup } = Select;
const { Content } = Layout;

export async function getStaticProps() {
  const appData = await globalData();
  const yesterday = endOfYesterday();
  const coinQuery = {
    orderBy: { marketCapRank: 'asc' },
    select: {
      id: true,
      symbol: true,
      name: true,
      images: true,
      marketCap: true,
      marketCapRank: true,
      categories: true,
      tickers: true,
      derivatives: true,
      ohlcs: {
        select: {
          closeTime: true,
          open: true,
          high: true,
          low: true,
          close: true,
          quoteSymbol: true
        },
        where: {
          closeTime: {
            lte: yesterday,
            gte: subWeeks(yesterday, 12)
          }
        },
        orderBy: { closeTime: 'asc' }
      }
    }
  }
  let coinsData
  if (process.env.NODE_ENV === 'development') {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 20})
  } else {
    coinsData = await prisma.coin.findMany({...coinQuery, take: 1000})
  }
  let historicDailySuperSuperTrends = []
  const dateFormatter = new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' })
  for (let i = 0, date = yesterday; i < 30; i++) {
    for (const trend of [signals.buy, signals.hodl, signals.sell]) {
      historicDailySuperSuperTrends.push({
        date,
        amount: 0,
        trend
      })
    }
    date = subDays(date, 1)
  }
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.reverse()
  coinsData = coinsData.map((coinData) => {
    for (let i = 0, date = yesterday; i < 30; i++) {
      const dateOhlcs = coinData.ohlcs.filter(ohlc => ohlc.closeTime.getTime() <= date.getTime())
      const dateDailyOhlcs = convertToDailySignals(dateOhlcs)
      const [_dailyTrends, dateSuperSuperTrend] = getTrends(dateDailyOhlcs, defaultAtrPeriods, defaultMultiplier, false)
      const historicIndex = historicDailySuperSuperTrends.findIndex((historicDataPoint) => {
        return isEqualDate(historicDataPoint.date, date) && historicDataPoint.trend === dateSuperSuperTrend
      })
      historicDailySuperSuperTrends[historicIndex].amount++

      date = subDays(date, 1)
    }
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    const [dailyTrends, dailySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, false)
    const [weeklyTrends, weeklySuperSuperTrend] = getTrends(ohlcs, defaultAtrPeriods, defaultMultiplier, true)
    const [dailyClassicTrends, dailyClassicSuperSuperTrend] = getTrends(ohlcs, 10, 3, false)
    const [weeklyClassicTrends, weeklyClassicSuperSuperTrend] = getTrends(ohlcs, 10, 3, true)
    delete coinData.ohlcs

    const exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    return {
      ...coinData,
      dailyTrends,
      dailySuperSuperTrend,
      weeklyTrends,
      weeklySuperSuperTrend,
      dailyClassicTrends,
      dailyClassicSuperSuperTrend,
      weeklyClassicTrends,
      weeklyClassicSuperSuperTrend,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValue: Number(coinData.fullyDilutedValue),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      exchanges
    }
  })
  historicDailySuperSuperTrends = historicDailySuperSuperTrends.map((historicalDataPoint) => {
    historicalDataPoint.date = dateFormatter.format(historicalDataPoint.date)

    return historicalDataPoint
  })
  const exchangeData = await prisma.exchange.findMany()
  return {
    props: {
      coinsData,
      historicDailySuperSuperTrends,
      exchangeData,
      appData
    }
  }
}

export default function Home({ coinsData, historicDailySuperSuperTrends, appData, exchangeData }) {
  const router = useRouter()
  const [darkMode] = useContext(DarkModeContext);
  const screens = useBreakPoint();
  const defaultFormState = useMemo(() =>
  ({
      category: 'all',
      portfolio: '',
      trendType: signals.all,
      exchanges: [],
      derivatives: [],
      marketCapMin: coinsData[coinsData.length - 1].marketCap,
      marketCapMax: coinsData[0].marketCap,
      trendLengthMin: '',
      trendLengthMax: '',
      superTrendFlavor: SUPERTREND_FLAVOR.coinrotator
    })
  , [coinsData])
  const [portfolioInputValue, setPortfolioInputValue] = useState(defaultFormState.portfolio)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [marketHealthModalVisible, setMarketHealthModalVisible] = useState(false)
  const [formState, formDispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'SET_FROM_ROUTE_PARAMS':
        const routeParams = pickBy(action.payload, (value) => !isNil(value))
        return {
          ...state,
          ...routeParams
        }
      case 'SET_CATEGORY':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          category: action.payload
        }
      case 'SET_PORTFOLIO':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          portfolio: action.payload
        }
      case 'SET_TREND_TYPE':
        if (isNil(action.payload)) { return state }
        return {
          ...state,
          trendType: action.payload
        }
      case 'SET_EXCHANGES':
        return {
          ...state,
          exchanges: action.payload
        }
      case 'SET_DERIVATIVES':
        return {
          ...state,
          derivatives: action.payload
        }
      case 'SET_SUPERTREND_FLAVOR':
        return {
          ...state,
          superTrendFlavor: action.payload
        }
      case 'SET_MARKET_CAP_MIN':
        let newMarketCapMin
        if (action.payload === '') {
          newMarketCapMin = defaultFormState.marketCapMin
        } else {
          newMarketCapMin = parseInt(action.payload)
          if (!isFinite(newMarketCapMin)) {
            return state;
          }
        }

        return {
          ...state,
          marketCapMin: newMarketCapMin
        }
      case 'SET_MARKET_CAP_MAX':
        let newMarketCapMax
        if (action.payload === '') {
          newMarketCapMax = defaultFormState.marketCapMax
        } else {
          newMarketCapMax = parseInt(action.payload)
          if (!isFinite(newMarketCapMax)) {
            return state;
          }
        }

        return {
          ...state,
          marketCapMax: newMarketCapMax
        }
      case 'SET_TREND_LENGTH_MIN':
        let trendLengthMin
        if (action.payload === '') {
          trendLengthMin = defaultFormState.trendLengthMin
        } else {
          trendLengthMin = parseInt(action.payload)
          if (!isFinite(trendLengthMin)) {
            return state;
          }
        }

        return {
          ...state,
          trendLengthMin: trendLengthMin
        }
      case 'SET_TREND_LENGTH_MAX':
        let trendLengthMax
        if (action.payload === '') {
          trendLengthMax = defaultFormState.trendLengthMax
        } else {
          trendLengthMax = parseInt(action.payload)
          if (!isFinite(trendLengthMax)) {
            return state;
          }
        }

        return {
          ...state,
          trendLengthMax: trendLengthMax
        }
      case 'RESET':
        return defaultFormState;
      default:
        return state;
    }
  }, defaultFormState)
  useEffect(() => {
    if (router.isReady) {
      const changedParams = pickBy(formState, (value, key) => {
        if (key === 'exchanges' || key === 'derivatives') {
          const oldArray = Array.isArray(router.query[key]) ? router.query[key] : [router.query[key]]
          return !isEqual(value, oldArray)
        } else {
          return value !== router.query[key]
        }
      })
      const changedParamsThatAreDefault = Object.keys(changedParams).filter((key) => {
        return isEqual(changedParams[key], defaultFormState[key])
      })
      if (Object.keys(changedParams).length > 0) {
        let query = {
          ...router.query,
          ...changedParams
        }
        changedParamsThatAreDefault.forEach(defaultParam => {
          delete query[defaultParam]
        })
        if (!isEqual(query, router.query)) {
          router.push({
            pathname: router.pathname,
            query
          }, null, { shallow: true })
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState, defaultFormState])
  useEffect(() => {
    if (!router.isReady) { return; }

    setPortfolioInputValue(router.query.portfolio)
    let exchanges, derivatives
    if (router.query.exchanges) {
      exchanges = Array.isArray(router.query.exchanges) ? router.query.exchanges : [router.query.exchanges]
    }
    if (router.query.derivatives) {
      derivatives = Array.isArray(router.query.derivatives) ? router.query.derivatives : [router.query.derivatives]
    }
    formDispatch({
      type: 'SET_FROM_ROUTE_PARAMS',
      payload: {
        category: router.query.category,
        portfolio: router.query.portfolio,
        trendType: router.query.trendType,
        exchanges,
        derivatives,
        marketCapMin: router.query.marketCapMin,
        marketCapMax: router.query.marketCapMax,
        trendLengthMin: router.query.trendLengthMin,
        trendLengthMax: router.query.trendLengthMax,
        superTrendFlavor: router.query.superTrendFlavor,
      }
    })
  }, [router.isReady, router.query])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setPortfolioDebounced = useCallback(debounce((portfolio) => {
    formDispatch({ type: 'SET_PORTFOLIO', payload: portfolio })
  }, 400), [])
  useEffect(() => setPortfolioDebounced(portfolioInputValue), [portfolioInputValue, setPortfolioDebounced])

  const isHoverable = useIsHoverable();
  const inputRef = useRef(null)
  useEffect(() => {
    if (isHoverable) {
      inputRef.current.input?.focus();
    }
  }, [isHoverable])

  const portfolioFilter = formState.portfolio
    .replace(/\s/g, '')
    .split(',')
    .map((coinName) => coinName.toLowerCase())
    .filter((coinName) => coinName.length)

  const setPredefinedMarketCap1 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 0 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 100000000 })
  }, [])
  const setPredefinedMarketCap2 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 100000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 1000000000 })
  }, [])
  const setPredefinedMarketCap3 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 1000000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 10000000000 })
  }, [])
  const setPredefinedMarketCap4 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 10000000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: coinsData[0].marketCap })
  }, [coinsData])

  const setPredefinedTrendLength1 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 1})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 5})
  }, [])
  const setPredefinedTrendLength2 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 5})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 10})
  }, [])
  const setPredefinedTrendLength3 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 10})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 20})
  }, [])
  const setPredefinedTrendLength4 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 20})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: ''})
  }, [])

  const buttonSize = screens.xl ? 'large' : screens.sm ? 'medium' : 'small'
  const categories = appData.categories
  const priorityCategories = categories.filter((category) => {
    return [
      'Avalanche Ecosystem',
      'Cosmos Ecosystem',
      'Solana Ecosystem',
      'Near Ecosystem',
      'Play to Earn',
      'Metaverse',
      'Meme',
      'Terra Ecosystem',
      'Web 3.0'
    ].includes(category)
  })
  const restCategories = categories.filter(category => !priorityCategories.includes(category))
  const allExchangeNames = useMemo(() => {
    const exchangeData = coinsData.flatMap((coin) => coin.exchanges)
    const exchangeNames = uniq(exchangeData.map(exchange => exchange[0]))

    return exchangeNames.sort()
  }, [coinsData])
  const allDerivativeExchanges = useMemo(() => {
    const derivativesData = coinsData.flatMap((coin) => coin.derivatives)
    const derivativeExchangeNames = uniq(derivativesData.filter(Boolean).map(derivative => derivative.market))

    return derivativeExchangeNames.sort()
  }, [coinsData])

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = Number(formState.marketCapMin) !== Number(defaultFormState.marketCapMin) ||
                                   Number(formState.marketCapMax) !== Number(defaultFormState.marketCapMax)
    const trendLengthFilterApplied = Number(formState.trendLengthMin) !== Number(defaultFormState.trendLengthMin) ||
                                     Number(formState.trendLengthMax) !== Number(defaultFormState.trendLengthMax)
    const exchangesFilterApplied = !isEqual(formState.exchanges, defaultFormState.exchanges)
    const derivativesFilterApplied = !isEqual(formState.derivatives, defaultFormState.derivatives)
    const superTrendFlavorFilterApplied = !isEqual(formState.superTrendFlavor, defaultFormState.superTrendFlavor)
    const advancedFiltersApplied =
      marketCapFilterApplied ||
      trendLengthFilterApplied ||
      exchangesFilterApplied ||
      derivativesFilterApplied ||
      superTrendFlavorFilterApplied

    if (!advancedFiltersApplied) {
      return null
    }

    const formatter = new Intl.NumberFormat([], {
      notation: 'compact',
      maximumFractionDigits: 2,
    })
    return ([
      <Divider key="divider"/>,
      <Row key="applied-filters">
        <Col span={24}>
          {marketCapFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: defaultFormState.marketCapMin })
              formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: defaultFormState.marketCapMax })
            }}>Market Cap: {formatter.format(formState.marketCapMin)} - {formatter.format(formState.marketCapMax)}</Tag>
          )}
          {trendLengthFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: defaultFormState.trendLengthMin })
              formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: defaultFormState.trendLengthMax })
            }}>Trend Streak: {formState.trendLengthMin} - {formState.trendLengthMax}</Tag>
          )}
          {!isEmpty(formState.exchanges) && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_EXCHANGES', payload: defaultFormState.exchanges })}>Exchanges: {formState.exchanges.join(", ")}</Tag>
          )}
          {!isEmpty(formState.derivatives) && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_DERIVATIVES', payload: defaultFormState.derivatives })}>Derivative markets: {formState.derivatives.join(", ")}</Tag>
          )}
          {superTrendFlavorFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_SUPERTREND_FLAVOR', payload: defaultFormState.superTrendFlavor })}>SuperTrend Flavor: {formState.superTrendFlavor}</Tag>
          )}
        </Col>
      </Row>
    ])
  }

  return (
    <Content className={indexStyles.container}>
      {/* For quick alerts: */}
      {/* <Alert message={<span>Win 100 USDT. Please answer our <b>super brief</b> CoinRotator <a href='https://docs.google.com/forms/d/e/1FAIpQLSdaAbzeWl0wUMSnE3RZZEyX-MxqE9XOnVSCyWXg3Gcpv-rzdg/viewform' target='_blank' rel='noreferrer'>survey</a>.</span>} type="info" closable className={indexStyles.message}/> */}
      <Title className={indexStyles.title}>"Uncover Early Crypto Trends with the Profitable <span>CoinRotator</span> Coin Screener"</Title>
      <Paragraph className={indexStyles.subtitle} type="secondary">
        Stay Ahead of the Crowd with Daily Updates and Proprietary Supertrend Analysis for Top 1,000 Cryptocurrencies</Paragraph>
      <Button type="primary" className={indexStyles.marketHealthButton} onClick={() => setMarketHealthModalVisible(true)}>Market Health</Button>
      <Card className={indexStyles.filters}>
        <Row className={indexStyles.row} type="flex" gutter={16}>
          <Col xs={24} md={6} className={indexStyles.col}>
            <label htmlFor="coin-name">Coin</label>
            <Input
              id="coin-name"
              ref={inputRef}
              placeholder="Bitcoin, ETH, Polygon..."
              allowClear
              value={portfolioInputValue}
              onChange={(e) => setPortfolioInputValue(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} md={6} className={indexStyles.col}>
            <label htmlFor="signal">Trend</label>
            <Select
              size="large"
              value={formState.trendType}
              onChange={(newTrendType) => { formDispatch({ type: 'SET_TREND_TYPE', payload: newTrendType }) }}
              id="signal"
              className={indexStyles.select}
            >
              <Option value={signals.all}>All</Option>
              <Option value={signals.buy}>UP</Option>
              <Option value={signals.hodl}>HODL</Option>
              <Option value={signals.sell}>DOWN</Option>
            </Select>
          </Col>
          <Col xs={24} md={6} className={indexStyles.col}>
            <label htmlFor="category">Category</label>
            <Select
              showSearch
              size="large"
              value={formState.category}
              onChange={(newCategory) => formDispatch({ type: 'SET_CATEGORY', payload: newCategory })}
              id="category"
              className={indexStyles.select}
            >
              <Option value={defaultFormState.category} key="all">All</Option>
              <OptGroup label="Popular categories">
                {
                  priorityCategories.map((category) => <Option value={category} key={category}>{category}</Option>)
                }
              </OptGroup>
              <OptGroup label="Other categories">
                {
                  restCategories.map((category) => <Option value={category} key={category}>{category}</Option>)
                }
              </OptGroup>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Button
              size="large"
              onClick={() => setFilterModalVisible(true)}
              icon={<SlidersOutlined />}
              className={indexStyles.allFiltersButton}
            >
              Configure
            </Button>
          </Col>
        </Row>
        {renderAppliedFilters()}
      </Card>
      <Modal
        open={filterModalVisible}
        title="Configure search"
        onCancel={() => setFilterModalVisible(false)}
        className={indexStyles.configModal}
        footer={[
          <Button
            key="apply"
            onClick={() => setFilterModalVisible(false)}
            size="large"
            type="primary"
            className={indexStyles.applyFilters}
            icon={<CheckCircleOutlined />}
          >
            Apply Settings
          </Button>,
          <Button
            key="reset"
            onClick={() => formDispatch({ type: 'RESET' })}
            size="large"
            danger
            type="primary"
            className={indexStyles.resetFilters}
            icon={<CloseCircleOutlined />}
          >
            Reset Settings
          </Button>
        ]}
      >
        <Row>
          <Col>
            <span>
              <span>SuperTrend Flavor</span>
              <Tooltip
                placement={'right'}
                trigger={isHoverable ? 'hover' : 'click'}
                title="CoinRotator: ATR=5 Multiplier=1.5. Classic: ATR=10 Multiplier=3."
              >
                <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
              </Tooltip>
            </span>
          </Col>
          <Col className={indexStyles.modalInput}>
            <Radio.Group
              optionType="button"
              onChange={(e) => formDispatch({ type: 'SET_SUPERTREND_FLAVOR', payload: e.target.value })}
              value={formState.superTrendFlavor}
            >
              <Radio className={indexStyles.flavorRadio} value={SUPERTREND_FLAVOR.coinrotator}>CoinRotator</Radio>
              <Radio className={indexStyles.flavorRadio} value={SUPERTREND_FLAVOR.classic}>Classic</Radio>
            </Radio.Group>
          </Col>
        </Row>
        <Divider className={indexStyles.divider} />
        <Row>
          <Col>
            <div>Market Cap</div>
          </Col>
        </Row>
        <Row className={indexStyles.modalRow} justify="center" align="middle" gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" xs={10} md={11}>
            <Input
              className={classnames(indexStyles.modalInput)}
              size="large"
              onChange={(e) => formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: e.target.value })}
              value={formState.marketCapMin}
              placeholder="$1"
              aria-label="Market Cap Min"
            />
          </Col>
          <Col className={classnames('gutter-row', indexStyles.modalRangeLabel)} xs={3} md={2}>
            <Text type="secondary">TO</Text>
          </Col>
          <Col className="gutter-row" xs={11} md={11}>
            <Input
              className={classnames(indexStyles.modalInput)}
              size="large"
              onChange={(e) => formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: e.target.value })}
              value={formState.marketCapMax}
              placeholder="$100,000"
              aria-label="Market Cap Max"
            />
          </Col>
        </Row>
        <Row justify="space-between">
          <Col>
            <Button className={indexStyles.modalInputButton} size={buttonSize} onClick={setPredefinedMarketCap1}>$0-$100M</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size={buttonSize} onClick={setPredefinedMarketCap2}>$100M-$1B</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size={buttonSize} onClick={setPredefinedMarketCap3}>$1B-$10B</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size={buttonSize} onClick={setPredefinedMarketCap4}>$10B+</Button>
          </Col>
        </Row>
        <Divider className={indexStyles.divider} />
        <Row>
          <Col>
            <div>Trend Streak</div>
          </Col>
        </Row>
        <Row className={indexStyles.modalRow} justify="center" align="middle" gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" xs={10} md={11}>
            <Input
              className={indexStyles.modalInput}
              size="large"
              onChange={(e) => { formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: e.target.value }) }}
              value={formState.trendLengthMin}
              placeholder="1"
              aria-label="Trend Length Min"
            />
          </Col>
          <Col className={classnames('gutter-row', indexStyles.modalRangeLabel)} xs={3} md={2}>
            <Text type="secondary">TO</Text>
          </Col>
          <Col className="gutter-row" xs={11} md={11}>
            <Input
              className={indexStyles.modalInput}
              size="large"
              onChange={(e) => { formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: e.target.value }) }}
              value={formState.trendLengthMax}
              placeholder="50"
              aria-label="Trend Length Max"
            />
          </Col>
        </Row>
        <Row justify="space-between">
          <Col>
            <Button className={indexStyles.modalInputButton} size="large" onClick={setPredefinedTrendLength1}>1-5</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size="large" onClick={setPredefinedTrendLength2}>5-10</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size="large" onClick={setPredefinedTrendLength3}>10-20</Button>
          </Col>
          <Col>
            <Button className={indexStyles.modalInputButton} size="large" onClick={setPredefinedTrendLength4}>20+</Button>
          </Col>
        </Row>
        <Divider className={indexStyles.divider} />
        <Row>
          <Col>
            <span>
              <span>Exchanges</span>
              <Tooltip
                placement={'right'}
                trigger={isHoverable ? 'hover' : 'click'}
                title="Select your exchanges to see a complete list of coins for each trend condition."
              >
                <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
              </Tooltip>
            </span>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Select exchanges"
              className={indexStyles.modalSelect}
              size="large"
              value={formState.exchanges}
              onChange={(exchanges) => { formDispatch({ type: 'SET_EXCHANGES', payload: exchanges }) }}
            >
              {allExchangeNames.map(exchangeName => <Option key={exchangeName}>{exchangeName}</Option>)}
            </Select>
          </Col>
        </Row>
        <Divider className={indexStyles.divider} />
        <Row>
          <Col>
            <span>
              <span>Derivative markets</span>
              <Tooltip
                placement={'right'}
                trigger={isHoverable ? 'hover' : 'click'}
                title="Select your derivatives markets to see their trend condition."
              >
                <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
              </Tooltip>
            </span>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Select derivative exchanges"
              className={indexStyles.modalSelect}
              size="large"
              value={formState.derivatives}
              onChange={(exchanges) => { formDispatch({ type: 'SET_DERIVATIVES', payload: exchanges }) }}
            >
              {allDerivativeExchanges.map(exchangeName => <Option key={exchangeName}>{exchangeName}</Option>)}
            </Select>
          </Col>
        </Row>
      </Modal>
      <Modal
        open={marketHealthModalVisible}
        centered
        title={
          <>
            <span>Market Health Trend</span>
            <Tooltip
              placement={screens.sm ? 'bottom' : 'bottomRight'}
              overlayClassName={baseStyles.tooltipIcon}
              trigger={isHoverable ? 'hover' : 'click'}
              title="Market Health tracks daily trends of 1000+ coins by marketcap. If you see a Market Extreme the trend is at risk of reversing. Exercise caution."
            >
              <InfoCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.icon)} />
            </Tooltip>
          </>
        }
        onCancel={() => setMarketHealthModalVisible(false)}
        footer={null}
        width={screens.lg ? 783 : 400}
      >
        <MarketHealthChart
          historicDailySuperSuperTrends={historicDailySuperSuperTrends}
          screens={screens}
          darkMode={darkMode}
        />
      </Modal>
      <Row className={indexStyles.tableRow}>
        <HomePageTable
          coinsData={coinsData}
          exchangeData={exchangeData}
          marketCapMax={formState.marketCapMax}
          marketCapMin={formState.marketCapMin}
          trendLengthMin={formState.trendLengthMin}
          trendLengthMax={formState.trendLengthMax}
          portfolio={formState.portfolio}
          portfolioFilter={portfolioFilter}
          category={formState.category}
          trendType={formState.trendType}
          defaultCategory={defaultFormState.category}
          exchanges={formState.exchanges}
          derivatives={formState.derivatives}
          superTrendFlavor={formState.superTrendFlavor}
        />
      </Row>
    </Content>
  );
}
