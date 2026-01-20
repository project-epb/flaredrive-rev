import { and, eq, gt } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { sessions, users } from '../../db/schema.js'
import { cacheDelete, cacheGetJson, cachePutJson } from './cache.js'
import { isTokenHashRevoked } from './session-revocation.js'
import { getDb } from './db.js'

const COOKIE_NAME = 'flaredrive_session'

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const sha256Base64Url = async (input: string) => {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

export type SessionUser = {
  id: number
  email: string
  authorizationLevel: number
}

const SESSION_USER_CACHE_TTL_SECONDS = 30

export const getSessionUserCacheKey = (tokenHash: string) => {
  return `v1:sess-user:${tokenHash}`
}

export const invalidateSessionUserCacheByTokenHash = async (ctx: any, tokenHash: string) => {
  await cacheDelete(ctx, getSessionUserCacheKey(tokenHash))
}

export const cacheSessionUserByTokenHash = async (
  ctx: any,
  tokenHash: string,
  user: SessionUser,
  expiresAtMs: number
) => {
  const remainingSeconds = Math.floor((expiresAtMs - Date.now()) / 1000)
  const ttlSeconds = Math.max(0, Math.min(SESSION_USER_CACHE_TTL_SECONDS, remainingSeconds))
  if (ttlSeconds <= 0) return

  await cachePutJson(ctx, getSessionUserCacheKey(tokenHash), user, {
    ttlSeconds,
    // Session lookups are extremely hot; keep a slightly longer memory cache too.
    memoryTtlSeconds: Math.min(5, ttlSeconds),
  })
}

const authorizationLevelForUser = (user: { id: number; authorizationLevel: number }) => {
  // “首个用户为管理员（ID=1）”规则
  return user.id === 1 ? 3 : user.authorizationLevel
}

export const getSessionUser = async (ctx: any): Promise<SessionUser | null> => {
  const token = getCookie(ctx, COOKIE_NAME)
  if (!token) return null

  const tokenHash = await sha256Base64Url(token)
  const now = Date.now()

  // Strong-consistency check: if revoked (logout/ban), fail immediately even if KV cache is stale.
  try {
    const revoked = await isTokenHashRevoked(ctx, tokenHash)
    if (revoked) {
      await invalidateSessionUserCacheByTokenHash(ctx, tokenHash)
      return null
    }
  } catch {
    // If DO is unavailable, prefer availability over failing all authenticated requests.
  }

  const cached = await cacheGetJson<SessionUser>(ctx, getSessionUserCacheKey(tokenHash))
  if (cached && typeof cached.id === 'number' && typeof cached.email === 'string') {
    return cached
  }

  const db = getDb(ctx)

  const session = await db
    .select({
      userId: sessions.userId,
      sessionExpiresAt: sessions.expiresAt,
      userEmail: users.email,
      userAuth: users.authorizationLevel,
      userId2: users.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .get()

  if (!session) return null

  const user: SessionUser = {
    id: session.userId2,
    email: session.userEmail,
    authorizationLevel: authorizationLevelForUser({ id: session.userId2, authorizationLevel: session.userAuth }),
  }

  await cacheSessionUserByTokenHash(ctx, tokenHash, user, session.sessionExpiresAt)
  return user
}
