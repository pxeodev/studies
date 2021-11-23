import { useCallback } from "react"
import styles from '../styles/globals.module.css'

const DarkModeSwitch = ({ darkMode, setDarkMode }) => {
  const switchMode = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode])
  return (
    <span className={styles.darkMode} onClick={switchMode}>{darkMode ? 'Dark' : 'Light'}</span>
  );
}

export default DarkModeSwitch