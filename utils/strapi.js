import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"

async function loggingFetch (input, init) {
  const body = JSON.parse(init?.body ?? '{}')

  const start = Date.now()
  console.log(`${new Date().toISOString().slice(-13)} 📡 Sending ${body.operationName} request`)
  const response = await fetch(input, init)
  console.log(`${new Date().toISOString().slice(-13)} 📡 Received ${body.operationName} response in ${Date.now() - start}ms`)

  return {
    ...response,

    async text () {
      const start = Date.now()
      const result = await response.text()
      console.log(`${new Date().toISOString().slice(-13)} ⚙️  Read ${body.operationName} response body in ${Date.now() - start}ms (${result.length} bytes)`)
      return result
    }
  }
}

const link = createHttpLink({
  uri: process.env.STRAPI_URL,
  credentials: 'same-origin',
  headers: {
    'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
  }
})

const strapi = new ApolloClient({
  cache: new InMemoryCache(),
  link
})

export default strapi