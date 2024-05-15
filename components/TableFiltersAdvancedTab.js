import { Row, Col, Switch, Divider } from 'antd'
import classnames from 'classnames'

import indexStyles from '../styles/index.module.less'

const TableFiltersAdvancedTab = ({
  formState,
  formDispatch,
 }) => {
  return (
    <>
      <Row className={classnames(indexStyles.modalRow, indexStyles.modalRowHeader)}>
        <span>Futures data</span>
      </Row>
      <Row className={indexStyles.modalRow}>
        <Col span={22}>
          <span>Show Open Interest</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.showOpenInterest}
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
            checked={formState.showFundingRate}
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
            checked={formState.showFuturesVolume}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_FUTURES_VOLUME', payload: checked }) }}
          />
        </Col>
      </Row>
      <Divider className={indexStyles.divider} />
      <Row className={classnames(indexStyles.modalRow, indexStyles.modalRowHeader)}>
        <span>Price data</span>
      </Row>
      <Row className={indexStyles.modalRow}>
        <Col span={22}>
          <span>Show Market Cap #</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.showMarketCapRank}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_MARKET_CAP_RANK', payload: checked }) }}
          />
        </Col>
      </Row>
      <Row className={indexStyles.modalRow}>
        <Col span={22}>
          <span>Show Circulating Supply % (Market Cap / FDV)</span>
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
          <span>Show ATH</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.showATH}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_ATH', payload: checked }) }}
          />
        </Col>
      </Row>
      <Row className={indexStyles.modalRow}>
        <Col span={22}>
          <span>Show % from ATH</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.showPercentageFromATH}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_PERCENTAGE_FROM_ATH', payload: checked }) }}
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
            checked={formState.showATL}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_ATL', payload: checked }) }}
          />
        </Col>
      </Row>
      <Row className={indexStyles.modalRow}>
        <Col span={22}>
          <span>Show % from ATL</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.showPercentageFromATL}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_PERCENTAGE_FROM_ATL', payload: checked }) }}
          />
        </Col>
      </Row>
    </>
  );
}

export default TableFiltersAdvancedTab