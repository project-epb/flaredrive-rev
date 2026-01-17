import { Context, Hono } from 'hono'
import { HonoEnv } from '../index.js'
import { getBucketConfigById, parseBucketPath } from '../utils/bucket-resolver.js'
import { createStorageAdapter } from '../storage/factory.js'

// @ts-ignore prevent bundler from removing this
const console: Console = globalThis['con'.concat('sole')]

export const bucket = new Hono<HonoEnv>()

const getFilePath = (ctx: Context) => {
  return parseBucketPath(ctx.req.path, 'bucket').path
}
const getFileName = (ctx: Context) => {
  const path = getFilePath(ctx)
  const fileName = ctx.req.query('fileName') || path.split('/').pop()
  return fileName
}
const getMetadataFromHeaders = (ctx: Context) => {
  const customMetadata = {} as Record<string, string>
  ctx.req.raw.headers.forEach((value, key) => {
    if (key.startsWith('x-amz-meta-')) {
      const metadataKey = key.replace('x-amz-meta-', '')
      customMetadata[metadataKey] = value
    }
  })
  return customMetadata
}

bucket.get('*', async (ctx) => {
  const { bucketId } = parseBucketPath(ctx.req.path, 'bucket')
  if (!bucketId) return ctx.json({ error: 'Bucket not found' }, 404)
  const cfg = await getBucketConfigById(ctx, bucketId)
  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)

  const path = getFilePath(ctx)
  const limit = Math.min(1000, ctx.req.query('limit') ? parseInt(ctx.req.query('limit')) : 1000)
  const startAfter = ctx.req.query('startAfter') || ''

  const adapter = createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })

  try {
    const list = await adapter.list(path || '', {
      delimiter: '/',
      limit,
      startAfter: startAfter || undefined,
    })
    console.info(
      'Listing files',
      {
        path,
        limit,
        startAfter,
      },
      list
    )

    const objects = list.objects
    const folders = list.folders
    const hasMore = list.hasMore
    const moreAfter = list.moreAfter
    return ctx.json({
      objects,
      folders,
      prefix: path,
      limit,
      startAfter,
      hasMore,
      moreAfter,
    })
  } catch (e) {
    console.error('Error listing children', e)
    return ctx.json({ error: e.message || e.toString(), stack: e.stack }, 500)
  }
})

bucket.put('*', async (ctx) => {
  const { bucketId } = parseBucketPath(ctx.req.path, 'bucket')
  if (!bucketId) return ctx.json({ error: 'Bucket not found' }, 404)
  const cfg = await getBucketConfigById(ctx, bucketId)
  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)

  const adapter = createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })
  const path = getFilePath(ctx)
  const fileName = getFileName(ctx)
  if (!fileName) {
    return ctx.json({ error: 'No fileName provided' }, 400)
  }

  const contentType = ctx.req.query('contentType') || ctx.req.header('Content-Type') || 'application/octet-stream'
  const customMetadata = getMetadataFromHeaders(ctx)

  // Rename file
  let copySource = ctx.req.header('x-amz-copy-source') || ctx.req.query('copySource')
  if (copySource) {
    try {
      copySource = decodeURIComponent(copySource)
      console.info('Renaming file', {
        from: copySource,
        to: path,
        contentType,
        customMetadata,
      })

      const copy = await adapter.copy(copySource, path, {
        contentType,
        metadata: customMetadata,
      })
      await adapter.delete(copySource)
      return ctx.json({
        key: path,
        etag: copy.etag || '',
        copySource,
        httpMetadata: { contentType },
        customMetadata,
      })
    } catch (e) {
      console.error('Error renaming file', e)
      return ctx.json({ error: e.message || e.toString(), stack: e.stack, fromPath: copySource, toPath: path }, 500)
    }
  }

  // Upload file
  const fileBody = await ctx.req.arrayBuffer()
  if (typeof fileBody === 'undefined') {
    console.error('Error getting file body')
    return ctx.json({ error: 'No file provided' }, 400)
  }
  try {
    console.info('Uploading file', {
      path,
      fileName,
      contentType,
      customMetadata,
    })

    const put = await adapter.put(path, fileBody, {
      contentType,
      metadata: customMetadata,
    })
    return ctx.json({
      key: path,
      size: fileBody.byteLength,
      etag: put.etag || '',
      httpMetadata: { contentType },
      customMetadata,
    })
  } catch (e) {
    console.error('Error uploading file', e)
    return ctx.json({ error: e.message || e.toString(), stack: e.stack }, 500)
  }
})

bucket.post('*', async (ctx) => {
  return ctx.json(
    {
      error: 'Multipart upload is not supported yet',
      method: 'POST',
    },
    400
  )
})

bucket.delete('*', async (ctx) => {
  const { bucketId } = parseBucketPath(ctx.req.path, 'bucket')
  if (!bucketId) return ctx.json({ error: 'Bucket not found' }, 404)
  const cfg = await getBucketConfigById(ctx, bucketId)
  if (!cfg) return ctx.json({ error: 'Bucket not found' }, 404)

  const adapter = createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })
  const path = getFilePath(ctx)
  if (!path) {
    return ctx.json({ error: 'No file path provided' }, 400)
  }
  if (path.endsWith('/')) {
    return ctx.json({ error: 'Deleting folders is not supported yet' }, 400)
  }
  try {
    console.info('Deleting file', path)
    await adapter.delete(path)
    return ctx.json({
      message: 'Deletion successful',
      path,
    })
  } catch (e) {
    console.error('Error deleting file', e)
    return ctx.json({ error: e.message || e.toString(), stack: e.stack }, 500)
  }
})
