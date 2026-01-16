import { defineEventHandler, getRouterParam, sendRedirect, createError } from 'h3'
import { and, eq } from 'drizzle-orm'
import { createDb } from '../../../db/index'
import { buckets } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import { createS3Adapter } from '../../../utils/s3-adapter'

const normalizeKey = (key: string) => key.replace(/^\/+/, '')

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bucketId = getRouterParam(event, 'bucketId')
  const pathParam = getRouterParam(event, 'path')

  if (!bucketId || !pathParam) {
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

  const key = normalizeKey(pathParam)

  if (bucket.cdnBaseUrl) {
    const base = bucket.cdnBaseUrl.endsWith('/') ? bucket.cdnBaseUrl : `${bucket.cdnBaseUrl}/`
    const url = new URL(key, base).toString()
    return sendRedirect(event, url, 302)
  }

  const s3 = createS3Adapter({
    endpointUrl: bucket.endpointUrl,
    region: bucket.region,
    accessKeyId: bucket.accessKeyId,
    secretAccessKey: bucket.secretAccessKey,
    bucketName: bucket.bucketName,
    forcePathStyle: bucket.forcePathStyle === 1,
  })

  const url = await s3.getPresignedDownloadUrl(key, 3600)
  return sendRedirect(event, url, 302)
})
