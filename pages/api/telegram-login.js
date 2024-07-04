import subMinutes from 'date-fns/subMinutes';
import crypto from 'crypto'

import prisma from '../../lib/prisma.mjs'

const TELEGRAM_LOGIN_SECRET_KEY = Buffer.from(process.env.TELEGRAM_LOGIN_SECRET_KEY, 'utf8')
const TELEGRAM_LOGIN_IV = Buffer.from(process.env.TELEGRAM_LOGIN_IV, 'utf8')

const onSuccess = (req, res, user) => {
  // TODO: Set the cookies and redirect to the dashboard

  // Hard to prevent session hijacking, let's not prevent that
  // But we need to prevent XSS
  // So perhaps we do need to call a login api every time
  // is that scalable within Vercel though? -> Check usage
  // If that's not scalable, we should just store this tg login in session storage and call it a day?
  // Or should we setup another service for this?

  // Perhaps this also combines with the scalability of the websocket server

  // Perhaps this is the same research at the end of the day...

  // TODO: Oh yeah, and redirect the user properly. Do this AFTER the research above
  res.status(200).json({ user })
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

  if (Number(dateTime) * 1000 < subMinutes(new Date(), 10).getTime()) {
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
      onSuccess(req, res, existingUser)
      return
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
    onSuccess(req, res, newUser)
    return
  }
}

export default handler