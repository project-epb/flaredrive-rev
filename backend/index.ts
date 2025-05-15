import { Hono } from 'hono'
import { bucket } from './bucket.js'
import { raw } from './raw.js'

export interface HonoEnv {
  Bindings: {
    BUCKET: R2Bucket
  }
}

const app = new Hono<HonoEnv>().basePath('/api')

app.get('/').all((ctx) => {
  return ctx.json({
    message: 'hello, world',
  })
})

app.route('/bucket', bucket)
app.route('/raw', raw)

export default app
