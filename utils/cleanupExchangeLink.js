const cleanupExchangeLink = (link, baseSymbol) => {
  let cleanLink = link;

  try {
    const url = new URL(link)
    if (url.host.includes('binance')) {
      cleanLink = `${url.origin}${url.pathname}`
    } else if (url.host.includes('tokocrypto')) {
      cleanLink = link.replace(baseSymbol, `${baseSymbol}_`)
    } else if (url.host.includes('bitrue')) {
      const symbol = url.searchParams.get('symbol').replace('usdt', '')
      cleanLink = `https://www.bitrue.com/trade/${symbol}_usdt`
    }
  } catch(e) {}

  return cleanLink
}

export default cleanupExchangeLink;