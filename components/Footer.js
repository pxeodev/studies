import { Layout, Row, Col } from 'antd'
import { Client } from 'react-hydration-provider'

import useBreakPoint from '../hooks/useBreakPoint'
import footerStyles from '../styles/footer.module.less'

const Footer = () => {
  const { Footer: AntFooter } = Layout;

  const screens = useBreakPoint();
  let grid;

  if (screens.xl) {
    grid = (
      <Row gutter={32}>
        <Col span={6}>
        </Col>
      </Row>
    )
  } else if (screens.lg) {
    grid = (
      <>
        <Row>
          <Col span={24}></Col>
        </Row>
      </>
    )
  } else if (screens.md) {
    grid = (
      <span>
        <Row>
          <Col span={24}></Col>
        </Row>
      </span>
    )
  } else {
    grid = (
      <span>
        <Row>
          <Col span={24}></Col>
        </Row>
      </span>
    )
  }

  return (
    <AntFooter className={footerStyles.wrapper}>
      <div className={footerStyles.footerPrimary}>
        <Client>
          {grid}
        </Client>
      </div>
    </AntFooter>
  );
}

export default Footer
