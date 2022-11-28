import { Layout, Typography, Row, Col } from 'antd'

import useBreakPoint from '../hooks/useBreakPoint'
import footerStyles from '../styles/footer.module.less'

const Footer = () => {
  const { Footer: AntFooter } = Layout;
  const { Paragraph } = Typography;

  const nfaBlock = <>
    <Paragraph type="secondary" className={footerStyles.paragraph}>
      This crypto coin screener is for informational purposes only. Users should not consider anything here as investment or financial advice. NFA.
    </Paragraph>
  </>

  const screens = useBreakPoint();
  let grid;

  if (screens.xl) {
    grid = (
      <Row gutter={32}>
        <Col span={6}>
          {nfaBlock}
        </Col>
      </Row>
    )
  } else if (screens.lg) {
    grid = (
      <>
        <Row>
          <Col span={24}>{nfaBlock}</Col>
        </Row>
      </>
    )
  } else if (screens.md) {
    grid = (
      <span>
        <Row>
          <Col span={24}>{nfaBlock}</Col>
        </Row>
      </span>
    )
  } else {
    grid = (
      <span>
        <Row>
          <Col span={24}>{nfaBlock}</Col>
        </Row>
      </span>
    )
  }

  return (
    <AntFooter className={footerStyles.wrapper}>
      <div className={footerStyles.footerPrimary}>
        {grid}
      </div>
    </AntFooter>
  );
}

export default Footer
