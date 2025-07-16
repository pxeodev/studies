import { useState, useEffect } from 'react';

const useDarkMode = () => {
    const [darkMode, setDarkMode] = useState(false);
    const darkModeCheck = (e) => { e.matches ? setDarkMode(true) : setDarkMode(false); }
    useEffect(() => {
        let initialMode = false;
        if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initialMode = true;
        }
        setDarkMode(initialMode);
        if (window.matchMedia) {
            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            try {
                darkMediaQuery.addEventListener('change', darkModeCheck);
            } catch(e) {
                // Safari
                darkMediaQuery.addListener(darkModeCheck);
            }

            return () => {
            try {
                darkMediaQuery.removeEventListener('change', darkModeCheck);
            } catch(e) {
                // Safari
                darkMediaQuery.removeListener(darkModeCheck);
            }
            }
        }
    }, []);

    return [darkMode, setDarkMode];
}

export default useDarkMode;