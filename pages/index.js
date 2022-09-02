import { Typography, Card, Row, Col, Input, Button, Select, Tag, Modal, Divider, Switch, Layout, Alert, Tabs } from 'antd'
import { CloseCircleOutlined, SlidersOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useRouter } from 'next/router'
import { useMemo, useState, useCallback, useEffect, useReducer, useRef } from 'react'
import prisma from '../lib/prisma'

import debounce from 'lodash/debounce'
import isFinite from 'lodash/isFinite'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import isNil from 'lodash/isNil'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'
import endOfYesterday from 'date-fns/endOfYesterday';
import subWeeks from 'date-fns/subWeeks';

import HomePageTable from '../components/HomePageTable';
import useBreakPoint from '../hooks/useBreakPoint';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals, defaultAtrPeriods, defaultMultiplier } from '../utils/variables'
import convertToDailySignals from '../utils/convertToDailySignals';
import convertTickersToExchanges from '../utils/convertTickersToExchanges';
import { getCategories } from '../utils/categories';
import globalData from '../lib/globalData';
import classnames from 'classnames';

import indexStyles from '../styles/index.module.less'

const { Title, Paragraph, Text } = Typography;
const { Option, OptGroup } = Select;
const { Content } = Layout;
const { TabPane } = Tabs;

export async function getStaticProps() {
  const appData = await globalData();
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
            lte: endOfYesterday(),
            gte: subWeeks(endOfYesterday(), 12)
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
  coinsData = coinsData.map((coinData) => {
    const ohlcs = convertToDailySignals(coinData.ohlcs)
    const exchanges = convertTickersToExchanges(coinData.tickers)
    delete coinData.tickers

    return {
      ...coinData,
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValue: Number(coinData.fullyDilutedValue),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      ohlcs,
      exchanges
    }
  })
  let categories = await getCategories()
  return {
    props: {
      coinsData,
      categories,
      appData
    }
  }
}

export default function Home({ coinsData, categories }) {
  const router = useRouter()
  const defaultFormState = useMemo(() =>
  ({
      category: 'all',
      portfolio: '',
      trendType: signals.all,
      weeklySignals: false,
      exchanges: [],
      derivatives: [],
      marketCapMin: coinsData[coinsData.length - 1].marketCap,
      marketCapMax: coinsData[0].marketCap,
      trendLengthMin: '',
      trendLengthMax: '',
      atrPeriods: defaultAtrPeriods,
      multiplier: defaultMultiplier,
    })
  , [coinsData])
  const [portfolioInputValue, setPortfolioInputValue] = useState(defaultFormState.portfolio)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
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
      case 'SET_WEEKLY_SIGNALS':
        return {
          ...state,
          weeklySignals: action.payload
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
      case 'SET_ATR_PERIODS':
        const newAtrPeriods = parseFloat(action.payload)
        if (!isFinite(newAtrPeriods)) {
          return state;
        }

        return {
          ...state,
          atrPeriods: newAtrPeriods
        }
      case 'SET_MULTIPLIER':
        const newMultiplier = parseFloat(action.payload)
        if (!isFinite(newMultiplier)) {
          return state;
        }

        return {
          ...state,
          multiplier: newMultiplier
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
        weeklySignals: router.query.weeklySignals,
        exchanges,
        derivatives,
        marketCapMin: router.query.marketCapMin,
        marketCapMax: router.query.marketCapMax,
        trendLengthMin: router.query.trendLengthMin,
        trendLengthMax: router.query.trendLengthMax,
        atrPeriods: router.query.atrPeriods,
        multiplier: router.query.multiplier,
      }
    })
  }, [router.isReady, router.query])
  const setPortfolioDebounced = useCallback(debounce((portfolio) => {
    formDispatch({ type: 'SET_PORTFOLIO', payload: portfolio })
  }, 400), [])
  useEffect(() => setPortfolioDebounced(portfolioInputValue), [portfolioInputValue, setPortfolioDebounced])

  const screens = useBreakPoint();
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
    const derivativeExchangeNames = uniq(derivativesData.map(derivative => derivative.market))

    return derivativeExchangeNames.sort()
  }, [coinsData])

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = Number(formState.marketCapMin) !== Number(defaultFormState.marketCapMin) ||
                                   Number(formState.marketCapMax) !== Number(defaultFormState.marketCapMax)
    const trendLengthFilterApplied = Number(formState.trendLengthMin) !== Number(defaultFormState.trendLengthMin) ||
                                     Number(formState.trendLengthMax) !== Number(defaultFormState.trendLengthMax)
    const atrPeriodsFilterApplied = formState.atrPeriods !== defaultAtrPeriods
    const multiplierFilterApplied = formState.multiplier !== defaultMultiplier
    const showWeeklySignalsFilterApplied = formState.weeklySignals !== defaultFormState.weeklySignals
    const exchangesFilterApplied = !isEqual(formState.exchanges, defaultFormState.exchanges)
    const derivativesFilterApplied = !isEqual(formState.derivatives, defaultFormState.derivatives)
    const advancedFiltersApplied =
      marketCapFilterApplied ||
      trendLengthFilterApplied ||
      atrPeriodsFilterApplied ||
      multiplierFilterApplied ||
      showWeeklySignalsFilterApplied ||
      exchangesFilterApplied ||
      derivativesFilterApplied

    if (!advancedFiltersApplied || !screens.sm) {
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
            <Tag color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: defaultFormState.marketCapMin })
              formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: defaultFormState.marketCapMax })
            }}>Market Cap: {formatter.format(formState.marketCapMin)} - {formatter.format(formState.marketCapMax)}</Tag>
          )}
          {trendLengthFilterApplied && (
            <Tag color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: defaultFormState.trendLengthMin })
              formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: defaultFormState.trendLengthMax })
            }}>Trend Streak: {formState.trendLengthMin} - {formState.trendLengthMax}</Tag>
          )}
          {atrPeriodsFilterApplied && (
            <Tag color="geekblue" closable onClose={() => formDispatch({ type: 'SET_ATR_PERIODS', payload: defaultFormState.atrPeriods })}>ATR periods: {formState.atrPeriods}</Tag>
          )}
          {multiplierFilterApplied && (
            <Tag color="geekblue" closable onClose={() => formDispatch({ type: 'SET_MULTIPLIER', payload: defaultFormState.multiplier })}>Multiplier: {formState.multiplier}</Tag>
          )}
          {formState.weeklySignals && (
            <Tag color="geekblue" closable onClose={() => formDispatch({ type: 'SET_WEEKLY_SIGNALS', payload: defaultFormState.weeklySignals })}>Weekly trends</Tag>
          )}
          {!isEmpty(formState.exchanges) && (
            <Tag color="geekblue" closable onClose={() => formDispatch({ type: 'SET_EXCHANGES', payload: defaultFormState.exchanges })}>Exchanges: {formState.exchanges.join(", ")}</Tag>
          )}
          {!isEmpty(formState.derivatives) && (
            <Tag color="geekblue" closable onClose={() => formDispatch({ type: 'SET_DERIVATIVES', payload: defaultFormState.derivatives })}>Derivative exchanges: {formState.derivatives.join(", ")}</Tag>
          )}
        </Col>
      </Row>
    ])
  }

  return (
    <Content className={indexStyles.container}>
      <Alert message={<span>Win 100 USDT. Please answer our CoinRotator <a href='https://docs.google.com/forms/d/e/1FAIpQLSdaAbzeWl0wUMSnE3RZZEyX-MxqE9XOnVSCyWXg3Gcpv-rzdg/viewform' target='_blank' rel='noreferrer'>survey</a>.</span>} type="info" banner closable className={indexStyles.message}/>
      <Title className={indexStyles.title}>Search For The Most Profitable Coins</Title>
      <Paragraph className={indexStyles.subtitle} type="secondary"><span>CoinRotator</span> tracks price trends for the top 1,000 cryptocurrencies, all updated daily on a single dashboard. Instantly check the coin screener for each market using our proprietary algorithm.</Paragraph>
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
        visible={filterModalVisible}
        title="Configure search"
        onCancel={() => setFilterModalVisible(false)}
        footer={[
          <Button
            key="apply"
            onClick={() => setFilterModalVisible(false)}
            size="large"
            type="primary"
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
            icon={<CloseCircleOutlined />}
          >
            Reset Settings
          </Button>
        ]}
      >
        <Tabs defaultActiveKey="filters">
          <TabPane tab="Filters" key="filters">
            <Row className={indexStyles.row} gutter={16}>
              <Col span={12} className="gutter-row">
                <label htmlFor="atr-periods">ATR periods</label>
                <Input size="large" onChange={(e) => formDispatch({ type: 'SET_ATR_PERIODS', payload: e.target.value })} value={formState.atrPeriods} id="atr-periods"></Input>
              </Col>
              <Col span={12} className="gutter-row">
                <label htmlFor="multiplier">Multiplier</label>
                <Input size="large" onChange={(e) => formDispatch({ type: 'SET_MULTIPLIER', payload: e.target.value })} value={formState.multiplier} id="multiplier"></Input>
              </Col>
            </Row>
            <Divider />
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
                <Button size={buttonSize} onClick={setPredefinedMarketCap1}>$0-$100M</Button>
              </Col>
              <Col>
                <Button size={buttonSize} onClick={setPredefinedMarketCap2}>$100M-$1B</Button>
              </Col>
              <Col>
                <Button size={buttonSize} onClick={setPredefinedMarketCap3}>$1B-$10B</Button>
              </Col>
              <Col>
                <Button size={buttonSize} onClick={setPredefinedMarketCap4}>$10B+</Button>
              </Col>
            </Row>
            <Divider />
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
                <Button size="large" onClick={setPredefinedTrendLength1}>1-5</Button>
              </Col>
              <Col>
                <Button size="large" onClick={setPredefinedTrendLength2}>5-10</Button>
              </Col>
              <Col>
                <Button size="large" onClick={setPredefinedTrendLength3}>10-20</Button>
              </Col>
              <Col>
                <Button size="large" onClick={setPredefinedTrendLength4}>20+</Button>
              </Col>
            </Row>
            <Divider />
            <Row>
              <Col>
                <div>Exchanges</div>
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
            <Divider />
            <Row>
              <Col>
                <div>Derivative exchanges</div>
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
          </TabPane>
          <TabPane tab="Columns" key="columns">
            <Row className={indexStyles.row} justify="space-between">
              <Col>
                <span>Show weekly trends</span>
              </Col>
              <Col>
                <Switch checked={formState.weeklySignals} onChange={(checked) => formDispatch({ type: 'SET_WEEKLY_SIGNALS', payload: checked })} />
              </Col>
            </Row>
            <Row>
              <Col>
                <Text type="secondary">Weekly trends update each Monday at 00:00 UTC.</Text>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Modal>
      <Row className={indexStyles.tableRow}>
        <HomePageTable
          coinsData={coinsData}
          marketCapMax={formState.marketCapMax}
          marketCapMin={formState.marketCapMin}
          trendLengthMin={formState.trendLengthMin}
          trendLengthMax={formState.trendLengthMax}
          portfolio={formState.portfolio}
          portfolioFilter={portfolioFilter}
          category={formState.category}
          trendType={formState.trendType}
          defaultCategory={defaultFormState.category}
          atrPeriods={formState.atrPeriods}
          multiplier={formState.multiplier}
          showWeeklySignals={formState.weeklySignals}
          exchanges={formState.exchanges}
          derivatives={formState.derivatives}
        />
      </Row>
    </Content>
  );
}
