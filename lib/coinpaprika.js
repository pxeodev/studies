import axios from 'axios'

const coinPaprika = axios.create({
  baseURL: 'https://api.coinpaprika.com/v1/',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'Accept-Encoding': 'deflate, gzip'
  }
})

export const getCoins = () => {
  return coinPaprika.get('coins')
}

export const getCoin = (coinId) => {
  return coinPaprika.get(`coins/${coinId}`)
}