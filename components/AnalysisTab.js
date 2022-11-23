import ReactMarkdown from 'react-markdown';
import classnames from 'classnames';
import { Card } from 'antd';
import round from 'lodash/round';

import coinStyles from '../styles/coin.module.less'

const AnalysisTab = ({ coin, screens }) => {
  const notation = screens.sm ? 'standard' : 'compact'
  const percentageFromAth = (coin.ath - coin.currentPrice) / coin.ath * 100
  const percentageFromAtl = (coin.atl - coin.currentPrice) / coin.atl * 100
  const priceAppreciationToAthPercentage = (coin.ath / coin.currentPrice) * 100
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
  const interpolatedCoinDescription = (coin.description || '')
    .replaceAll('{{ath}}', preciseCurrencyFormatter.format(coin.ath))
    .replaceAll('{{atl}}', preciseCurrencyFormatter.format(coin.atl))
    .replaceAll('{{marketcap}}', currencyFormatter.format(coin.marketCap))
    .replaceAll('{{fdv}}', currencyFormatter.format(coin.fullyDilutedValuation))
    .replaceAll('{{launchprice}}', currencyFormatter.format(coin.launch_price))
    .replaceAll('{{currentprice}}', currencyFormatter.format(coin.currentPrice))
    .replaceAll('{{percentagefromath}}', `${numberFormatter.format(percentageFromAth)}%`)
    .replaceAll('{{percentagefromatl}}', `${numberFormatter.format(percentageFromAtl)}%`)
    .replaceAll('{{circulatingsupply}}', numberFormatter.format(coin.circulatingSupply))
    .replaceAll('{{percentagecirculatingsupply}}', `${numberFormatter.format(circulatingSupplyPercentage)}%`)
    .replaceAll('{{percentageoutstandingsupply}}', `${numberFormatter.format(outstandingSuppplyPercentage)}%`)
    .replaceAll('{{totalsupply}}', numberFormatter.format(coin.totalSupply))
    .replaceAll('{{maxsupply}}', numberFormatter.format(coin.maxSupply))
    .replaceAll('{{percentageappreciationtoath}}', `${numberFormatter.format(priceAppreciationToAthPercentage)}%`)
    .replaceAll('{{ranking}}', coin.marketCapRank)
    .replaceAll('{{day}}', today.getDate())
    .replaceAll('{{month}}', new Intl.DateTimeFormat([], { month: 'long' }).format(today))
    .replaceAll('{{year}}', today.getFullYear())
    .replaceAll('{{name}}', coin.name)

  return (<>
      {coin.description ? (
        <Card.Grid hoverable={false} className={classnames(coinStyles.section, coinStyles.sectionDescription)}>
            <ReactMarkdown>{interpolatedCoinDescription}</ReactMarkdown>
        </Card.Grid>
      ) : <></>}
    </>
  )
}

export default AnalysisTab;