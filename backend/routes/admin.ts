import { Hono } from 'hono'
import { eq, inArray, sql, desc } from 'drizzle-orm'
import type { HonoEnv } from '../index.js'
import { getDb } from '../utils/db.js'
import { getSessionUser } from '../utils/session.js'
import { buckets, pathMetadata, sessions, uploadHistory, users } from '../../db/schema.js'
import {
  SITE_SETTINGS,
  getSiteSettingsBatch,
  invalidateResolvedPublicSiteSettingsCache,
  setSiteSettingsBatch,
} from '../utils/site-settings.js'
import { revokeTokenHash } from '../utils/session-revocation.js'

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

const requireAdmin = async (ctx: any) => {
  const user = await getSessionUser(ctx)
  if (!user) return { ok: false, response: ctx.json({ error: 'Unauthorized' }, 401) }
  if (user.authorizationLevel < 3) return { ok: false, response: ctx.json({ error: 'Forbidden' }, 403) }
  return { ok: true, user }
}

export const admin = new Hono<HonoEnv>()

admin.get('/settings', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const resolved = await getSiteSettingsBatch(ctx, {
    siteName: SITE_SETTINGS.siteName,
    allowRegister: SITE_SETTINGS.allowRegister,
    randomUploadDir: SITE_SETTINGS.randomUploadDir,
    batchUploadConcurrency: SITE_SETTINGS.batchUploadConcurrency,
    uploadHistoryLimit: SITE_SETTINGS.uploadHistoryLimit,
    previewSizeLimitText: SITE_SETTINGS.previewSizeLimitText,
  })

  return ctx.json(resolved)
})

admin.put('/settings', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const body = await ctx.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return ctx.json({ error: 'Invalid payload' }, 400)

  const updates: Array<{ def: any; value: any | null }> = []

  if ('siteName' in body) {
    const v = (body as any).siteName
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.siteName, value: null })
    } else {
      const name = String(v ?? '').trim()
      if (!name || name.length > 64) return ctx.json({ error: 'Invalid siteName' }, 400)
      updates.push({ def: SITE_SETTINGS.siteName, value: name })
    }
  }

  if ('allowRegister' in body) {
    const v = (body as any).allowRegister
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.allowRegister, value: null })
    } else if (typeof v === 'boolean') {
      updates.push({ def: SITE_SETTINGS.allowRegister, value: v })
    } else {
      return ctx.json({ error: 'Invalid allowRegister' }, 400)
    }
  }

  if ('randomUploadDir' in body) {
    const v = (body as any).randomUploadDir
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.randomUploadDir, value: null })
    } else {
      let dir = String(v ?? '').trim()
      if (!dir || dir === '/') {
        dir = ''
      } else {
        dir = dir.replace(/^\/+/, '')
        if (dir && !dir.endsWith('/')) dir += '/'
      }
      if (dir.length > 256) return ctx.json({ error: 'Invalid randomUploadDir' }, 400)
      updates.push({ def: SITE_SETTINGS.randomUploadDir, value: dir })
    }
  }

  if ('batchUploadConcurrency' in body) {
    const v = (body as any).batchUploadConcurrency
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.batchUploadConcurrency, value: null })
    } else {
      const n = Number(v)
      if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > 64) {
        return ctx.json({ error: 'Invalid batchUploadConcurrency' }, 400)
      }
      updates.push({ def: SITE_SETTINGS.batchUploadConcurrency, value: n })
    }
  }

  if ('uploadHistoryLimit' in body) {
    const v = (body as any).uploadHistoryLimit
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.uploadHistoryLimit, value: null })
    } else {
      const n = Number(v)
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100_000) {
        return ctx.json({ error: 'Invalid uploadHistoryLimit' }, 400)
      }
      updates.push({ def: SITE_SETTINGS.uploadHistoryLimit, value: n })
    }
  }

  if ('previewSizeLimitText' in body) {
    const v = (body as any).previewSizeLimitText
    if (v === null) {
      updates.push({ def: SITE_SETTINGS.previewSizeLimitText, value: null })
    } else {
      const n = Number(v)
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 1024 * 1024 * 1024) {
        return ctx.json({ error: 'Invalid previewSizeLimitText' }, 400)
      }
      updates.push({ def: SITE_SETTINGS.previewSizeLimitText, value: n })
    }
  }

  await setSiteSettingsBatch(ctx, updates)
  await invalidateResolvedPublicSiteSettingsCache(ctx)

  // Return resolved values after update
  const resolved = await getSiteSettingsBatch(ctx, {
    siteName: SITE_SETTINGS.siteName,
    allowRegister: SITE_SETTINGS.allowRegister,
    randomUploadDir: SITE_SETTINGS.randomUploadDir,
    batchUploadConcurrency: SITE_SETTINGS.batchUploadConcurrency,
    uploadHistoryLimit: SITE_SETTINGS.uploadHistoryLimit,
    previewSizeLimitText: SITE_SETTINGS.previewSizeLimitText,
  })

  return ctx.json({ ok: true, ...resolved })
})

admin.get('/users', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const db = getDb(ctx)
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      authorizationLevel: users.authorizationLevel,
      createdAt: users.createdAt,
      bucketCount: sql<number>`count(${buckets.id})`.as('bucketCount'),
    })
    .from(users)
    .leftJoin(buckets, eq(users.id, buckets.ownerUserId))
    .groupBy(users.id)
    .orderBy(desc(users.id))
    .all()

  return ctx.json(rows)
})

admin.post('/users', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const body = await ctx.req.json().catch(() => null)
  const email = (body?.email || '').toString().trim().toLowerCase()
  const password = (body?.password || '').toString()
  const authorizationLevel = Number(body?.authorizationLevel ?? 1)

  if (!isValidEmail(email)) return ctx.json({ error: 'Invalid email' }, 400)
  if (!isValidPassword(password)) return ctx.json({ error: 'Invalid password' }, 400)
  if (![1, 2, 3].includes(authorizationLevel)) return ctx.json({ error: 'Invalid authorization level' }, 400)

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

admin.patch('/users/:id', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const targetId = Number(ctx.req.param('id'))
  if (!Number.isFinite(targetId) || targetId <= 0) return ctx.json({ error: 'Invalid user id' }, 400)

  const body = await ctx.req.json().catch(() => null)
  const authorizationLevel = Number(body?.authorizationLevel)
  if (![1, 2, 3].includes(authorizationLevel)) return ctx.json({ error: 'Invalid authorization level' }, 400)

  if (targetId === 1 && authorizationLevel !== 3) {
    return ctx.json({ error: 'Primary admin must stay at level 3' }, 400)
  }

  const db = getDb(ctx)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).get()
  if (!existing) return ctx.json({ error: 'User not found' }, 404)

  await db.update(users).set({ authorizationLevel }).where(eq(users.id, targetId)).run()

  return ctx.json({ ok: true })
})

admin.delete('/users/:id', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const targetId = Number(ctx.req.param('id'))
  if (!Number.isFinite(targetId) || targetId <= 0) return ctx.json({ error: 'Invalid user id' }, 400)

  if (targetId === adminUser.user.id) return ctx.json({ error: 'Cannot delete yourself' }, 400)
  if (targetId === 1) return ctx.json({ error: 'Cannot delete primary admin' }, 400)

  const db = getDb(ctx)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).get()
  if (!existing) return ctx.json({ error: 'User not found' }, 404)

  const ownedBuckets = await db.select({ id: buckets.id }).from(buckets).where(eq(buckets.ownerUserId, targetId)).all()
  const bucketIds = ownedBuckets.map((item) => item.id)

  if (bucketIds.length > 0) {
    await db.delete(pathMetadata).where(inArray(pathMetadata.bucketId, bucketIds)).run()
    await db.delete(uploadHistory).where(inArray(uploadHistory.bucketId, bucketIds)).run()
  }

  await db.delete(buckets).where(eq(buckets.ownerUserId, targetId)).run()
  await db.delete(uploadHistory).where(eq(uploadHistory.userId, targetId)).run()

  // Strong-consistency: revoke all existing sessions immediately.
  const userSessions = await db
    .select({ tokenHash: sessions.tokenHash, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.userId, targetId))
    .all()

  await Promise.all(userSessions.map((s) => revokeTokenHash(ctx, s.tokenHash, s.expiresAt)))

  await db.delete(sessions).where(eq(sessions.userId, targetId)).run()
  await db.delete(users).where(eq(users.id, targetId)).run()

  return ctx.json({ ok: true })
})

admin.get('/buckets', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const db = getDb(ctx)
  const rows = await db
    .select({
      id: buckets.id,
      ownerUserId: buckets.ownerUserId,
      ownerEmail: users.email,
      name: buckets.name,
      cdnBaseUrl: buckets.cdnBaseUrl,
      edgeThumbnailUrl: buckets.edgeThumbnailUrl,
      endpointUrl: buckets.endpointUrl,
      region: buckets.region,
      bucketName: buckets.bucketName,
      forcePathStyle: buckets.forcePathStyle,
      uploadMethod: buckets.uploadMethod,
      createdAt: buckets.createdAt,
    })
    .from(buckets)
    .leftJoin(users, eq(users.id, buckets.ownerUserId))
    .orderBy(desc(buckets.createdAt))
    .all()

  return ctx.json(rows)
})

admin.delete('/buckets/:id', async (ctx) => {
  const adminUser = await requireAdmin(ctx)
  if (!adminUser.ok) return adminUser.response

  const bucketId = ctx.req.param('id')
  if (!bucketId) return ctx.json({ error: 'Invalid bucket id' }, 400)

  const db = getDb(ctx)
  const existing = await db.select({ id: buckets.id }).from(buckets).where(eq(buckets.id, bucketId)).get()
  if (!existing) return ctx.json({ error: 'Bucket not found' }, 404)

  await db.delete(pathMetadata).where(eq(pathMetadata.bucketId, bucketId)).run()
  await db.delete(uploadHistory).where(eq(uploadHistory.bucketId, bucketId)).run()
  await db.delete(buckets).where(eq(buckets.id, bucketId)).run()

  return ctx.json({ ok: true })
})
