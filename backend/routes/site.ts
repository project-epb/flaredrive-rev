import { Hono } from 'hono'
import type { HonoEnv } from '../index.js'
import { getPublicSiteSettings } from '../utils/site-settings.js'

export const site = new Hono<HonoEnv>()

// Public, no auth required.
// Frontend uses this for site name / allow register, resolved with DB -> env -> default.
site.get('/public-settings', async (ctx) => {
  const resolved = await getPublicSiteSettings(ctx)
  return ctx.json({
    siteName: resolved.siteName.value,
    allowRegister: resolved.allowRegister.value,
  })
})
