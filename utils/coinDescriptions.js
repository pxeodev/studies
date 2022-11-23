import csv from 'csvtojson'

let data;

function addTemplateDescription(description, coin) {
  return `${description}

## {{name}} Price Analysis

${coin.marketCap ? 'As of {{month}} {{day}} {{year}} {{name}} has a marketcap of {{marketcap}}. ' : ''}
${coin.ath ? 'This is {{percentagefromath}} from its all time high of {{ath}}. ' : ''}
${coin.totalSupply ? 'In terms of its tokenomics, with a total supply of {{totalsupply}} with {{percentagecirculatingsupply}} outstanding. ' : ''}
${coin.fullyDilutedValuation ? 'Keep in mind {{name}} has a fully diluted value of {{fdv}} which many investors might interpret as overvalued. ' : ''}
${coin.launch_price ? 'Be wary as insiders are still up from its launch price of {{launchprice}}. ' : ''}
Of course, don’t trust price predictions alone, always check the Coinrotator token screener to follow the trending market.`
}

export async function getDescriptionByCoin(coin) {
  data ||= await csv().fromFile('lib/CoinDescription.csv');
  const descriptionRow = data.find(description => description.Symbol.toLowerCase() === coin.symbol)

  let description
  if (descriptionRow) {
    description = descriptionRow.Description
    if (descriptionRow.Article !== 'yes') {
      description = addTemplateDescription(description, coin)
    }
  } else {
    description = addTemplateDescription(coin.description, coin)
  }
  return description;
}