import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { eq, and } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bucketId = getRouterParam(event, 'id')
  if (!bucketId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing bucket id' })
  }

  const body = await readBody(event).catch(() => null)
  const db = createDb(event)

  const bucket = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.ownerUserId, user.id)))
    .get()

  if (!bucket) {
    throw createError({ statusCode: 404, statusMessage: 'Bucket not found' })
  }

  const updateData: any = {}
  if (typeof body?.name === 'string') updateData.name = body.name.trim()
  if (typeof body?.cdnBaseUrl === 'string') updateData.cdnBaseUrl = body.cdnBaseUrl.trim() || null
  if (typeof body?.endpointUrl === 'string') updateData.endpointUrl = body.endpointUrl.trim()
  if (typeof body?.region === 'string') updateData.region = body.region.trim()
  if (typeof body?.accessKeyId === 'string' && body.accessKeyId.trim()) updateData.accessKeyId = body.accessKeyId.trim()
  if (typeof body?.secretAccessKey === 'string' && body.secretAccessKey.trim()) updateData.secretAccessKey = body.secretAccessKey.trim()
  if (typeof body?.bucketName === 'string') updateData.bucketName = body.bucketName.trim()
  if (typeof body?.forcePathStyle === 'boolean') updateData.forcePathStyle = body.forcePathStyle ? 1 : 0

  if (Object.keys(updateData).length === 0) {
    return { ok: true, message: 'No changes' }
  }

  await db.update(buckets).set(updateData).where(eq(buckets.id, bucketId))

  return { ok: true }
})
