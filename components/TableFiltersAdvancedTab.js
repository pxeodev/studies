import classnames from 'classnames';
import { QuestionCircleFilled } from '@ant-design/icons'
import { Row, Col, Select, Divider, Tooltip, Switch } from 'antd'

import indexStyles from '../styles/index.module.less'
import baseStyles from '../styles/base.module.less'

const { Option } = Select;

const TableFiltersAdvancedTab = ({
  formState,
  formDispatch,
  showDerivativesOptions,
  isHoverable,
  allDerivativeExchanges,
 }) => {
  return (
    <>
      {
        showDerivativesOptions ? (
          <>
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
            <Divider className={indexStyles.divider} />
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Market Cap / FDV</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.showMarketCapFDV}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_MARKET_CAP_FDV', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Circulating Supply Percentage</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.showCirculatingSupplyPercentage}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_CIRCULATING_SUPPLY_PERCENTAGE', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Percentage from ATH</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.percentageFromATH}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_PERCENTAGE_FROM_ATH', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Percentage from ATL</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.percentageFromATL}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_PERCENTAGE_FROM_ATL', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Market Cap #</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.marketCapRank}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_MARKET_CAP_RANK', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Open Interest</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.openInterest}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_OPEN_INTEREST', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show Funding Rate</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.fundingRate}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_FUNDING_RATE', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show OI / 24h Volume</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.futuresVolume}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_FUTURES_VOLUME', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show ATH</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.ath}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_ATH', payload: checked }) }}
                />
              </Col>
            </Row>
            <Row className={indexStyles.modalRow}>
              <Col span={22}>
                <span>Show ATL</span>
              </Col>
              <Col span={2}>
                <Switch
                  className={indexStyles.modalSwitch}
                  checked={formState.atl}
                  onChange={(checked) => { formDispatch({ type: 'SET_SHOW_ATL', payload: checked }) }}
                />
              </Col>
            </Row>
          </>
        ) : <></>
      }
    </>
  );
}

export default TableFiltersAdvancedTab