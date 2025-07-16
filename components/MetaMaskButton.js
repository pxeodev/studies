import MetaMaskButtonWithEthereum from './MetaMaskButtonWithEthereum';

const MetaMaskButton = (props) => {
  if (typeof window === 'undefined' || !window?.ethereum) { return null; }

  return <MetaMaskButtonWithEthereum {...props} />;
}

export default MetaMaskButton