import { Hono } from 'hono'

// Polyfill checks for AWS SDK to prevent fs access
if (typeof process === 'undefined') {
  ;(globalThis as any).process = { env: {} }
}
// Ensure process.env exists
if (!globalThis.process) {
  ;(globalThis as any).process = { env: {} }
}
if (!globalThis.process.env) {
  globalThis.process.env = {}
}
// Disable config loading from filesystem
Object.assign(globalThis.process.env, {
  AWS_SDK_LOAD_CONFIG: '0',
  AWS_EC2_METADATA_DISABLED: 'true',
})

import { bucket } from './routes/bucket.js'
import { raw } from './routes/raw.js'
import { auth } from './routes/auth.js'
import { buckets } from './routes/buckets.js'
import { objects } from './routes/objects.js'
import { admin } from './routes/admin.js'
import { site } from './routes/site.js'

import type { D1Database } from '@cloudflare/workers-types/2023-07-01'
import type { KVNamespace } from '@cloudflare/workers-types/2023-07-01'
import type { DurableObjectNamespace } from '@cloudflare/workers-types/2023-07-01'
import { BlankEnv } from 'hono/types'

export { SessionRevocationDO } from './durable/session-revocation.js'

export interface HonoEnv extends BlankEnv {
  Bindings: {
    D1: D1Database
    KV: KVNamespace
    SESSION_REVOCATION: DurableObjectNamespace
    [key: string]: unknown
  }
  Variables: {
    ADMIN_CREATE_TOKEN?: string
    [key: string]: unknown
  }
}

const app = new Hono<HonoEnv>().basePath('/api')

app.get('/').all((ctx) => {
  return ctx.json({
    message: 'hello, world',
  })
})

app.route('/auth', auth)
app.route('/buckets', buckets)
app.route('/objects', objects)
app.route('/bucket', bucket)
app.route('/raw', raw)
app.route('/admin', admin)
app.route('/site', site)

export default app
