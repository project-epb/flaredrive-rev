import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { users, sessions } from '../../db/schema.js'
import type { HonoEnv } from '../index.js'
import { getDb } from '../utils/db.js'
import { cacheSessionUserByTokenHash, getSessionUser, invalidateSessionUserCacheByTokenHash } from '../utils/session.js'
import { readEnvVars } from '../utils/readCtxEnv.js'
import { getResolvedPublicSiteSettings } from '../utils/site-settings.js'
import { revokeTokenHash } from '../utils/session-revocation.js'

const COOKIE_NAME = 'flaredrive_session'
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30

const getAdminCreateToken = (ctx: any) => {
  const raw = readEnvVars(ctx, 'ADMIN_CREATE_TOKEN')
  return typeof raw === 'string' ? raw.trim() : ''
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const isValidEmail = (email: string) => {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const isValidPassword = (password: string) => {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlDecode = (value: string) => {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const sha256Base64Url = async (input: string) => {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const hashPassword = async (password: string, saltB64Url?: string) => {
  const iterations = 100_000
  const salt = saltB64Url ? base64UrlDecode(saltB64Url) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  const hash = new Uint8Array(bits)
  return {
    passwordSalt: base64UrlEncode(salt),
    passwordHash: `pbkdf2:sha256:${iterations}:${base64UrlEncode(hash)}`,
  }
}

const verifyPassword = async (password: string, passwordSalt: string, storedPasswordHash: string) => {
  const [algo, hashName, iterationsStr, hashB64Url] = storedPasswordHash.split(':')
  if (algo !== 'pbkdf2' || hashName !== 'sha256') return false
  const iterations = Number(iterationsStr)
  if (!Number.isFinite(iterations) || iterations <= 0) return false

  const salt = base64UrlDecode(passwordSalt)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  const computed = new Uint8Array(bits)
  const stored = base64UrlDecode(hashB64Url)
  return timingSafeEqual(computed, stored)
}

const getRequestIp = (ctx: any) => {
  return ctx.req.header('x-forwarded-for') || ctx.req.header('cf-connecting-ip') || null
}

const getUserAgent = (ctx: any) => {
  return ctx.req.header('user-agent') || null
}

const isSecureRequest = (ctx: any) => {
  try {
    return new URL(ctx.req.url).protocol === 'https:'
  } catch {
    return false
  }
}

const authorizationLevelForUser = (user: { id: number; authorizationLevel: number }) => {
  // “首个用户为管理员（ID=1）”规则：即使数据库字段不是 3，也视为管理员
  return user.id === 1 ? 3 : user.authorizationLevel
}

export const auth = new Hono<HonoEnv>()

auth.post('/register', async (ctx) => {
  const allowRegister = (await getResolvedPublicSiteSettings(ctx)).allowRegister
  if (!allowRegister) {
    return ctx.json({ error: 'Registration disabled' }, 403)
  }

  const body = await ctx.req.json().catch(() => null)
  const email = normalizeEmail(body?.email || '')
  const password = body?.password || ''

  if (!isValidEmail(email)) return ctx.json({ error: 'Invalid email' }, 400)
  if (!isValidPassword(password)) return ctx.json({ error: 'Invalid password' }, 400)

  const db = getDb(ctx)
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) return ctx.json({ error: 'Email already registered' }, 409)

  const now = Date.now()
  const { passwordSalt, passwordHash } = await hashPassword(password)

  // 先插入用户（authorizationLevel 默认 1）
  await db
    .insert(users)
    .values({
      email,
      passwordSalt,
      passwordHash,
      createdAt: now,
    })
    .run()

  const created = await db
    .select({ id: users.id, email: users.email, authorizationLevel: users.authorizationLevel })
    .from(users)
    .where(eq(users.email, email))
    .get()

  if (!created) return ctx.json({ error: 'Failed to create user' }, 500)

  // 如果是首个用户，则固化为 admin（同时 auth 判定也会强制 id=1 为 admin）
  if (created.id === 1) {
    await db.update(users).set({ authorizationLevel: 3 }).where(eq(users.id, 1)).run()
  }

  return ctx.json({ id: created.id, email: created.email }, 201)
})

auth.post('/admin-create', async (ctx) => {
  const adminToken = getAdminCreateToken(ctx)
  if (!adminToken) return ctx.json({ error: 'Admin create disabled' }, 403)

  const headerToken = ctx.req.header('x-admin-token') || ''
  const bearer = ctx.req.header('authorization') || ''
  const bearerToken = bearer.replace(/^Bearer\s+/i, '')
  const providedToken = headerToken || bearerToken

  if (!providedToken || providedToken !== adminToken) {
    return ctx.json({ error: 'Forbidden' }, 403)
  }

  const body = await ctx.req.json().catch(() => null)
  const email = normalizeEmail(body?.email || '')
  const password = body?.password || ''
  const authorizationLevel = Number(body?.authorizationLevel ?? 1)

  if (!isValidEmail(email)) return ctx.json({ error: 'Invalid email' }, 400)
  if (!isValidPassword(password)) return ctx.json({ error: 'Invalid password' }, 400)
  if (![1, 2, 3].includes(authorizationLevel)) {
    return ctx.json({ error: 'Invalid authorization level' }, 400)
  }

  const db = getDb(ctx)
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) return ctx.json({ error: 'Email already registered' }, 409)

  const now = Date.now()
  const { passwordSalt, passwordHash } = await hashPassword(password)

  await db
    .insert(users)
    .values({
      email,
      passwordSalt,
      passwordHash,
      authorizationLevel,
      createdAt: now,
    })
    .run()

  const created = await db
    .select({ id: users.id, email: users.email, authorizationLevel: users.authorizationLevel })
    .from(users)
    .where(eq(users.email, email))
    .get()

  if (!created) return ctx.json({ error: 'Failed to create user' }, 500)

  if (created.id === 1) {
    await db.update(users).set({ authorizationLevel: 3 }).where(eq(users.id, 1)).run()
  }

  return ctx.json({ id: created.id, email: created.email, authorizationLevel: created.authorizationLevel }, 201)
})

auth.post('/login', async (ctx) => {
  const body = await ctx.req.json().catch(() => null)
  const email = normalizeEmail(body?.email || '')
  const password = body?.password || ''

  if (!isValidEmail(email)) return ctx.json({ error: 'Invalid email' }, 400)
  if (!isValidPassword(password)) return ctx.json({ error: 'Invalid password' }, 400)

  const db = getDb(ctx)
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      passwordSalt: users.passwordSalt,
      passwordHash: users.passwordHash,
      authorizationLevel: users.authorizationLevel,
    })
    .from(users)
    .where(eq(users.email, email))
    .get()

  if (!user) return ctx.json({ error: 'Invalid email or password' }, 401)

  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash)
  if (!ok) return ctx.json({ error: 'Invalid email or password' }, 401)

  const token = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))
  const tokenHash = await sha256Base64Url(token)
  const now = Date.now()
  const expiresAt = now + SESSION_MAX_AGE_SEC * 1000

  await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash,
      loginXff: getRequestIp(ctx),
      loginUa: getUserAgent(ctx),
      createdAt: now,
      expiresAt,
    })
    .run()

  // Best-effort prewarm: avoids an immediate D1 lookup on the first authenticated request.
  await cacheSessionUserByTokenHash(
    ctx,
    tokenHash,
    {
      id: user.id,
      email: user.email,
      authorizationLevel: authorizationLevelForUser({ id: user.id, authorizationLevel: user.authorizationLevel }),
    },
    expiresAt
  )

  setCookie(ctx, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureRequest(ctx),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  })

  return ctx.json({ ok: true })
})

auth.post('/logout', async (ctx) => {
  const token = getCookie(ctx, COOKIE_NAME)
  if (token) {
    const db = getDb(ctx)
    const tokenHash = await sha256Base64Url(token)

    const row = await db
      .select({ expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .get()
    const revokeUntil = row?.expiresAt ?? Date.now() + SESSION_MAX_AGE_SEC * 1000

    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run()
    await invalidateSessionUserCacheByTokenHash(ctx, tokenHash)

    // Strong-consistency revoke (covers KV eventual consistency window).
    await revokeTokenHash(ctx, tokenHash, revokeUntil)
  }

  deleteCookie(ctx, COOKIE_NAME, { path: '/' })
  return ctx.json({ ok: true })
})

auth.get('/me', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) {
    setCookie(ctx, COOKIE_NAME, '', { path: '/' })
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  return ctx.json(user)
})
