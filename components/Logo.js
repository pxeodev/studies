import Link from 'next/link'
import classnames from 'classnames'

import logoStyles from '../styles/logo.module.less'

const Logo = ({ className = '' }) => {
  return (
    <span className={classnames(logoStyles.logo, className)}>
      <Link href="/" key="img">

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coin.svg" alt="Logo" height={24} width={24} className={logoStyles.svg}/>

      </Link>
      <Link href="/" key="title">
        <span className={logoStyles.text}><b>Coin</b>Rotator</span>
      </Link>
    </span>
  );
}

export default Logo