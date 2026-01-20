import { Hono } from 'hono'
import type { HonoEnv } from '../index.js'
import { getResolvedPublicSiteSettings } from '../utils/site-settings.js'

export const site = new Hono<HonoEnv>()

// Public, no auth required.
// Frontend uses this for site name / allow register, resolved with DB -> env -> default.
site.get('/public-settings', async (ctx) => {
  const resolved = await getResolvedPublicSiteSettings(ctx)
  return ctx.json(resolved)
})
