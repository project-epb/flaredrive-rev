import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { eq, and } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { createS3Adapter } from '~~/server/utils/s3-adapter'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bucketId = getRouterParam(event, 'bucketId')
  const body = await readBody(event).catch(() => null)
  
  if (!bucketId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing bucket id' })
  }

  const key = typeof body?.key === 'string' ? body.key : ''
  const operationRaw =
    typeof body?.operation === 'string'
      ? body.operation
      : typeof body?.action === 'string'
        ? body.action
        : 'download'
  const operation = operationRaw === 'upload' ? 'upload' : 'download'
  const expiresIn = typeof body?.expiresIn === 'number' ? body.expiresIn : 3600
  const contentType = typeof body?.contentType === 'string' ? body.contentType : undefined

  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'Missing key' })
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

  if (operation === 'download' && bucket.cdnBaseUrl) {
    const base = bucket.cdnBaseUrl.endsWith('/') ? bucket.cdnBaseUrl : `${bucket.cdnBaseUrl}/`
    // 处理 key 开头的 slash，防止双重 slash 或 URL 构造错误
    // 通常 S3 key 不带开头 slash，但为了保险起见
    const relativeKey = key.startsWith('/') ? key.slice(1) : key
    const url = new URL(relativeKey, base).toString()
    return { url }
  }

  const s3 = createS3Adapter({
    endpointUrl: bucket.endpointUrl,
    region: bucket.region,
    accessKeyId: bucket.accessKeyId,
    secretAccessKey: bucket.secretAccessKey,
    bucketName: bucket.bucketName,
    forcePathStyle: bucket.forcePathStyle === 1,
  })

  let url: string
  if (operation === 'upload') {
    url = await s3.getPresignedUploadUrl(key, expiresIn, contentType)
  } else {
    url = await s3.getPresignedDownloadUrl(key, expiresIn)
  }

  return { url }
})
