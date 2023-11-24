export const getImageSlug = (largeImage) => {
  return largeImage.replace("https://assets.coingecko.com/coins/images", "")
}

export const getImageURL = (imageSlug, imageSize = 'large') => {
  imageSlug = imageSlug.replace("large", imageSize)
  return `https://assets.coingecko.com/coins/images${imageSlug}`
}