import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import type { HonoEnv } from '../env.js'
import { createDb } from '../db/index.js'
import { sessions, users } from '../db/schema.js'
import { createId, hashPasswordPbkdf2, hashSha256Hex, randomHex, timingSafeEqualHex } from '../utils/crypto.js'

export const authRouter = new Hono<HonoEnv>()

const SESSION_COOKIE = 'fd_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

authRouter.post('/register', async (c) => {
  const payload = await c.req.json().catch(() => null)
  if (!payload || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    return c.json({ message: 'invalid payload' }, 400)
  }

  const email = payload.email.trim().toLowerCase()
  const password = payload.password

  if (!email || password.length < 8) {
    return c.json({ message: 'invalid email or password' }, 400)
  }

  const db = createDb(c.env)
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    return c.json({ message: 'email already registered' }, 409)
  }

  const salt = randomHex(16)
  const passwordHash = await hashPasswordPbkdf2(password, salt)
  const userId = createId()
  const now = Date.now()

  await db.insert(users).values({
    id: userId,
    email,
    passwordSalt: salt,
    passwordHash,
    authorizationLevel: 1,
    createdAt: now,
  })

  return c.json({ ok: true })
})

authRouter.post('/login', async (c) => {
  const payload = await c.req.json().catch(() => null)
  if (!payload || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
    return c.json({ message: 'invalid payload' }, 400)
  }

  const email = payload.email.trim().toLowerCase()
  const password = payload.password
  const db = createDb(c.env)
  const user = await db.select().from(users).where(eq(users.email, email)).get()
  if (!user) {
    return c.json({ message: 'invalid credentials' }, 401)
  }

  const computed = await hashPasswordPbkdf2(password, user.passwordSalt)
  if (!timingSafeEqualHex(computed, user.passwordHash)) {
    return c.json({ message: 'invalid credentials' }, 401)
  }

  const token = randomHex(32)
  const tokenHash = await hashSha256Hex(token)
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS
  const sessionId = createId()

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash,
    loginXff: c.req.header('x-forwarded-for') ?? null,
    loginUa: c.req.header('user-agent') ?? null,
    createdAt: now,
    expiresAt,
  })

  const secure = c.req.url.startsWith('https://')
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })

  return c.json({ ok: true })
})

authRouter.get('/me', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) {
    return c.json({ message: 'unauthorized' }, 401)
  }

  const tokenHash = await hashSha256Hex(token)
  const db = createDb(c.env)
  const session = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get()
  if (!session || session.expiresAt < Date.now()) {
    return c.json({ message: 'unauthorized' }, 401)
  }

  const user = await db.select().from(users).where(eq(users.id, session.userId)).get()
  if (!user) {
    return c.json({ message: 'unauthorized' }, 401)
  }

  return c.json({
    id: user.id,
    email: user.email,
    authorizationLevel: user.authorizationLevel,
  })
})
