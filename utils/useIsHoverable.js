import { useState, useEffect } from 'react';

const useIsHoverable = () => {
  let [isHoverable, setIsHoverable] = useState(true);
  useEffect(() => {
    setIsHoverable(!window.matchMedia( "(hover: none)" ).matches)
  }, [setIsHoverable])

  return isHoverable
}

export default useIsHoverable