import { useAccount as useNativeAccount } from 'wagmi'
import { useCookies } from 'react-cookie';

const useAccount = () => {
  const { address: nativeWalletAddress } = useNativeAccount()

  const [cookies] = useCookies(['user']);
  const telegramWalletAddress = cookies?.user?.walletAddress

  return nativeWalletAddress || telegramWalletAddress
}

export default useAccount