import classnames from 'classnames';
import { SlidersOutlined, QuestionCircleFilled } from '@ant-design/icons'
import { Space, Card, Row, Col, Input, Button, Select, Modal, Divider, Tooltip, Radio, Typography, Tag } from 'antd'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import uniq from 'lodash/uniq'
import isEqual from 'lodash/isEqual'

import indexStyles from '../styles/index.module.less'
import baseStyles from '../styles/base.module.less'
import useBreakPoint from '../hooks/useBreakPoint';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals, SUPERTREND_FLAVOR } from '../utils/variables.mjs'

const { Text } = Typography;
const { Option, OptGroup } = Select;

const TableFilters = ({ coinsData, categories, portfolioInputValue, setPortfolioInputValue, formState, formDispatch, defaultFormState, hiddenFilters }) => {
  const screens = useBreakPoint();
  const [filterModalVisible, setFilterModalVisible] = useState(false)
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
  const isHoverable = useIsHoverable();
  const inputRef = useRef(null)
  useEffect(() => {
    if (isHoverable) {
      inputRef.current.input?.focus();
    }
  }, [isHoverable])
  const allDerivativeExchanges = useMemo(() => {
    const derivativesData = coinsData.flatMap((coin) => coin.derivatives)
    const derivativeExchangeNames = uniq(derivativesData.filter(Boolean).map(derivative => derivative.market))

    return derivativeExchangeNames.sort()
  }, [coinsData])
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
  const showMarketCap = !hiddenFilters?.includes('marketCap')

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = showMarketCap && (
                                    Number(formState.marketCapMin) !== Number(defaultFormState.marketCapMin) ||
                                    Number(formState.marketCapMax) !== Number(defaultFormState.marketCapMax)
    )
    const trendLengthFilterApplied = Number(formState.trendLengthMin) !== Number(defaultFormState.trendLengthMin) ||
                                     Number(formState.trendLengthMax) !== Number(defaultFormState.trendLengthMax)
    const trendTypeFilterApplied = !isEqual(formState.trendType, defaultFormState.trendType)
    const categoryFilterApplied = !isEqual(formState.category, defaultFormState.category)
    const exchangesFilterApplied = !isEqual(formState.exchanges, defaultFormState.exchanges)
    const derivativesFilterApplied = !isEqual(formState.derivatives, defaultFormState.derivatives)
    const superTrendFlavorFilterApplied = !isEqual(formState.superTrendFlavor, defaultFormState.superTrendFlavor)

    if (!marketCapFilterApplied &&
        !trendLengthFilterApplied &&
        !trendTypeFilterApplied &&
        !categoryFilterApplied &&
        !exchangesFilterApplied &&
        !derivativesFilterApplied &&
        !superTrendFlavorFilterApplied) {
      return null;
    }

    const formatter = new Intl.NumberFormat([], {
      notation: 'compact',
      maximumFractionDigits: 2,
    })
    return ([
      <Divider key="divider"/>,
      <Row key="applied-filters">
        <Col span={24}>
          {trendTypeFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_TREND_TYPE', payload: defaultFormState.trendType })}>Trend: {formState.trendType}</Tag>
          )}
          {categoryFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_CATEGORY', payload: defaultFormState.category })}>Category: {formState.category}</Tag>
          )}
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
    <>
      <Card className={indexStyles.filters}>
        <Row className={indexStyles.row} type="flex" gutter={16} justify="space-between">
          <Col xs={24} md={12} className={indexStyles.col} >
            <Input
              ref={inputRef}
              placeholder="Bitcoin, ETH, Polygon..."
              allowClear
              value={portfolioInputValue}
              onChange={(e) => setPortfolioInputValue(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} md={12}>
            <Button
              size="large"
              onClick={() => setFilterModalVisible(true)}
              icon={<SlidersOutlined />}
              className={indexStyles.allFiltersButton}
            >
              Customize
            </Button>
          </Col>
        </Row>
        {renderAppliedFilters()}
      </Card>
      <Modal
        open={filterModalVisible}
        title="Customize"
        onCancel={() => setFilterModalVisible(false)}
        className={indexStyles.configModal}
        footer={
          <Space className={indexStyles.configModalButtons}>
            <Button
              key="reset"
              onClick={() => formDispatch({ type: 'RESET' })}
              size="large"
            >
              Reset
            </Button>
            <Button
              key="apply"
              onClick={() => setFilterModalVisible(false)}
              size="large"
              type="primary"
            >
              Apply
            </Button>
          </Space>
        }
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
        <Row gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" span={12}>
            <span>Trend</span>
          </Col>
          <Col className="gutter-row" span={12}>
            <span>Category</span>
          </Col>
        </Row>
        <Row className={indexStyles.modalRow} justify="center" align="middle" gutter={{ xs: 2, md: 16 }}>
          <Col className="gutter-row" span={12} >
            <Select
              size="large"
              value={formState.trendType}
              onChange={(newTrendType) => { formDispatch({ type: 'SET_TREND_TYPE', payload: newTrendType }) }}
              className={indexStyles.select}
            >
              <Option value={signals.all}>All</Option>
              <Option value={signals.buy}>UP</Option>
              <Option value={signals.hodl}>HODL</Option>
              <Option value={signals.sell}>DOWN</Option>
            </Select>
          </Col>
          <Col className="gutter-row" span={12}>
            <Select
              showSearch
              size="large"
              value={formState.category}
              onChange={(newCategory) => formDispatch({ type: 'SET_CATEGORY', payload: newCategory })}
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
        </Row>
        {
          showMarketCap ? (
            <>
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
            </>
          ) : <></>
        }
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
    </>
  );
}

export default TableFilters