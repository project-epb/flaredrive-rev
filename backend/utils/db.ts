import type { D1Database } from '@cloudflare/workers-types/2023-07-01'
import { drizzle } from 'drizzle-orm/d1'
import type { Context } from 'hono'
import type { HonoEnv } from '../index.js'

export const getDb = (ctx: Context<HonoEnv>) => {
  const d1 = ctx.env.D1 as D1Database | undefined
  if (!d1) {
    throw new Error('D1 binding not found on ctx.env.D1')
  }
  return drizzle(d1)
}
