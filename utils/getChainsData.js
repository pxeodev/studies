import csv from 'csvtojson'
import url from 'url'

let chains;

const getChainsData = async () => {
  if (chains) {
    return chains
  }

  chains = await csv().fromFile('lib/ChainData.csv');
  chains = chains.map((chain) => {
    const image = getImageURL(chain.Chain_Image_URL)
    return {
      name: chain.Chain_Name,
      id: chain.Chain_ID,
      symbol: chain.Chain_Currency,
      image,
    }
  })
  return chains;
}

const getImageURL = (image) => {
  if (!image || image.length === 0) {
    return null
  }
  let imageURL = image
  try {
    const link = url.parse(image, true)
    if (link.host === 'chainlist.org' && link.query?.url) {
      imageURL = link.query.url
    }
  } catch(e) {}

  return imageURL
}

export default getChainsData