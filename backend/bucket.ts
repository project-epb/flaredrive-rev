import { Context, Hono } from 'hono'
import { HonoEnv } from '.'

// @ts-ignore prevent bundler from removing this
const console: Console = globalThis['con'.concat('sole')]

export const bucket = new Hono<HonoEnv>()

const getFilePath = (ctx: Context) => {
  const path = ctx.req.path.split('/bucket/').slice(1).join('/bucket/')
  return path
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
  const { BUCKET } = ctx.env
  const path = getFilePath(ctx)
  const limit = Math.min(1000, ctx.req.query('limit') ? parseInt(ctx.req.query('limit')) : 1000)
  const startAfter = ctx.req.query('startAfter') || ''

  try {
    const list = await BUCKET.list({
      prefix: path,
      delimiter: '/',
      limit,
      startAfter,
      include: ['httpMetadata', 'customMetadata'],
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
    const hasMore = list.truncated
    const moreAfter = hasMore ? list.objects.at(-1)?.key || null : null
    return ctx.json({
      objects: list.objects,
      folders: list.delimitedPrefixes,
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
  const { BUCKET } = ctx.env
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
      const item = await handleRenameFile(BUCKET, copySource, path, customMetadata)
      return ctx.json(item)
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
    const item = await handleUploadFile(BUCKET, fileBody, path, fileName, contentType, customMetadata)
    return ctx.json(item)
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
  const { BUCKET } = ctx.env
  const path = getFilePath(ctx)
  if (!path) {
    return ctx.json({ error: 'No file path provided' }, 400)
  }
  if (path.endsWith('/')) {
    return ctx.json({ error: 'Deleting folders is not supported yet' }, 400)
  }
  try {
    console.info('Deleting file', path)
    await BUCKET.delete(path)
    return ctx.json({
      message: 'Deletion successful',
      path,
    })
  } catch (e) {
    console.error('Error deleting file', e)
    return ctx.json({ error: e.message || e.toString(), stack: e.stack }, 500)
  }
})

async function handleUploadFile(
  BUCKET: R2Bucket,
  file: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  path: string,
  fileName: string,
  contentType: string,
  customMetadata: Record<string, string>
): Promise<R2Object> {
  if (!fileName) {
    throw new Error('No fileName provided')
  }
  if (!file) {
    throw new Error('No file provided')
  }

  const item = await BUCKET.put(path, file, {
    httpMetadata: {
      contentType,
    },
    customMetadata,
  })
  return item
}

async function handleRenameFile(
  BUCKET: R2Bucket,
  fromPath: string,
  toPath: string,
  customMetadata: Record<string, string>
) {
  if (!fromPath || !toPath) {
    throw new Error('Invalid file paths')
  }
  if (fromPath.endsWith('/') || toPath.endsWith('/')) {
    throw new Error('Rename folders is not supported yet')
  }

  const file = await BUCKET.get(fromPath).catch((e) => {
    console.error('Error getting file', e)
    throw new Error(`Failed to get file ${fromPath}`, { cause: e })
  })
  if (!file) {
    throw new Error(`File ${fromPath} not found`)
  }
  const item = await BUCKET.put(toPath, file.body, {
    httpMetadata: {
      contentType: file.httpMetadata.contentType,
    },
    customMetadata: {
      ...file.customMetadata,
      ...customMetadata,
    },
  })
  // @ts-ignore
  item.copySource = fromPath

  await BUCKET.delete(fromPath).catch((e) => {
    console.error('Error deleting file', e)
    // no need to throw error here
    // @ts-ignore
    item.warnings = [{ message: 'Failed to delete old file', error: e.message || e.toString(), stack: e.stack }]
  })

  return item
}
