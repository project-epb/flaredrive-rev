import type { H3Event } from 'h3'
import { getCookie } from 'h3'
import { eq, and, gt } from 'drizzle-orm'
import { createDb } from '../db'
import { sessions, users } from '../db/schema'
import { SESSION_COOKIE } from './constants'

export interface AuthUser {
  id: string
  email: string
  authorizationLevel: number
}

export const getAuthUser = async (event: H3Event): Promise<AuthUser | null> => {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const tokenHash = await hashSha256Hex(token)
  const now = Date.now()
  const db = createDb(event)

  const session = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .get()

  if (!session) return null

  const user = await db.select().from(users).where(eq(users.id, session.userId)).get()

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    authorizationLevel: user.authorizationLevel,
  }
}

export const requireAuth = async (event: H3Event): Promise<AuthUser> => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
  return user
}
