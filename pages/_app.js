import { useRouter } from 'next/router'
import Bugsnag from '@bugsnag/js'
import BugsnagPluginReact from '@bugsnag/plugin-react'

import ScreenerLayout from "../layouts/screener"
import "../styles/ant.less"

// Only start Bugsnag if it hasn't been started yet (prevents double initialization)
if (!(Bugsnag._client)) {
  Bugsnag.start({
    apiKey: process.env.NEXT_PUBLIC_BUGSNAG_API_KEY,
    plugins: [new BugsnagPluginReact()]
  })
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  pageProps.currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ScreenerLayout

  return getLayout(<Component {...pageProps} />, pageProps)
}
