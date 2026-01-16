import { Hono } from 'hono'
import type { HonoEnv } from './env.js'
import { authRouter } from './routes/auth.js'
import { bucketRouter } from './routes/buckets.js'
import { objectsRouter } from './routes/objects.js'
import { rawRouter } from './routes/raw.js'

const app = new Hono<HonoEnv>().basePath('/api')

app.get('/', (ctx) => {
  return ctx.json({
    message: 'flaredrive api',
    version: 1,
  })
})

app.route('/auth', authRouter)
app.route('/buckets', bucketRouter)
app.route('/objects', objectsRouter)
app.route('/raw', rawRouter)

export default app
