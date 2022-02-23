import classnames from 'classnames';
import isFinite from 'lodash/isFinite'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Typography, Card, Row, Col, Input, Button, Select, Tag, Modal, Divider, Switch, Layout } from 'antd'
import { CloseCircleOutlined, SlidersOutlined, CheckCircleOutlined } from '@ant-design/icons'
import endOfYesterday from 'date-fns/endOfYesterday';

import prisma from '../lib/prisma'
import styles from '../styles/index.module.less'
import convertToDailySignals from '../utils/convertToDailySignals';
import useBreakpoint from '../utils/useBreakpoint';
import { signals, defaultAtrPeriods, defaultMultiplier } from '../utils/variables'
import HomePageTable from '../components/HomePageTable';
import { getCategories } from '../utils/categories';
import globalData from '../lib/globalData';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

export async function getStaticProps() {
  const appData = await globalData();
  let coinsData = await prisma.coin.findMany({
    orderBy: { marketCapRank: 'asc' },
    take: 1000,
    select: {
      id: true,
      symbol: true,
      name: true,
      images: true,
      marketCap: true,
      marketCapRank: true,
      categories: true,
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
          }
        },
        orderBy: { closeTime: 'asc' }
      }
    }
  })
  coinsData = coinsData.map((coinData) => {
    const ohlcs = convertToDailySignals(coinData.ohlcs)

    return {
      ...coinData,
      currentPriceUsd: Number(coinData.currentPriceUsd),
      ath: Number(coinData.ath),
      atl: Number(coinData.atl),
      fullyDilutedValue: Number(coinData.fullyDilutedValue),
      circulatingSupply: Number(coinData.circulatingSupply),
      totalSupply: Number(coinData.totalSupply),
      ohlcs
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
  const { portfolio: portfolioParam, category: categoryParam } = router.query

  const defaultMarketCapMin = coinsData[coinsData.length - 1].marketCap
  const defaultMarketCapMax = coinsData[0].marketCap
  const defaultTrendLengthMin = ''
  const defaultTrendLengthMax = ''
  const defaultTrendType = signals.all
  const defaultCategory = 'all'
  const defaultCoinNameFilter = ''

  const [marketCapMin, setMarketCapMin] = useState(defaultMarketCapMin)
  const [marketCapMax, setMarketCapMax] = useState(defaultMarketCapMax)
  const [trendLengthMin, setTrendLengthMin] = useState(defaultTrendLengthMin)
  const [trendLengthMax, setTrendLengthMax] = useState(defaultTrendLengthMax)
  const [trendType, setTrendType] = useState(defaultTrendType)
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory)
  const [coinNameFilter, setCoinNameFilter] = useState(defaultCoinNameFilter)
  const [atrPeriods, setAtrPeriods] = useState(defaultAtrPeriods)
  const [multiplier, setMultiplier] = useState(defaultMultiplier)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [showWeeklySignals, setShowWeeklySignals] = useState(false)

  const resetMarketCap = useCallback(() => {
    setMarketCapMin(defaultMarketCapMin)
    setMarketCapMax(defaultMarketCapMax)
  }, [defaultMarketCapMin, defaultMarketCapMax])
  const resetTrendLength = useCallback(() => {
    setTrendLengthMin(defaultTrendLengthMin)
    setTrendLengthMax(defaultTrendLengthMax)
  }, [defaultTrendLengthMin, defaultTrendLengthMax])

  const screens = useBreakpoint();

  const inputRef = useRef(null)
  useEffect(() => {
    inputRef.current.input?.focus();
  }, [])
  useEffect(() => {
    if (portfolioParam) {
      setCoinNameFilter(portfolioParam)
    }
  }, [portfolioParam])
  useEffect(() => {
    if (categoryParam) {
      setCategoryFilter(categoryParam)
    }
  }, [categoryParam])

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
  const setCoinName = useCallback((newCoinNames) => {
    setCoinNameFilter(newCoinNames)
    router.replace({
      pathname: router.pathname,
      query: {
        portfolio: newCoinNames,
        category: categoryFilter
      }
    }, null, { shallow: true })
  }, [router, categoryFilter])
  const setCategory = useCallback((newCategory) => {
    setCategoryFilter(newCategory)
    router.replace({
      pathname: router.pathname,
      query: {
        category: newCategory,
        portfolio: portfolioParam
      }
    }, null, { shallow: true })
  }, [router, portfolioParam])

  const coinsFilter = coinNameFilter
    .replace(/\s/g, '')
    .split(',')
    .map((coinName) => coinName.toLowerCase())
    .filter((coinName) => coinName.length)

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
  const resetFilters = useCallback(() => {
    resetMarketCap()
    resetTrendLength()
    setTrendType(defaultTrendType)
    setCategory(defaultCategory)
    setCoinName(defaultCoinNameFilter)
    setAtrPeriods(defaultAtrPeriods)
    setMultiplier(defaultMultiplier)
  }, [defaultTrendType, defaultCategory, setCoinName, resetMarketCap, resetTrendLength, setCategory])

  const buttonSize = screens.xl ? 'large' : screens.sm ? 'medium' : 'small'

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = marketCapMin !== defaultMarketCapMin || marketCapMax !== defaultMarketCapMax
    const trendLengthFilterApplied = trendLengthMin !== defaultTrendLengthMin || trendLengthMax !== defaultTrendLengthMax
    const trendTypeFilterApplied = trendType !== defaultTrendType
    const categoryFilterApplied = categoryFilter !== defaultCategory
    const coinNameFilterApplied = coinNameFilter !== defaultCoinNameFilter
    const atrPeriodsFilterApplied = atrPeriods !== defaultAtrPeriods
    const multiplierFilterApplied = multiplier !== defaultMultiplier
    const anyFiltersApplied =
      marketCapFilterApplied ||
      trendLengthFilterApplied ||
      trendTypeFilterApplied ||
      categoryFilterApplied ||
      coinNameFilterApplied ||
      atrPeriodsFilterApplied ||
      multiplierFilterApplied

    if (!anyFiltersApplied || !screens.sm) {
      return null
    }
    return ([
      <Divider key="divider"/>,
      <Row key="applied-filters">
        <Col span={24}>
          {marketCapFilterApplied && (
            <Tag color="geekblue" closable onClose={resetMarketCap}>Market Cap: {marketCapMin} - {marketCapMax}</Tag>
          )}
          {trendLengthFilterApplied && (
            <Tag color="geekblue" closable onClose={resetTrendLength}>Signal Streak: {trendLengthMin} - {trendLengthMax}</Tag>
          )}
          {atrPeriodsFilterApplied && (
            <Tag color="geekblue" closable onClose={() => setAtrPeriods(defaultAtrPeriods)}>ATR periods: {atrPeriods}</Tag>
          )}
          {multiplierFilterApplied && (
            <Tag color="geekblue" closable onClose={() => setMultiplier(defaultMultiplier)}>Multiplier: {multiplier}</Tag>
          )}
        </Col>
      </Row>
    ])
  }

  return (
    <Content className={styles.content}>
      <Title className={styles.title}>Swap Into The Most Profitable Coins</Title>
      <Paragraph className={styles.subTitle} type="secondary">Use Coinrotator to find the most promising cryptocurrencies. Keep your portfolio in a constant uptrend.</Paragraph>
      {/* <Button className={styles.marketHealth} type="primary">Market Health</Button> */}
      <Card className={styles.formCard}>
        <Row className={styles.formRow} type="flex" gutter={16}>
          <Col xs={24} md={6} className={styles.formCol}>
            <div className={styles.formLabel}>Coin</div>
            <Input
              ref={inputRef}
              placeholder="Bitcoin, ETH, Polygon..."
              allowClear
              value={coinNameFilter}
              onChange={(e) => setCoinName(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} md={6} className={styles.formCol}>
            <div className={styles.formLabel}>Signal</div>
            <Select size="large" value={trendType} onChange={setTrendType} className={styles.formSelect}>
              <Option value={signals.all}>All</Option>
              <Option value={signals.buy}>Buy</Option>
              <Option value={signals.sell}>Sell</Option>
            </Select>
          </Col>
          <Col xs={24} md={6} className={styles.formCol}>
            <div className={styles.formLabel}>Category</div>
            <Select size="large" value={categoryFilter} onChange={setCategory} className={styles.formSelect}>
              <Option value={defaultCategory} key="all">All</Option>
              {
                categories.map((category) => <Option value={category} key={category}>{category}</Option>)
              }
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <div className={classnames(styles.formLabel, styles.hiddenFormLabel)}>&nbsp;</div>
            <Button
              size="large"
              onClick={() => setFilterModalVisible(true)}
              icon={<SlidersOutlined />}
              className={styles.formAllFilters}
            >
              All Filters
            </Button>
          </Col>
        </Row>
        {renderAppliedFilters()}
      </Card>
      <Modal
        visible={filterModalVisible}
        title="Filters"
        onCancel={() => setFilterModalVisible(false)}
        footer={[
          <Button
            key="apply"
            onClick={() => setFilterModalVisible(false)}
            size="large"
            type="primary"
            icon={<CheckCircleOutlined />}
            className={styles.applyFilterModal}
          >
            Apply Filters
          </Button>,
          <Button
            key="reset"
            onClick={resetFilters}
            size="large"
            danger
            type="primary"
            icon={<CloseCircleOutlined />}
          >
            Reset Filters
          </Button>
        ]}
      >
        {/* <Row className={styles.formRow} justify="space-between">
          <Col>
            <span>Weekly Signals</span>
          </Col>
          <Col>
            <Switch checked={showWeeklySignals} onChange={setShowWeeklySignals} />
          </Col>
        </Row>
        <Divider /> */}
        <Row className={styles.formRow} gutter={16}>
          <Col span={12} className="gutter-row">
            <div className={styles.formLabel}>ATR periods</div>
            <Input size="large" onChange={setValidAtrPeriods} value={atrPeriods}></Input>
          </Col>
          <Col span={12} className="gutter-row">
            <div className={styles.formLabel}>Multiplier</div>
            <Input size="large" onChange={setValidMulitiplier} value={multiplier}></Input>
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col>
            <div className={styles.formLabel}>Market Cap</div>
          </Col>
        </Row>
        <Row className={styles.filterModalRow} justify="center" align="middle" gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" xs={10} md={11}>
            <Input className={classnames(styles.filterModalInput)} size="large" onChange={setValidMarketCapMin} value={marketCapMin} placeholder="$1"></Input>
          </Col>
          <Col className={classnames('gutter-row', styles.formRangeLabel)} xs={3} md={2}>
            <Text type="secondary">TO</Text>
          </Col>
          <Col className="gutter-row" xs={11} md={11}>
            <Input className={classnames(styles.filterModalInput)} size="large" onChange={setValidMarketCapMax} value={marketCapMax} placeholder="$100,000"></Input>
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
            <div className={styles.formLabel}>Signal Streak</div>
          </Col>
        </Row>
        <Row className={styles.filterModalRow} justify="center" align="middle" gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" xs={10} md={11}>
            <Input className={styles.filterModalInput} size="large" onChange={setValidTrendLengthMin} value={trendLengthMin} placeholder="1"></Input>
          </Col>
          <Col className={classnames('gutter-row', styles.formRangeLabel)} xs={3} md={2}>
            <Text type="secondary">TO</Text>
          </Col>
          <Col className="gutter-row" xs={11} md={11}>
            <Input className={styles.filterModalInput} size="large" onChange={setValidTrendLengthMax} value={trendLengthMax} placeholder="50"></Input>
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
      </Modal>
      <Row className={styles.tableGridRow}>
        <HomePageTable
          coinsData={coinsData}
          marketCapMax={marketCapMax}
          marketCapMin={marketCapMin}
          trendLengthMin={trendLengthMin}
          trendLengthMax={trendLengthMax}
          coinNameFilter={coinNameFilter}
          coinsFilter={coinsFilter}
          category={categoryFilter}
          trendType={trendType}
          defaultCategory={defaultCategory}
          atrPeriods={atrPeriods}
          multiplier={multiplier}
        />
      </Row>
    </Content>
  );
}
