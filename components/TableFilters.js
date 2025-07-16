import classnames from 'classnames';
import { SlidersOutlined } from '@ant-design/icons'
import { Space, Card, Row, Col, Input, Button, Modal, Divider, Typography, Tag } from 'antd'
import { useState, useEffect, useRef, useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import uniq from 'lodash/uniq'
import isEqual from 'lodash/isEqual'
import compact from 'lodash/compact'
import { useRouter } from 'next/router'

import indexStyles from '../styles/index.module.less'
import coinStyles from '../styles/coin.module.less'
import useBreakPoint from '../hooks/useBreakPoint';
import useIsHoverable from '../hooks/useIsHoverable';
import ExplainerModal from './ExplainerModal';
import TableFiltersFiltersTab from './TableFiltersFiltersTab';
import TableFiltersAdvancedTab from './TableFiltersAdvancedTab';

const { Title } = Typography;
const TABS = {
  filters: 'Filters',
  advanced: 'Advanced data',
}

const TableFilters = ({ coinsData, categories, portfolioInputValue, setPortfolioInputValue, formState, formDispatch, defaultFormState, hiddenFilters }) => {
  const screens = useBreakPoint();
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('Filters')
  const router = useRouter()
  useEffect(() => {
    const path = router.asPath
    const afterHash = path.split('#')[1]
    if (afterHash?.startsWith('customize')) {
      setFilterModalVisible(true)
    }
    if (afterHash === 'customize-advanced-filters') {
      setActiveTab(TABS.advanced)
    }
  }, [router.asPath])

  const isHoverable = useIsHoverable();
  const inputRef = useRef(null)
  useEffect(() => {
    if (isHoverable) {
      inputRef.current.input?.focus();
    }
  }, [isHoverable])
  const allDerivativeExchanges = useMemo(() => {
    const derivativesData = coinsData.flatMap((coin) => coin.derivatives)
    const derivativeExchangeNames = uniq(derivativesData.filter(Boolean))

    return derivativeExchangeNames.sort()
  }, [coinsData])
  const allExchangeNames = useMemo(() => {
    const exchangeData = compact(coinsData.flatMap((coin) => coin.exchanges))
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
        zIndex={300}
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
        <div className={indexStyles.configModalHeader}>
          {Object.values(TABS).map((tab) => {
            return (
              <Card.Grid
                hoverable={false}
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={classnames(coinStyles.tab, indexStyles.tab, {
                  [coinStyles.active]: tab === activeTab,
                  [coinStyles.noRightBorder]: tab === TABS.advanced,
                  [coinStyles.noLeftBorder]: tab === TABS.filters
                })}
              >
                <Title
                  id={tab}
                  level={2}
                  className={classnames(coinStyles.tabTitle, { [coinStyles.activeTitle]: tab === activeTab })}
                >
                  {tab}
                </Title>
              </Card.Grid>
            );
          })}
        </div>
        <div className={indexStyles.configModalBody}>
          {activeTab === TABS.filters ? (
            <TableFiltersFiltersTab
              formState={formState}
              formDispatch={formDispatch}
              defaultFormState={defaultFormState}
              showCategory={showCategory}
              showMarketCap={showMarketCap}
              showTrendLength={showTrendLength}
              showExchanges={showExchanges}
              showDerivativesOptions={showDerivativesOptions}
              allDerivativeExchanges={allDerivativeExchanges}
              allExchangeNames={allExchangeNames}
              isHoverable={isHoverable}
              categories={categories}
              marketCapMax={coinsData[0].marketCap}
              buttonSize={screens.xl ? 'large' : screens.sm ? 'medium' : 'small'}
            />
          ) : (
            <TableFiltersAdvancedTab
              formState={formState}
              formDispatch={formDispatch}
              defaultFormState={defaultFormState}
              isHoverable={isHoverable}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

export default TableFilters