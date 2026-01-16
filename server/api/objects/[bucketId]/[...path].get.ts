import { defineEventHandler, getRouterParam, getQuery } from 'h3'
import { eq, and } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { createS3Adapter } from '~~/server/utils/s3-adapter'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const bucketId = getRouterParam(event, 'bucketId')
  const pathSegments = getRouterParam(event, 'path')
  const query = getQuery(event)
  
  if (!bucketId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing bucket id' })
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

  let prefix = pathSegments ? pathSegments : ''
  
  // Ensure prefix is properly decoded
  try {
    prefix = decodeURIComponent(prefix)
  } catch (e) {
    // Ignore decoding errors
  }

  // Create a proper prefix if the URL ends with a slash (directory listing)
  // This handles cases where the router param might strip the trailing slash
  const reqPath = event.path.split('?')[0]
  if (reqPath && reqPath.endsWith('/') && prefix.length > 0 && !prefix.endsWith('/')) {
    prefix += '/'
  }

  const delimiter = query.delimiter === 'false' ? undefined : '/'
  const maxKeys = typeof query.maxKeys === 'string' ? parseInt(query.maxKeys, 10) : 1000

  const result = await s3.listObjects(prefix, delimiter, maxKeys)

  return {
    objects: result.objects.map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
      etag: obj.ETag,
    })),
    prefixes: result.commonPrefixes.map((p) => p.Prefix),
    isTruncated: result.isTruncated,
    nextToken: result.nextContinuationToken,
  }
})
