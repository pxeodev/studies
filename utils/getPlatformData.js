import pickBy from 'lodash/pickBy'
import toPairs from 'lodash/toPairs'
import remove from 'lodash/remove'

const getPlatformData = async (platforms, defaultPlatformName) => {
  let cleanedPlatforms = pickBy(platforms, 'length')
  cleanedPlatforms = toPairs(cleanedPlatforms)

  const defaultPlatform = remove(cleanedPlatforms, ([platformName]) => platformName === defaultPlatformName)
  if (defaultPlatform[0]) cleanedPlatforms.unshift(defaultPlatform[0])

  return cleanedPlatforms
}

export default getPlatformData