import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'

import { proxyList } from 'coinrotator-utils/variables.mjs'

let agentList
let agentListIndex = 0
const getProxyConfig = () => {
  agentList ||= proxyList.map((proxy) => {
    const agentConfig = {
      proxy,
      keepAlive: true
    };

    return {
      httpAgent: new HttpProxyAgent(agentConfig),
      httpsAgent: new HttpsProxyAgent(agentConfig),
    }
  })

  return agentList[agentListIndex++ % agentList.length]
}

export default getProxyConfig