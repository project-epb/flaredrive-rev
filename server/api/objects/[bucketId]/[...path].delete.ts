import { defineEventHandler, getRouterParam } from 'h3'
import { eq, and } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { createS3Adapter } from '~~/server/utils/s3-adapter'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bucketId = getRouterParam(event, 'bucketId')
  const pathSegments = getRouterParam(event, 'path')
  
  if (!bucketId || !pathSegments) {
    throw createError({ statusCode: 400, statusMessage: 'Missing bucket id or path' })
  }

  const db = createDb(event)
  const bucket = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.ownerUserId, user.id)))
    .get()

  if (!bucket) {
    throw createError({ statusCode: 404, statusMessage: 'Bucket not found' })
  }

  const s3 = createS3Adapter({
    endpointUrl: bucket.endpointUrl,
    region: bucket.region,
    accessKeyId: bucket.accessKeyId,
    secretAccessKey: bucket.secretAccessKey,
    bucketName: bucket.bucketName,
    forcePathStyle: bucket.forcePathStyle === 1,
  })

  await s3.deleteObject(pathSegments)

  return { ok: true }
})
