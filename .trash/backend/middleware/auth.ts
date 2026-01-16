import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { eq } from 'drizzle-orm'
import type { HonoEnv } from '../env.js'
import { createDb } from '../db/index.js'
import { sessions, users } from '../db/schema.js'
import { hashSha256Hex } from '../utils/crypto.js'

const SESSION_COOKIE = 'fd_session'

export interface AuthUser {
  id: string
  email: string
  authorizationLevel: number
}

declare module 'hono' {
  interface ContextVariableMap {
    user?: AuthUser
  }
}

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
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

  c.set('user', {
    id: user.id,
    email: user.email,
    authorizationLevel: user.authorizationLevel,
  })

  await next()
})

export const optionalAuthMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) {
    await next()
    return
  }

  try {
    const tokenHash = await hashSha256Hex(token)
    const db = createDb(c.env)
    const session = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get()
    if (session && session.expiresAt >= Date.now()) {
      const user = await db.select().from(users).where(eq(users.id, session.userId)).get()
      if (user) {
        c.set('user', {
          id: user.id,
          email: user.email,
          authorizationLevel: user.authorizationLevel,
        })
      }
    }
  } catch (e) {
    // 忽略错误，继续处理请求
  }

  await next()
})
