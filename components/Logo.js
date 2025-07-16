import Link from 'next/link'
import classnames from 'classnames'

import logoStyles from '../styles/logo.module.less'

const Logo = ({ className = '', showText = true, size=24 }) => {
  return (
    <span className={classnames(logoStyles.logo, className)}>
      <Link href="/" key="img">

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coin.svg" alt="Logo" height={size} width={size} className={logoStyles.svg}/>

      </Link>
      { showText ? (
        <Link href="/" key="title" passHref>
          <span className={logoStyles.text}><b>Coin</b>Rotator</span>
        </Link>
      )
        : <></>
      }
    </span>
  );
}

export default Logo