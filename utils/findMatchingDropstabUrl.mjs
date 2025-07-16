import isDropstabDiscrepancy from './isDropstabDiscrepancy.mjs';

const baseUrl = 'https://dropstab.com/coins/';

const findMatchingDropstabUrl = async (coin) => {
  let url = baseUrl + coin.id
  // Check if this id is an anomaly. In that case, we need to find the matching coin URL by CSV
  const dropstabId = await isDropstabDiscrepancy(coin.id);

  if (dropstabId) {
    url = baseUrl + dropstabId
  }

  return url;
}

export default findMatchingDropstabUrl;