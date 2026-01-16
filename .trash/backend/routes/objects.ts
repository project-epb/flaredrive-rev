import { Hono } from 'hono'
import type { HonoEnv } from '../env.js'

export const objectsRouter = new Hono<HonoEnv>()

objectsRouter.get('/:bucketId/*', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})

objectsRouter.delete('/:bucketId/*', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})

objectsRouter.post('/:bucketId/presign', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})
