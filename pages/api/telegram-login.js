import subMinutes from 'date-fns/subMinutes';
import pick from 'lodash/pick'

import sql from '../../lib/database.mjs'
import decrypt from '../../utils/decrypt.js'

const onSuccess = (res, user) => {
  const relevantUserData = pick(user, ['telegramId', 'telegramUserName', 'walletAddress'])
  let twentyYearsFromNow = new Date();
  twentyYearsFromNow.setFullYear(twentyYearsFromNow.getFullYear() + 20);
  twentyYearsFromNow = twentyYearsFromNow.toUTCString();
  res.setHeader('Set-Cookie', `user=${JSON.stringify(relevantUserData)};Expires=${twentyYearsFromNow};Secure;SameSite=Strict;Path=/;`);

  redirectToMainSite(res)
}

const redirectToMainSite = (res) => {
  res.writeHead(307, { Location: new URL(process.env.NEXT_PUBLIC_SITE_URL) });
  res.end();
}

const handler = async (req, res) => {
  if (req.method !== 'GET' || !req.query.signature) {
    redirectToMainSite(res)
    return
  }
  let signature, decryptedData, telegramId, telegramUserName, walletAddress, dateTime
  try {
    signature = req.url.split('signature=')[1]
    signature = signature.replace(/%20/g, '+').replace(/%3D/g, '=')
    signature = Buffer.from(signature, 'base64').toString()
    decryptedData = decrypt(signature, process.env.TELEGRAM_LOGIN_SECRET_KEY, process.env.TELEGRAM_LOGIN_IV)

    ;([telegramId, telegramUserName, walletAddress, dateTime] = decryptedData.split(':'))
    telegramId = telegramId.split('?')[1]
    telegramUserName = telegramUserName.split('?')[1]
    walletAddress = walletAddress.split('?')[1]
    dateTime = dateTime.split('?')[1]
  } catch(e) {
    console.error(e)
    console.log(req.url)
    console.log(signature, decryptedData)
    redirectToMainSite(res)
    return
  }

  if (Number(dateTime) * 1000 < subMinutes(new Date(), 1).getTime()) {
    console.log(dateTime)
    redirectToMainSite(res)
    return
  }

  const existingUser = (await sql`SELECT * FROM "User" WHERE walletAddress = ${walletAddress}`)[0]
  if (existingUser) {
    if (existingUser.telegramId === telegramId) {
      onSuccess(res, existingUser)
    } else {
      redirectToMainSite(res)
      return
    }
  } else {
    const newUser = (await sql`INSERT INTO "User" (walletAddress, telegramId, telegramUserName) VALUES (${walletAddress}, ${telegramId}, ${telegramUserName}) RETURNING *`)[0]
    onSuccess(res, newUser)
  }
}

export default handler