import { defineEventHandler, readBody, setCookie } from 'h3'
import { eq } from 'drizzle-orm'
import { sessions, users } from '~~/server/db/schema'
import { createDb } from '~~/server/db'
import { SESSION_COOKIE, SESSION_TTL_MS } from '~~/server/utils/constants'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return { message: 'invalid input' }
  }

  const db = createDb(event)
  const user = await db.select().from(users).where(eq(users.email, email)).get()
  if (!user) {
    return { message: 'invalid credentials' }
  }

  const computed = await hashPasswordPbkdf2(password, user.passwordSalt)
  if (!timingSafeEqualHex(computed, user.passwordHash)) {
    return { message: 'invalid credentials' }
  }

  const token = randomHex(32)
  const tokenHash = await hashSha256Hex(token)
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS

  await db.insert(sessions).values({
    id: createId(),
    userId: user.id,
    tokenHash,
    loginXff: event.node.req.headers['x-forwarded-for'] as string | undefined,
    loginUa: event.node.req.headers['user-agent'] as string | undefined,
    createdAt: now,
    expiresAt,
  })

  const secure = event.node.req.headers['x-forwarded-proto'] === 'https'
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })

  return { ok: true }
})
