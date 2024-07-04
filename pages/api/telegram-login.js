import subMinutes from 'date-fns/subMinutes';
import crypto from 'crypto'
import pick from 'lodash/pick'

import prisma from '../../lib/prisma.mjs'

const TELEGRAM_LOGIN_SECRET_KEY = Buffer.from(process.env.TELEGRAM_LOGIN_SECRET_KEY, 'utf8')
const TELEGRAM_LOGIN_IV = Buffer.from(process.env.TELEGRAM_LOGIN_IV, 'utf8')

const onSuccess = (res, user) => {
  const relevantUserData = pick(user, ['telegramId', 'telegramUserName', 'walletAddress'])
  const twentyYearsFromNow = new Date();
  twentyYearsFromNow.setFullYear(twentyYearsFromNow.getFullYear() + 20);
  res.setHeader('Set-Cookie', `user=${JSON.stringify(relevantUserData)};Expires=${twentyYearsFromNow.toUTCString()};Secure;SameSite=Strict;Path=/;`);

  res.writeHead(307, { Location: new URL('/', process.env.NEXT_PUBLIC_SITE_URL) });

  res.end();
}

const handler = async (req, res) => {
  if (req.method !== 'GET' || !req.query.signature) {
    res.status(400).send("Bad request")
    return
  }
  let signature, decryptedData, telegramId, telegramUserName, walletAddress, dateTime
  try {
    const signature = req.url.split('signature=')[1]
    const encryptedData = Buffer.from(signature, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', TELEGRAM_LOGIN_SECRET_KEY, TELEGRAM_LOGIN_IV)
    decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    decryptedData = decryptedData.toString('utf8')

    ;([telegramId, telegramUserName, walletAddress, dateTime] = decryptedData.split(':'))
    telegramId = telegramId.split('?')[1]
    telegramUserName = telegramUserName.split('?')[1]
    walletAddress = walletAddress.split('?')[1]
    dateTime = dateTime.split('?')[1]
  } catch(e) {
    console.error(e)
    console.log(signature, decryptedData)
    res.status(400).send("Bad request")
    return
  }

  if (Number(dateTime) * 1000 < subMinutes(new Date(), 1).getTime()) {
    res.status(400).send("Bad request")
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      walletAddress
    }
  })
  if (existingUser) {
    if (existingUser.telegramId === telegramId) {
      onSuccess(res, existingUser)
    } else {
      res.status(403).json({ ok: false })
      return
    }
  } else {
    const newUser = await prisma.user.create({
      data: {
        walletAddress,
        telegramId,
        telegramUserName
      }
    })
    onSuccess(res, newUser)
  }
}

export default handler