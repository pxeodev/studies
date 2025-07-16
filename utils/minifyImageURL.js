export const getImageSlug = (largeImage) => {
  return largeImage.replace("https://coin-images.coingecko.com/coins/images", "")
}

export const getImageURL = (imageSlug, imageSize = 'large') => {
  imageSlug = imageSlug.replace("large", imageSize)
  if (imageSlug === `missing_${imageSize}.png`) {
    return "/favicon-32x32.png"
  } else {
    return `https://coin-images.coingecko.com/coins/images${imageSlug}`
  }
}