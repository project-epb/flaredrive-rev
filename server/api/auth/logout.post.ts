import { defineEventHandler, getCookie, setCookie } from 'h3'
import { eq } from 'drizzle-orm'
import { createDb } from '~~/server/db'
import { sessions } from '~~/server/db/schema'
import { hashSha256Hex } from '~~/server/utils/crypto'
import { SESSION_COOKIE } from '~~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, SESSION_COOKIE)

  if (token) {
    const db = createDb(event)
    const tokenHash = await hashSha256Hex(token)
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }

  const secure = event.node.req.headers['x-forwarded-proto'] === 'https'
  setCookie(event, SESSION_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })

  return { ok: true }
})
