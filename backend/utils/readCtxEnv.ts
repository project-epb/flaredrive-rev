import type { HonoEnv } from 'backend'
import { readEnv } from '../../common/app-env.js'
import { Context } from 'hono'
import { env } from 'hono/adapter'

export const readEnvVars = (ctx: Context<HonoEnv>, key: string) => {
  const e = env(ctx)
  const v = ctx.var
  const data = e[key] ?? e[`VITE_${key}`] ?? v[key] ?? v[`VITE_${key}`]
  if (typeof data !== 'undefined') return data
  return readEnv(key)
}
