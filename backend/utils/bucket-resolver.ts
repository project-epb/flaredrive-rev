import { eq } from 'drizzle-orm'
import { buckets as bucketsTable } from '../../db/schema.js'
import { getDb } from './db.js'

export const getBucketConfigById = async (ctx: any, id: string) => {
  const db = getDb(ctx)
  const row = await db
    .select({
      id: bucketsTable.id,
      ownerUserId: bucketsTable.ownerUserId,
      endpointUrl: bucketsTable.endpointUrl,
      region: bucketsTable.region,
      accessKeyId: bucketsTable.accessKeyId,
      secretAccessKey: bucketsTable.secretAccessKey,
      bucketName: bucketsTable.bucketName,
      forcePathStyle: bucketsTable.forcePathStyle,
      uploadMethod: bucketsTable.uploadMethod,
      cdnBaseUrl: bucketsTable.cdnBaseUrl,
    })
    .from(bucketsTable)
    .where(eq(bucketsTable.id, id))
    .get()

  return row || null
}

export const parseBucketPath = (reqPath: string, baseSegment: 'bucket' | 'raw') => {
  const fullPath = reqPath.split(`/${baseSegment}/`).slice(1).join(`/${baseSegment}/`)
  const normalizedPath = fullPath || ''
  if (!normalizedPath) {
    return { bucketId: '', path: '' }
  }
  const [bucketId, ...rest] = normalizedPath.split('/')
  return { bucketId: bucketId || '', path: rest.join('/') }
}
