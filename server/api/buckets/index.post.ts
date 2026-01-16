import { defineEventHandler, readBody } from 'h3'
import { createDb } from '~~/server/db/index'
import { buckets } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { createId } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const cdnBaseUrl = typeof body?.cdnBaseUrl === 'string' ? body.cdnBaseUrl.trim() : null
  const endpointUrl = typeof body?.endpointUrl === 'string' ? body.endpointUrl.trim() : ''
  const region = typeof body?.region === 'string' ? body.region.trim() : 'auto'
  const accessKeyId = typeof body?.accessKeyId === 'string' ? body.accessKeyId.trim() : ''
  const secretAccessKey = typeof body?.secretAccessKey === 'string' ? body.secretAccessKey.trim() : ''
  const bucketName = typeof body?.bucketName === 'string' ? body.bucketName.trim() : ''
  const forcePathStyle = typeof body?.forcePathStyle === 'boolean' ? body.forcePathStyle : false

  if (!name || !endpointUrl || !accessKeyId || !secretAccessKey || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  const db = createDb(event)
  const bucketId = createId()
  const now = Date.now()

  await db.insert(buckets).values({
    id: bucketId,
    ownerUserId: user.id,
    name,
    cdnBaseUrl: cdnBaseUrl || null,
    endpointUrl,
    region,
    accessKeyId,
    secretAccessKey,
    bucketName,
    forcePathStyle: forcePathStyle ? 1 : 0,
    createdAt: now,
  })

  return {
    ok: true,
    bucketId,
  }
})
