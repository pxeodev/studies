import { useContext } from 'react';
import { KeyPassContext } from '../context/KeyPassContext';

const useKeyPass = () => {
  const { hasKeyPass } = useContext(KeyPassContext);
  return hasKeyPass;
};

export default useKeyPass;