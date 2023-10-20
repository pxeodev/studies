import { gql } from '@urql/core'

import strapi from './strapi.js'

function addTemplateDescription(description, coin) {
  return `${description}

## {{name}} Price Analysis

${coin.marketCap ? 'As of {{month}} {{day}} {{year}} {{name}} has a marketcap of {{marketcap}}. ' : ''}
${coin.ath ? 'This is {{percentagefromath}} from its all time high of {{ath}}. ' : ''}
${coin.totalSupply ? `In terms of its tokenomics, there's a total supply of {{totalsupply}} with {{percentagecirculatingsupply}} currently outstanding. ` : ''}
${coin.fullyDilutedValuation ? 'Keep in mind {{name}} has a fully diluted value of {{fdv}} which many investors might interpret as overvalued. ' : ''}
${coin.launch_price ? 'Be wary as insiders are still up from its launch price of {{launchprice}}. ' : ''}
Of course, don’t trust price predictions alone, always check the Coinrotator token screener to follow the trending market.`
}

export async function getDescriptionByCoin(coin) {
  const { data } = await strapi.query(
    gql`
      query Coins($slug: String) {
        coins(filters: {slug: {eq: $slug}}) {
          data {
            attributes {
              name
              symbol
              description
              isArticle
            }
          }
        }
      }
    `,
    {
      slug: coin.id,
    }
  )
  const coinData = data.coins.data[0]

  let description
  if (coinData) {
    description = coinData.attributes.description
    if (coinData.attributes.isArticle !== 'yes') {
      description = addTemplateDescription(description, coin)
    }
  } else {
    description = addTemplateDescription(coin.description, coin)
  }
  return description;
}