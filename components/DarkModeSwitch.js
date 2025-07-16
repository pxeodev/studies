import { useCallback, useEffect } from "react"
import styles from '../styles/header.module.less'

const DarkModeSwitch = ({ darkMode, setDarkMode }) => {
  const switchMode = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode])
  return (
    <div onClick={switchMode} className={styles.darkModeSwitch} >
      <span>
        {
          // eslint-disable-next-line @next/next/no-img-element
          darkMode ? <img alt="sun" src="/light_mode.svg"/> : <img alt="moon" src="/dark_mode.svg"/>
        }
      </span>
    </div>
  );
}

export default DarkModeSwitch