import { Hono } from 'hono'
import { bucket } from './routes/bucket.js'
import { getBucketInfoList } from './utils/bucket-utils.js'
import { raw } from './routes/raw.js'
import { auth } from './routes/auth.js'
import { buckets } from './routes/buckets.js'
import { objects } from './routes/objects.js'

import type { D1Database } from '@cloudflare/workers-types/2023-07-01'

export interface HonoEnv {
  Bindings: {
    D1: D1Database
    [key: string]: unknown
  }
}

const app = new Hono<HonoEnv>().basePath('/api')

app.get('/').all((ctx) => {
  return ctx.json({
    message: 'hello, world',
  })
})

app.get('/list_buckets', async (ctx) => {
  // 返回当前已配置的 buckets 列表（来自 D1）。
  const list = await getBucketInfoList(ctx)
  return ctx.json(list)
})

app.route('/auth', auth)
app.route('/buckets', buckets)
app.route('/objects', objects)
app.route('/bucket', bucket)
app.route('/raw', raw)

export default app
