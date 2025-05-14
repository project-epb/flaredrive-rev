import { Hono } from 'hono'
import { HonoEnv } from '.'

const app = new Hono<HonoEnv>()
export { app as raw }

app.get('*', async (ctx) => {
  const filePath = ctx.req.path.split('/raw/').slice(1).join('/raw/')
  if (filePath.endsWith('/')) {
    return ctx.json(
      {
        error: 'Invalid file path',
      },
      400
    )
  }
  const { BUCKET } = ctx.env
  const item = await BUCKET.get(filePath)
  if (!item) {
    return ctx.json(
      {
        error: 'File not found',
      },
      404
    )
  }
  const isDownload = typeof ctx.req.query('download') !== 'undefined'
  const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
  const fileName = filePath.split('/').pop() || ''
  const headers = {
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    'Cache-Control': 'max-age=31536000',
    Etag: item.etag,
  }
  if (isDownload) {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`
  }
  return ctx.body(item.body, {
    status: 200,
    headers,
  })
})
