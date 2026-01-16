import { defineEventHandler, getRouterParam } from 'h3'
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

  const db = createDb(event)
  const bucket = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.ownerUserId, user.id)))
    .get()

  if (!bucket) {
    throw createError({ statusCode: 404, statusMessage: 'Bucket not found' })
  }

  await db.delete(buckets).where(eq(buckets.id, bucketId))

  return { ok: true }
})
