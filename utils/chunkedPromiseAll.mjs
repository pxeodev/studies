import chunk from 'lodash/chunk.js'

export default async function chunkedPromiseAll(arr, concurrency, handler) {
  const results = []
  const chunks = chunk(arr, concurrency)
  for (const ch of chunks) {
    const chunkResult = await Promise.all(
      ch.map(handler)
    )
    results.push(...chunkResult)
  }
  return results
}