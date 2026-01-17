import { Hono } from 'hono'
import { HonoEnv } from '../index.js'
import { getBucketConfigById, parseBucketPath } from '../utils/bucket-resolver.js'
import { createStorageAdapter } from '../storage/factory.js'

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

  let obj: any
  try {
    const adapter = createStorageAdapter({
      endpointUrl: cfg.endpointUrl,
      region: cfg.region,
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      bucketName: cfg.bucketName,
      forcePathStyle: cfg.forcePathStyle,
    })
    obj = await adapter.get(filePath)
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404) {
      return ctx.json({ error: 'File not found' }, 404)
    }
    return ctx.json({ error: e?.message || e?.toString?.() || 'GetObject failed' }, 500)
  }

  if (!obj?.body) {
    return ctx.json({ error: 'File not found' }, 404)
  }

  const body = obj.body
  const contentType = obj.contentType || 'application/octet-stream'
  const etag = (obj.etag || '').replace(/^\"|\"$/g, '')

  const isDownload = typeof ctx.req.query('download') !== 'undefined'
  const fileName = filePath.split('/').pop() || ''
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    'Cache-Control': 'max-age=31536000',
    Etag: etag,
  }
  if (isDownload) {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`
  }

  return ctx.body(body, {
    status: 200,
    headers,
  })
})
