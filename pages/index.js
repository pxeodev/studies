import classnames from 'classnames';
import isFinite from 'lodash/isFinite'
import uniq from 'lodash/uniq'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Typography, Card, Row, Col, Input, Button, Select, Table, Tag, Modal, Divider, Switch, Grid, Layout } from 'antd'
import { CloseCircleOutlined, SlidersOutlined, CheckCircleOutlined } from '@ant-design/icons'
import endOfYesterday from 'date-fns/endOfYesterday';
import endOfDay from 'date-fns/endOfDay';
import subDays from 'date-fns/subDays';

import prisma from '../lib/prisma'
import styles from '../styles/index.module.css'
import convertToDailySignals from '../utils/convertToDailySignals';
import getTrends from '../utils/getTrends';
import { signals, defaultAtrPeriods, defaultMultiplier } from '../utils/variables'

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;
const { Content } = Layout;

export async function getStaticProps() {
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
      ohlcs
    }
  })
  let categories = coinsData.flatMap(coin => coin.categories)
  categories = uniq(categories)
  categories = categories.sort((a, b) => a.localeCompare(b))
  return {
    props: {
      coinsData,
      categories
    }
  }
}

export default function Home({ coinsData, categories }) {
  const router = useRouter()
  const portfolio = router.query.portfolio

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
  const [category, setCategory] = useState(defaultCategory)
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
    if (portfolio) {
      setCoinNameFilter(portfolio)
    }
  }, [portfolio])

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
      query: { portfolio: newCoinNames }
    }, null, { shallow: true })
  }, [router])

  const coinsFilter = coinNameFilter
    .replace(/\s/g, '')
    .split(',')
    .map((coinName) => coinName.toLowerCase())
    .filter((coinName) => coinName.length)

  let displayedCoinData = coinsData.filter((coinData) => {
    const max = marketCapMax || Number.POSITIVE_INFINITY
    const min = marketCapMin || Number.NEGATIVE_INFINITY
    const coinSymbolLower = coinData.symbol.toLowerCase()
    const coinNameLower = coinData.name.toLowerCase()
    const matchesNameFilter = coinNameFilter === '' || coinsFilter.some((coinName) => coinNameLower.includes(coinName) || coinSymbolLower.includes(coinName))
    const matchesCategory = category === defaultCategory || coinData.categories.includes(category)
    return coinData.marketCap <= max &&
           coinData.marketCap >= min &&
           matchesNameFilter &&
           matchesCategory
  })
  displayedCoinData = displayedCoinData.map((coinData) => {
    const [trends, superSupertrend] = getTrends(coinData.ohlcs, atrPeriods, multiplier)

    return {
      ...coinData,
      trends,
      superSupertrend,
    }
  })
  displayedCoinData = displayedCoinData.filter((coinData) => {
    let min = parseInt(trendLengthMin)
    min = isFinite(min) ? min : 0
    let max = parseInt(trendLengthMax)
    max = isFinite(max) ? max : Number.POSITIVE_INFINITY

    const trendValues = Object.values(coinData.trends)
    const trends = trendValues.filter(trend => trend[0].length)
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
        id: coinData.id,
        symbol: coinData.symbol,
        images: coinData.images,
        name: coinData.name
      },
      marketCap: coinData.marketCap,
      superSupertrend: coinData.superSupertrend,
    }

    for (const [quoteSymbol, trend] of Object.entries(coinData.trends)) {
      if (trend[0] === '') {
        data[quoteSymbol] = '-'
      } else {
        data[quoteSymbol] = `${trend[0]} (${trend[1]})`
      }
    }

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
  const resetFilters = useCallback(() => {
    resetMarketCap()
    resetTrendLength()
    setTrendType(defaultTrendType)
    setCategory(defaultCategory)
    setCoinName(defaultCoinNameFilter)
    setAtrPeriods(defaultAtrPeriods)
    setMultiplier(defaultMultiplier)
  }, [defaultTrendType, defaultCategory, setCoinName, resetMarketCap, resetTrendLength])

  const columns = [
    {
      title: 'Coin',
      dataIndex: 'coinData',
      render: (coinData) => {
        return (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coinData.images.large} alt={coinData.name} className={styles.tableCoinThumb} loading="lazy"/>
            <span className={styles.tableCoinName}>{coinData.name}</span>
            <span className={styles.tableCoinSymbol}>{coinData.symbol}</span>
          </>
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
      responsive: ['sm'],
    },
    {
      title: 'ETH',
      dataIndex: 'eth',
      responsive: ['sm'],
    },
    {
      title: 'BTC',
      dataIndex: 'btc',
      responsive: ['sm'],
    },
  ];

  const buttonSize = screens.xs ? 'small' : screens.xl ? 'large' : 'medium'

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = marketCapMin !== defaultMarketCapMin || marketCapMax !== defaultMarketCapMax
    const trendLengthFilterApplied = trendLengthMin !== defaultTrendLengthMin || trendLengthMax !== defaultTrendLengthMax
    const trendTypeFilterApplied = trendType !== defaultTrendType
    const categoryFilterApplied = category !== defaultCategory
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

    if (!anyFiltersApplied || screens.xs) {
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
    <>
      <Content className={styles.content}>
        <Title className={styles.title}>Rotate. Your. Dinero. Amigo.</Title>
        <Paragraph className={styles.subTitle} type="secondary">Use the SuperTrend to find promising coins. Swap your portfolio to be in a constant bull market.</Paragraph>
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
              <Select size="large" value={category} onChange={setCategory} className={styles.formSelect}>
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
          <Table
            columns={columns}
            dataSource={tableData}
            onRow={(coin) => ({ onClick: () => {
              router.push(`/coin/${coin.coinData.id}`);
            }}) }
            rowClassName={styles.tableRow}
            pagination={{ position: ['none', 'none'], pageSize: 1000 }}
            bordered
            className={styles.coinsTable}
          />
        </Row>
      </Content>
    </>
  );
}
