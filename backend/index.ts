import { Hono } from 'hono'
import { bucket } from './bucket.js'
import { getBucketInfoList } from './bucket-utils.js'
import { raw } from './raw.js'

export interface HonoEnv {
  Bindings: {
    [key: string]: unknown
  }
}

const app = new Hono<HonoEnv>().basePath('/api')

app.get('/').all((ctx) => {
  return ctx.json({
    message: 'hello, world',
  })
})

app.get('/list_buckets', (ctx) => {
  const buckets = getBucketInfoList(ctx.env)
  return ctx.json(buckets)
})

app.route('/bucket', bucket)
app.route('/raw', raw)

export default app
