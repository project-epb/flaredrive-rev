import { defineEventHandler, readBody } from 'h3'
import { eq } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { users } from '~~/server/db/schema'
import { createId, hashPasswordPbkdf2, randomHex } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password || password.length < 8) {
    return { message: 'invalid input' }
  }

  const db = createDb(event)
  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) {
    return { message: 'email already registered' }
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

  return { ok: true }
})
