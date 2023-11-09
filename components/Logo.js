import Link from 'next/link'
import classnames from 'classnames'

import logoStyles from '../styles/logo.module.less'

const Logo = ({ className = '', showText = true, size=24 }) => {
  return (
    <span className={classnames(logoStyles.logo, className)}>
      <a href="/" key="img">

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coin.svg" alt="Logo" height={size} width={size} className={logoStyles.svg}/>

      </a>
      { showText ? (
        <a href="/" key="title" passHref>
          <span className={logoStyles.text}><b>Coin</b>Rotator</span>
        </a>
      )
        : <></>
      }
    </span>
  );
}

export default Logo