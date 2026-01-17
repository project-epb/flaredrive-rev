import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { HonoEnv } from '../index.js'
import { getDb } from '../utils/db.js'
import { buckets as bucketsTable } from '../../db/schema.js'
import { getSessionUser } from '../utils/session.js'
import { createStorageAdapter } from '../storage/factory.js'

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

const clampExpires = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 900
  // AWS S3 presign maximum depends on credentials type; for MVP keep it short.
  return Math.min(3600, Math.max(60, Math.floor(n)))
}

const isValidKey = (key: string) => {
  if (!key) return false
  if (key.length > 1024) return false
  if (key.startsWith('/')) return false
  if (key.includes('\u0000')) return false
  return true
}

objects.post('/:bucketId/presign', async (ctx) => {
  const user = await getSessionUser(ctx)
  if (!user) return ctx.json({ error: 'Unauthorized' }, 401)

  const bucketId = ctx.req.param('bucketId')
  if (!bucketId) return ctx.json({ error: 'Invalid bucketId' }, 400)

  const body = (await ctx.req.json().catch(() => null)) as PresignRequestBody | null
  const action = (body?.action || '').toString() as PresignAction
  const key = (body?.key || '').toString()

  if (action !== 'put' && action !== 'get') return ctx.json({ error: 'Invalid action' }, 400)
  if (!isValidKey(key)) return ctx.json({ error: 'Invalid key' }, 400)

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
    .where(eq(bucketsTable.id, bucketId))
    .get()

  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)
  if (cfg.ownerUserId !== user.id) return ctx.json({ error: 'Forbidden' }, 403)

  const adapter = createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })

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
