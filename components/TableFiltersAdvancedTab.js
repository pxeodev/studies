import { Row, Col, Switch, Divider } from 'antd'
import classnames from 'classnames'
import { useAccount } from 'wagmi'

import indexStyles from '../styles/index.module.less'
import NotConnected from './gating/NotConnected.js'
import NoKeyPass from './gating/NoKeyPass.js'
import useKeyPass from '../hooks/useKeyPass.js'

const TableFiltersAdvancedTab = ({
  formState,
  formDispatch,
 }) => {
  const { address: walletAddress } = useAccount()
  const hasKeyPass = useKeyPass()
  const hasWallet = Boolean(walletAddress)

  if (!hasWallet) {
    return (
      <div className={indexStyles.modalContent}>
        <NotConnected />
      </div>
    )
  } else if (!hasKeyPass) {
    return (
      <div className={indexStyles.modalContent}>
        <NoKeyPass />
      </div>
    )
  }
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
          <span>Show 24h Volume / Market Cap</span>
        </Col>
        <Col span={2}>
          <Switch
            className={indexStyles.modalSwitch}
            checked={formState.show24hVolumeByMarketCap}
            onChange={(checked) => { formDispatch({ type: 'SET_SHOW_24H_VOLUME_BY_MARKET_CAP', payload: checked }) }}
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