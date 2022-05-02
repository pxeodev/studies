import Link from 'next/link'
import classnames from 'classnames'

import logoStyles from '../styles/logo.module.less'

const Logo = ({ className = '' }) => {
  return (
    <span className={classnames(logoStyles.logo, className)}>
      <Link href="/" key="img">
        <a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coin.svg" alt="Logo" height={24} width={24} className={logoStyles.svg}/>
        </a>
      </Link>
      <Link href="/" key="title">
        <a>
          <span className={logoStyles.text}><b>Coin</b>Rotator</span>
        </a>
      </Link>
    </span>
  );
}

export default Logo