import { useRouter } from 'next/router'

import ScreenerLayout from "../layouts/screener"
import "../styles/ant.less"

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  pageProps.currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ScreenerLayout

  return getLayout(<Component {...pageProps} />, pageProps)
}
