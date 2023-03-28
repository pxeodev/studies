import classnames from 'classnames';
import { SlidersOutlined, QuestionCircleFilled } from '@ant-design/icons'
import { Space, Card, Row, Col, Input, Button, Select, Modal, Divider, Tooltip, Radio, Typography, Tag, Switch } from 'antd'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import uniq from 'lodash/uniq'
import isEqual from 'lodash/isEqual'

import indexStyles from '../styles/index.module.less'
import baseStyles from '../styles/base.module.less'
import useBreakPoint from '../hooks/useBreakPoint';
import useIsHoverable from '../hooks/useIsHoverable';
import { signals, SUPERTREND_FLAVOR } from '../utils/variables.mjs'
import ExplainerModal from './ExplainerModal';

const { Text } = Typography;
const { Option, OptGroup } = Select;

const TableFilters = ({ coinsData, categories, portfolioInputValue, setPortfolioInputValue, formState, formDispatch, defaultFormState, hiddenFilters }) => {
  const screens = useBreakPoint();
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const setPredefinedMarketCap1 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 0 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 100000000 })
  }, [formDispatch])
  const setPredefinedMarketCap2 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 100000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 1000000000 })
  }, [formDispatch])
  const setPredefinedMarketCap3 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 1000000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: 10000000000 })
  }, [formDispatch])
  const setPredefinedMarketCap4 = useCallback(() => {
    formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: 10000000000 })
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: coinsData[0].marketCap })
  }, [formDispatch, coinsData])

  const setPredefinedTrendLength1 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 1})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 5})
  }, [formDispatch])
  const setPredefinedTrendLength2 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 5})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 10})
  }, [formDispatch])
  const setPredefinedTrendLength3 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 10})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: 20})
  }, [formDispatch])
  const setPredefinedTrendLength4 = useCallback(() => {
    formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: 20})
    formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: ''})
  }, [formDispatch])

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
  const showCategory = !hiddenFilters?.includes('category')
  const showTrendLength = !hiddenFilters?.includes('trendLength')
  const showExchanges = !hiddenFilters?.includes('exchanges')
  const showDerivativesOptions = !hiddenFilters?.includes('derivatives')

  const renderAppliedFilters = () => {
    const marketCapFilterApplied = showMarketCap && (
                                    Number(formState.marketCapMin) !== Number(defaultFormState.marketCapMin) ||
                                    Number(formState.marketCapMax) !== Number(defaultFormState.marketCapMax)
    )
    const trendLengthFilterApplied = showTrendLength && (
                                    Number(formState.trendLengthMin) !== Number(defaultFormState.trendLengthMin) ||
                                    Number(formState.trendLengthMax) !== Number(defaultFormState.trendLengthMax)
    )
    const trendTypeFilterApplied = !isEqual(formState.trendType, defaultFormState.trendType)
    const categoryFilterApplied = showCategory && !isEqual(formState.category, defaultFormState.category)
    const exchangesFilterApplied = showExchanges && !isEqual(formState.exchanges, defaultFormState.exchanges)
    const derivativesFilterApplied = showDerivativesOptions && !isEqual(formState.derivatives, defaultFormState.derivatives)
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
      <Divider key="divider" className={indexStyles.filterDivider} />,
      <Row key="applied-filters" className={indexStyles.row}>
        <Col span={24} className={indexStyles.appliedFilterCol}>
          {trendTypeFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_TREND_TYPE', payload: defaultFormState.trendType })}>Trend: <span className={indexStyles.appliedFilterTagValue}>{formState.trendType}</span></Tag>
          )}
          {categoryFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_CATEGORY', payload: defaultFormState.category })}>Category: <span className={indexStyles.appliedFilterTagValue}>{formState.category}</span></Tag>
          )}
          {marketCapFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_MARKET_CAP_MIN', payload: defaultFormState.marketCapMin })
              formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: defaultFormState.marketCapMax })
            }}>Market Cap: <span className={indexStyles.appliedFilterTagValue}>{formatter.format(formState.marketCapMin)} - {formatter.format(formState.marketCapMax)}</span></Tag>
          )}
          {trendLengthFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => {
              formDispatch({ type: 'SET_TREND_LENGTH_MIN', payload: defaultFormState.trendLengthMin })
              formDispatch({ type: 'SET_TREND_LENGTH_MAX', payload: defaultFormState.trendLengthMax })
            }}>Trend Streak: <span className={indexStyles.appliedFilterTagValue}>{formState.trendLengthMin} - {formState.trendLengthMax}</span></Tag>
          )}
          {!isEmpty(formState.exchanges) && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_EXCHANGES', payload: defaultFormState.exchanges })}>Exchanges: <span className={indexStyles.appliedFilterTagValue}>{formState.exchanges.join(", ")}</span></Tag>
          )}
          {!isEmpty(formState.derivatives) && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_DERIVATIVES', payload: defaultFormState.derivatives })}>Derivative markets: <span className={indexStyles.appliedFilterTagValue}>{formState.derivatives.join(", ")}</span></Tag>
          )}
          {superTrendFlavorFilterApplied && (
            <Tag className={indexStyles.appliedFilterTag} color="geekblue" closable onClose={() => formDispatch({ type: 'SET_SUPERTREND_FLAVOR', payload: defaultFormState.superTrendFlavor })}>SuperTrend Flavor: <span className={indexStyles.appliedFilterTagValue}>{formState.superTrendFlavor}</span></Tag>
          )}
        </Col>
      </Row>
    ])
  }

  return (
    <>
      <Card className={indexStyles.filters}>
        <Row className={indexStyles.row} type="flex" justify="space-between" gutter={{ xs: 8 }}>
          <Col xs={20} sm={12} md={10} lg={8} xl={6} className={indexStyles.col}>
            <Input
              ref={inputRef}
              placeholder="Bitcoin, ETH, Polygon..."
              allowClear
              value={portfolioInputValue}
              onChange={(e) => setPortfolioInputValue(e.target.value)}
              size="large"
              className={indexStyles.nameFilter}
            />
          </Col>
          <Col xs={3} sm={8} md={6} lg={5} xl={3}>
            <Button
              size="large"
              onClick={() => setFilterModalVisible(true)}
              icon={<SlidersOutlined />}
              className={indexStyles.allFiltersButton}
            >
              {screens.sm ? 'Customize' : null}
            </Button>
          </Col>
        </Row>
        {renderAppliedFilters()}
      </Card>
      <Modal
        open={filterModalVisible}
        title={<>
          <span>Customize</span>
          <ExplainerModal
            title="Customize"
            explainer={`## The Customize Feature

If you're using the CoinRotator screener, you have the ability to customize many sorting functions to your liking. This is available on most pages of the screener.

- **Supertrend Flavor**: Our CoinRotator Supertrend is specifically optimized for the crypto market. You can tweak the settings as much as like, however.
- **Market Cap**: This sorting option allows you to organize coins based on their market capitalization. If you are looking for microcaps or big caps, this is the setting.
- **Trend Freshness**: You can sort coins based on their trend freshness or staleness. This option can help you identify coins that are currently in an uptrend or downtrend, depending on your investment strategy.
- **Exchange**: Sorting coins by exchange is useful if you prefer to invest on a particular exchange or if you want to diversify your portfolio across multiple exchanges.
- **Derivatives**: This sorting option informs you which coins have leverage trading available.`}
            showSource={false}
          />
        </>}
        centered
        className={indexStyles.configModal}
        onCancel={() => setFilterModalVisible(false)}
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
          <Col className={indexStyles.modalHeaderRow}>
            <span>SuperTrend Flavor</span>
            <Tooltip
              placement={'right'}
              trigger={isHoverable ? 'hover' : 'click'}
              title="CoinRotator: ATR=5 Multiplier=1.5. Classic: ATR=10 Multiplier=3."
            >
              <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.tooltipIconBig, baseStyles.icon)} />
            </Tooltip>
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
        <Row gutter={{ xs: 2, md: 16 }} className={indexStyles.modalHeaderRow}>
          <Col className="gutter-row" span={12}>
            <span>Trend</span>
          </Col>
          {
            showCategory ? (
              <Col className="gutter-row" span={12}>
                <span>Category</span>
              </Col>
            ) : <></>
          }
        </Row>
        <Row className={indexStyles.modalRow} align="middle" gutter={{ xs: 2, md: 16 }}>
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
          {
            showCategory ? (
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
            ) : <></>
          }
        </Row>
        {
          showMarketCap ? (
            <>
              <Divider className={indexStyles.divider} />
              <Row className={indexStyles.modalHeaderRow}>
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
                    spellCheck="false"
                    aria-label="Market Cap Max"
                  />
                </Col>
              </Row>
              <Row gutter={{xs: 6, sm: 6, md: 6, lg: 12}}>
                <Col>
                  <Button className={indexStyles.modalInputButton} size={buttonSize} onClick={setPredefinedMarketCap1}>-$100M</Button>
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
        {
          showTrendLength ? (
            <>
              <Divider className={indexStyles.divider} />
              <Row className={indexStyles.modalHeaderRow}>
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
              <Row gutter={{xs: 6, sm: 6, md: 6, lg: 12}}>
                <Col>
                  <Button className={indexStyles.modalInputButton} onClick={setPredefinedTrendLength1}>1-5</Button>
                </Col>
                <Col>
                  <Button className={indexStyles.modalInputButton} onClick={setPredefinedTrendLength2}>5-10</Button>
                </Col>
                <Col>
                  <Button className={indexStyles.modalInputButton} onClick={setPredefinedTrendLength3}>10-20</Button>
                </Col>
                <Col>
                  <Button className={indexStyles.modalInputButton} onClick={setPredefinedTrendLength4}>20+</Button>
                </Col>
              </Row>
            </>
          ) : <></>
        }
        {
          showExchanges ? (
            <>
              <Divider className={indexStyles.divider} />
              <Row className={indexStyles.modalHeaderRow}>
                <Col>
                  <span>
                    <span>Exchanges</span>
                    <Tooltip
                      placement={'right'}
                      trigger={isHoverable ? 'hover' : 'click'}
                      title="Select your exchanges to see a complete list of coins for each trend condition."
                    >
                      <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.tooltipIconBig, baseStyles.icon)} />
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
            </>
          ) : <></>
        }
        {
          showDerivativesOptions ? (
            <>
              <Divider className={indexStyles.divider} />
              <Row className={indexStyles.modalRow}>
                <Col span={22}>
                  <span>Show Derivatives</span>
                </Col>
                <Col span={2}>
                  <Switch
                    className={indexStyles.modalSwitch}
                    checked={formState.showDerivatives}
                    onChange={(checked) => { formDispatch({ type: 'SET_SHOW_DERIVATIVES', payload: checked }) }}
                  />
                </Col>
              </Row>
              <Row className={indexStyles.modalHeaderRow}>
                <Col>
                  <span>
                    <span>Derivative markets</span>
                    <Tooltip
                      placement={'right'}
                      trigger={isHoverable ? 'hover' : 'click'}
                      title="Select your derivatives markets to see their trend condition."
                    >
                      <QuestionCircleFilled className={classnames(baseStyles.tooltipIcon, baseStyles.tooltipIconBig, baseStyles.icon)} />
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
            </>
          ) : <></>
        }
      </Modal>
    </>
  );
}

export default TableFilters