export function hasPlatforms(platforms) {
  const platformKeys = Object.keys(platforms);
  return platformKeys?.length && !(platformKeys.length === 1 && platformKeys[0] === '');
}