import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import type { HonoEnv } from '../index.js'
import { getDb } from '../utils/db.js'
import { buckets as bucketsTable } from '../../db/schema.js'
import { generateBucketId, validateBucketConfigInput } from '../utils/bucket-config.js'
import { getSessionUser } from '../utils/session.js'
import { createStorageAdapter } from '../storage/factory.js'

export const buckets = new Hono<HonoEnv>()

buckets.get('/', async (ctx) => {
  const user = await getSessionUser(ctx)
  const db = getDb(ctx)

  // MVP: 未登录则返回空列表（避免在首页暴露桶列表）
  if (!user) {
    return ctx.json([])
  }

  const rows = await db
    .select({
      id: bucketsTable.id,
      ownerUserId: bucketsTable.ownerUserId,
      name: bucketsTable.name,
      cdnBaseUrl: bucketsTable.cdnBaseUrl,
      endpointUrl: bucketsTable.endpointUrl,
      region: bucketsTable.region,
      bucketName: bucketsTable.bucketName,
      forcePathStyle: bucketsTable.forcePathStyle,
      createdAt: bucketsTable.createdAt,
    })
    .from(bucketsTable)
    .where(eq(bucketsTable.ownerUserId, user.id))
    .all()

  return ctx.json(rows)
})

buckets.post('/', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const body = await ctx.req.json().catch(() => null)
  const parsed = validateBucketConfigInput(body)
  if (!parsed.ok) return ctx.json({ error: parsed.error }, 400)

  if (!parsed.value.accessKeyId) return ctx.json({ error: 'Invalid accessKeyId' }, 400)
  if (!parsed.value.secretAccessKey) return ctx.json({ error: 'Invalid secretAccessKey' }, 400)

  const db = getDb(ctx)
  const id = generateBucketId()
  const now = Date.now()

  await db
    .insert(bucketsTable)
    .values({
      id,
      ownerUserId: user.id,
      name: parsed.value.name,
      cdnBaseUrl: parsed.value.cdnBaseUrl,
      endpointUrl: parsed.value.endpointUrl,
      region: parsed.value.region,
      accessKeyId: parsed.value.accessKeyId,
      secretAccessKey: parsed.value.secretAccessKey,
      bucketName: parsed.value.bucketName,
      forcePathStyle: parsed.value.forcePathStyle,
      createdAt: now,
    })
    .run()

  return ctx.json({ id }, 201)
})

buckets.put('/:id', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const id = ctx.req.param('id')
  if (!id) return ctx.json({ error: 'Invalid id' }, 400)

  const body = await ctx.req.json().catch(() => null)
  const parsed = validateBucketConfigInput(body)
  if (!parsed.ok) return ctx.json({ error: parsed.error }, 400)

  const db = getDb(ctx)

  const existing = await db
    .select({ ownerUserId: bucketsTable.ownerUserId })
    .from(bucketsTable)
    .where(eq(bucketsTable.id, id))
    .get()

  if (!existing) return ctx.json({ error: 'Not found' }, 404)
  if (existing.ownerUserId !== user.id) return ctx.json({ error: 'Forbidden' }, 403)

  const update: Record<string, any> = {
    name: parsed.value.name,
    cdnBaseUrl: parsed.value.cdnBaseUrl,
    endpointUrl: parsed.value.endpointUrl,
    region: parsed.value.region,
    bucketName: parsed.value.bucketName,
    forcePathStyle: parsed.value.forcePathStyle,
  }

  // 编辑时允许留空表示不修改 AK/SK
  if (parsed.value.accessKeyId) update.accessKeyId = parsed.value.accessKeyId
  if (parsed.value.secretAccessKey) update.secretAccessKey = parsed.value.secretAccessKey

  await db
    .update(bucketsTable)
    .set(update)
    .where(and(eq(bucketsTable.id, id), eq(bucketsTable.ownerUserId, user.id)))
    .run()

  return ctx.json({ ok: true })
})

buckets.delete('/:id', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const id = ctx.req.param('id')
  if (!id) return ctx.json({ error: 'Invalid id' }, 400)

  const db = getDb(ctx)
  await db
    .delete(bucketsTable)
    .where(and(eq(bucketsTable.id, id), eq(bucketsTable.ownerUserId, user.id)))
    .run()

  return ctx.json({ ok: true })
})

buckets.post('/:id/test', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const id = ctx.req.param('id')
  if (!id) return ctx.json({ error: 'Invalid id' }, 400)

  const db = getDb(ctx)
  const cfg = await db
    .select({
      ownerUserId: bucketsTable.ownerUserId,
      endpointUrl: bucketsTable.endpointUrl,
      region: bucketsTable.region,
      accessKeyId: bucketsTable.accessKeyId,
      secretAccessKey: bucketsTable.secretAccessKey,
      bucketName: bucketsTable.bucketName,
      forcePathStyle: bucketsTable.forcePathStyle,
    })
    .from(bucketsTable)
    .where(eq(bucketsTable.id, id))
    .get()

  if (!cfg) return ctx.json({ error: 'Not found' }, 404)
  if (cfg.ownerUserId !== user.id) return ctx.json({ error: 'Forbidden' }, 403)

  const adapter = createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })

  const result = await adapter.testConnection()
  if (result.ok) {
    return ctx.json({
      ok: true,
      bucketId: id,
      latencyMs: result.latencyMs,
    })
  }

  return ctx.json(
    {
      ok: false,
      bucketId: id,
      latencyMs: result.latencyMs,
      error: result.error || 'S3Error',
      message: result.message || 'Connection test failed',
      status: result.status,
    },
    400
  )
})
