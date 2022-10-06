import { useCallback, useEffect } from "react"
import styles from '../styles/header.module.less'

const DarkModeSwitch = ({ darkMode, setDarkMode }) => {
  const switchMode = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode])
  useEffect(() => {
    const html = document.querySelector('html');
    html.dataset.theme = darkMode ? 'theme-dark' : 'theme-light';
  }, [darkMode])
  return (
    <div onClick={switchMode} className={styles.darkModeSwitch} >
      <span>
        {
          // eslint-disable-next-line @next/next/no-img-element
          darkMode ? <><img alt="sun" src="/light_mode.svg"/><span>Light</span></> : <><img alt="sun" src="/dark_mode.svg"/><span>Dark</span></>
        }
      </span>
    </div>
  );
}

export default DarkModeSwitch