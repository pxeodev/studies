export function deformat(numberString) {
  let originalNumber
  let cleanString = numberString.replace('$', '').replaceAll(',', '')
  if (cleanString.includes('b')) {
    cleanString = cleanString.replace('b', '')
    originalNumber = Number(cleanString) * 1000000000
  } else if (cleanString.includes('m')) {
    cleanString = cleanString.replace('m', '')
    originalNumber = Number(cleanString) * 1000000
  } else if (cleanString.includes('k')) {
    cleanString = cleanString.replace('k', '')
    originalNumber = Number(cleanString) * 1000
  } else {
    originalNumber = Number(cleanString)
  }

  return originalNumber
}