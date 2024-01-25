import ReactMarkdown from 'react-markdown';
import classnames from 'classnames';
import { Card } from 'antd';
import round from 'lodash/round';
import take from 'lodash/take';
import { useEffect } from 'react';

import coinStyles from '../styles/coin.module.less'
import ChatGPTSource from './ChatGPTSource';

const AnalysisTab = ({ coin, screens, price }) => {
  const notation = screens.sm ? 'standard' : 'compact'
  let percentageFromAth, percentageFromAtl, priceAppreciationToAthPercentage
  if (price) {
    percentageFromAth = (coin.ath - price) / coin.ath * 100
    percentageFromAtl = (coin.atl - price) / coin.atl * 100
    priceAppreciationToAthPercentage = (coin.ath / price) * 100
  }
  const today = new Date()
  let circulatingSupplyPercentage
  let outstandingSuppplyPercentage
  if (coin.circulatingSupply && coin.totalSupply) {
    circulatingSupplyPercentage = round(coin.circulatingSupply / coin.totalSupply * 100, 2)
    outstandingSuppplyPercentage = 100 - circulatingSupplyPercentage
  }
  const numberFormatter = new Intl.NumberFormat([], { notation })
  const currencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', notation })
  const preciseCurrencyFormatter = new Intl.NumberFormat([], { style: 'currency', currency: 'usd', currencyDisplay: 'symbol', maximumFractionDigits: 20, notation })
  let interpolatedCoinDescription = (coin.description || '')
    .replaceAll('{{ath}}', preciseCurrencyFormatter.format(coin.ath))
    .replaceAll('{{atl}}', preciseCurrencyFormatter.format(coin.atl))
    .replaceAll('{{marketcap}}', currencyFormatter.format(coin.marketCap))
    .replaceAll('{{fdv}}', currencyFormatter.format(coin.fullyDilutedValuation))
    .replaceAll('{{launchprice}}', currencyFormatter.format(coin.launch_price))
    .replaceAll('{{circulatingsupply}}', numberFormatter.format(coin.circulatingSupply))
    .replaceAll('{{percentagecirculatingsupply}}', `${numberFormatter.format(circulatingSupplyPercentage)}%`)
    .replaceAll('{{percentageoutstandingsupply}}', `${numberFormatter.format(outstandingSuppplyPercentage)}%`)
    .replaceAll('{{totalsupply}}', numberFormatter.format(coin.totalSupply))
    .replaceAll('{{maxsupply}}', numberFormatter.format(coin.maxSupply))
    .replaceAll('{{ranking}}', coin.marketCapRank)
    .replaceAll('{{day}}', today.getDate())
    .replaceAll('{{month}}', new Intl.DateTimeFormat([], { month: 'long' }).format(today))
    .replaceAll('{{year}}', today.getFullYear())
    .replaceAll('{{name}}', coin.name)

    if (percentageFromAth) {
      interpolatedCoinDescription = interpolatedCoinDescription.replaceAll('{{percentagefromath}}', `${numberFormatter.format(percentageFromAth)}%`)
    }
    if (percentageFromAtl) {
      interpolatedCoinDescription = interpolatedCoinDescription.replaceAll('{{percentagefromatl}}', `${numberFormatter.format(percentageFromAtl)}%`)
    }
    if (priceAppreciationToAthPercentage) {
      interpolatedCoinDescription = interpolatedCoinDescription.replaceAll('{{priceappreciationtoathpercentage}}', `${numberFormatter.format(priceAppreciationToAthPercentage)}%`)
    }
    if (price) {
      interpolatedCoinDescription = interpolatedCoinDescription.replaceAll('{{currentprice}}', currencyFormatter.format(price))
    }

    const preventCopy = (event) => {
      let selection = window.getSelection().toString();
      selection = selection.split(' ').map((piece) => {
        if (Math.random() * 100 < 6) {
          let interference = window.location.href
          const moreRandom = Math.random() * 100
          if (moreRandom < 20) {
            interference = Math.random().toString(36).slice(2)
          } else if (moreRandom < 40) {
            interference = take([';', '.', '?', '\,'], 1)[0]
          }
          piece = `${piece} ${interference} `
        }
        return piece;
      }).join(' ')

      selection = `${selection}\nCopyright ${new Date().getFullYear()} CoinRotator. All rights reserved`
      selection = `${selection}\nThe source of this text is ${window.location.href}`

      event.clipboardData.setData('text/plain', selection);
      event.preventDefault();
    }
    useEffect(() => {
      document.addEventListener('copy', preventCopy)
      return () => {
        document.removeEventListener('copy', preventCopy)
      }
    }, [])

  return (<>
      {coin.description ? (
        <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionDescription)}>
            <ReactMarkdown>{interpolatedCoinDescription}</ReactMarkdown>
            <ChatGPTSource />
        </Card.Grid>
      ) : <></>}
    </>
  )
}

export default AnalysisTab;