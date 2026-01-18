import { and, eq, gt } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { sessions, users } from '../../db/schema.js'
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

const authorizationLevelForUser = (user: { id: number; authorizationLevel: number }) => {
  // “首个用户为管理员（ID=1）”规则
  return user.id === 1 ? 3 : user.authorizationLevel
}

export const getSessionUser = async (ctx: any): Promise<SessionUser | null> => {
  const token = getCookie(ctx, COOKIE_NAME)
  if (!token) return null

  const db = getDb(ctx)
  const tokenHash = await sha256Base64Url(token)
  const now = Date.now()

  const session = await db
    .select({
      userId: sessions.userId,
      userEmail: users.email,
      userAuth: users.authorizationLevel,
      userId2: users.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .get()

  if (!session) return null

  return {
    id: session.userId2,
    email: session.userEmail,
    authorizationLevel: authorizationLevelForUser({ id: session.userId2, authorizationLevel: session.userAuth }),
  }
}
