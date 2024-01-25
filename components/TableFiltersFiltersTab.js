import classnames from 'classnames';
import { QuestionCircleFilled } from '@ant-design/icons'
import { Row, Col, Input, Button, Select, Divider, Tooltip, Radio, Typography, Checkbox } from 'antd'
import { useCallback } from 'react'

import indexStyles from '../styles/index.module.less'
import baseStyles from '../styles/base.module.less'
import { signals, SUPERTREND_FLAVOR } from 'coinrotator-utils/variables.mjs'

const { Text } = Typography;
const { Option, OptGroup } = Select;

const TableFiltersFiltersTab = ({
  formState,
  formDispatch,
  defaultFormState,
  categories,
  showCategory,
  showMarketCap,
  showTrendLength,
  showExchanges,
  isHoverable,
  allExchangeNames,
  marketCapMax,
  buttonSize,
 }) => {
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
    formDispatch({ type: 'SET_MARKET_CAP_MAX', payload: marketCapMax })
  }, [formDispatch, marketCapMax])

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

  return (
    <>
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
      <Divider className={indexStyles.divider} />
      <Row className={indexStyles.modalRow}>
        <Col span={16}>
          <span>Show CEX / DEX</span>
        </Col>
        <Col span={8}>
          <Checkbox.Group
            options={[
              { label: 'CEX', value: 'cex' },
              { label: 'DEX', value: 'dex' },
            ]}
            name="cexdex"
            value={formState.cexdex}
            onChange={(checked) => { formDispatch({ type: 'SET_CEX_DEX', payload: checked }) }}
          />
        </Col>
      </Row>
    </>
  );
}

export default TableFiltersFiltersTab