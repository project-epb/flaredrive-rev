import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { HonoEnv } from '../index.js'
import { getDb } from '../utils/db.js'
import { buckets as bucketsTable } from '../../db/schema.js'
import { uploadHistory } from '../../db/schema.js'
import { nanoid } from 'nanoid'
import { getSessionUser } from '../utils/session.js'
import { createAdapterFromConfig, isValidKey } from '../utils/bucket-utils.js'
import { getBucketConfigById } from '../utils/bucket-resolver.js'

export const objects = new Hono<HonoEnv>()

type PresignAction = 'put' | 'get'

type PresignRequestBody = {
  action: PresignAction
  key: string
  expiresInSec?: number
  contentType?: string
  download?: boolean
  fileName?: string
}

type RecordUploadBody = {
  key: string
  size: number
  contentType?: string
}

const clampExpires = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 900
  // AWS S3 presign maximum depends on credentials type; for MVP keep it short.
  return Math.min(3600, Math.max(60, Math.floor(n)))
}

objects.post('/:bucketId/presign', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const bucketId = ctx.req.param('bucketId')
  if (!bucketId) return ctx.json({ error: 'Invalid bucketId' }, 400)

  const body = (await ctx.req.json().catch(() => null)) as PresignRequestBody | null
  const action = (body?.action || '').toString() as PresignAction
  let key = (body?.key || '').toString()

  if (key.startsWith('/')) {
    key = key.slice(1)
  }

  if (action !== 'put' && action !== 'get') return ctx.json({ error: 'Invalid action' }, 400)
  if (!isValidKey(key)) return ctx.json({ error: 'Invalid key' }, 400)

  const cfg = await getBucketConfigById(ctx, bucketId)

  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)
  if (cfg.ownerUserId !== user.id) return ctx.json({ error: 'Forbidden' }, 403)

  const adapter = createAdapterFromConfig(cfg)

  const expiresIn = clampExpires(body?.expiresInSec)

  if (action === 'put') {
    const contentType = (body?.contentType || '').toString().trim()

    const presigned = await adapter.presignPut(key, {
      expiresIn,
      ...(contentType ? { contentType } : {}),
    })
    return ctx.json({
      action,
      bucketId,
      key,
      ...presigned,
    })
  }

  const download = !!body?.download
  const fileName = (body?.fileName || '').toString().trim()
  const presigned = await adapter.presignGet(key, {
    expiresIn,
    ...(download ? { download } : {}),
    ...(fileName ? { fileName } : {}),
  })
  return ctx.json({
    action,
    bucketId,
    key,
    ...presigned,
  })
})

objects.post('/:bucketId/record', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const bucketId = ctx.req.param('bucketId')
  if (!bucketId) return ctx.json({ error: 'Invalid bucketId' }, 400)

  const body = (await ctx.req.json().catch(() => null)) as RecordUploadBody | null
  let key = (body?.key || '').toString()
  const size = Number(body?.size)

  if (key.startsWith('/')) {
    key = key.slice(1)
  }

  if (!isValidKey(key)) return ctx.json({ error: 'Invalid key' }, 400)
  if (!Number.isFinite(size) || size < 0) return ctx.json({ error: 'Invalid size' }, 400)

  const db = getDb(ctx)
  const cfg = await db
    .select({ ownerUserId: bucketsTable.ownerUserId })
    .from(bucketsTable)
    .where(eq(bucketsTable.id, bucketId))
    .get()

  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)
  if (cfg.ownerUserId !== user.id) return ctx.json({ error: 'Forbidden' }, 403)

  const contentType = (body?.contentType || 'application/octet-stream').toString()
  const now = Date.now()

  await db
    .insert(uploadHistory)
    .values({
      id: nanoid(),
      userId: user.id,
      bucketId,
      objectKey: key,
      objectSize: size,
      contentType,
      createdAt: now,
    })
    .run()

  return ctx.json({ ok: true })
})
