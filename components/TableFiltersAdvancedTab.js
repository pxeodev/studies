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
          </>
        ) : <></>
      }
    </>
  );
}

export default TableFiltersAdvancedTab