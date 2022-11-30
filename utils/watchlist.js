function getLocalStorage() {
  return JSON.parse(localStorage.getItem('watchlist'))
}

function setLocalStorage(watchlist) {
  localStorage.setItem('watchlist', JSON.stringify(watchlist))
}

export function getWatchListCoins() {
  return getLocalStorage()?.coins || []
}

export function removeFromWatchList(coinId) {
  const storedWatchlist = getLocalStorage()
  if (!storedWatchlist) {
    setLocalStorage({
      coins: []
    })
  } else {
    const newWatchlistCoins = storedWatchlist.coins.filter(coin => coin !== coinId)
    setLocalStorage({
      coins: newWatchlistCoins
    })
  }
}

export function addToWatchList(coinId) {
  const storedWatchlist = getLocalStorage()
  if (!storedWatchlist) {
    setLocalStorage({
      coins: [coinId]
    })
  } else {
    storedWatchlist.coins.push(coinId)
    setLocalStorage(storedWatchlist)
  }
}