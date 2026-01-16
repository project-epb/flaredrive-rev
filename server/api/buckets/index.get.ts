import { defineEventHandler } from 'h3'
import { eq } from 'drizzle-orm'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = createDb(event)

  const userBuckets = await db.select().from(buckets).where(eq(buckets.ownerUserId, user.id)).all()

  return {
    buckets: userBuckets.map((b) => ({
      id: b.id,
      name: b.name,
      cdnBaseUrl: b.cdnBaseUrl,
      endpointUrl: b.endpointUrl,
      region: b.region,
      bucketName: b.bucketName,
      forcePathStyle: b.forcePathStyle,
      createdAt: b.createdAt,
    })),
  }
})
