import { Hono } from 'hono'
import type { HonoEnv } from '../env.js'

export const rawRouter = new Hono<HonoEnv>()

rawRouter.get('/:bucketId/*', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})
