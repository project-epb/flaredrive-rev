import { Hono } from 'hono'
import { HonoEnv } from '../index.js'
import { getBucketConfigById, parseBucketPath } from '../utils/bucket-resolver.js'
import { normalizeBaseUrl } from '../utils/bucket-config.js'
import { createAdapterFromConfig } from '../utils/bucket-utils.js'
import { getSessionUser } from '../utils/session.js'
import { getPathMetadata } from '../utils/metadata.js'

const app = new Hono<HonoEnv>()
export { app as raw }

app.get('*', async (ctx) => {
  const { bucketId, path: filePath } = parseBucketPath(ctx.req.path, 'raw')
  if (filePath.endsWith('/')) {
    return ctx.json(
      {
        error: 'Invalid file path',
      },
      400
    )
  }

  if (!bucketId) return ctx.json({ error: 'Bucket not found' }, 404)
  const cfg = await getBucketConfigById(ctx, bucketId)
  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)

  // 1. Owner check
  const user = await getSessionUser(ctx)
  const isOwner = user && user.id === cfg.ownerUserId

  // 2. Public check (if not owner)
  if (!isOwner) {
    const meta = await getPathMetadata(ctx, bucketId, filePath)
    const isPublic = meta?.isPublic === 1
    if (!isPublic) {
      // If we want to support "Directory Password" later, check it here
      return ctx.json({ error: 'Forbidden' }, 403)
    }
  }

  const isDownload = typeof ctx.req.query('download') !== 'undefined'
  const fileName = filePath.split('/').pop() || ''
  const cdnBaseUrl = (cfg.cdnBaseUrl || '').toString().trim()
  const normalizedCdnBaseUrl = cdnBaseUrl ? normalizeBaseUrl(cdnBaseUrl) : ''

  if (normalizedCdnBaseUrl) {
    const cdnUrl = new URL(filePath, normalizedCdnBaseUrl)
    const reqUrl = new URL(ctx.req.url)
    reqUrl.searchParams.forEach((value, key) => {
      cdnUrl.searchParams.append(key, value)
    })
    if (isDownload) {
      cdnUrl.searchParams.append('t', Date.now().toString())
    }
    return ctx.redirect(cdnUrl.toString(), 302)
  }

  const adapter = createAdapterFromConfig(cfg)

  try {
    const presigned = await adapter.presignGet(filePath, {
      expiresIn: 900,
      ...(isDownload ? { download: true, fileName } : {}),
    })
    return ctx.redirect(presigned.url, 302)
  } catch (e: any) {
    return ctx.json({ error: e?.message || e?.toString?.() || 'Presign failed' }, 500)
  }
})
