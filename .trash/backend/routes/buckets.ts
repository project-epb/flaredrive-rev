import { Hono } from 'hono'
import type { HonoEnv } from '../env.js'

export const bucketRouter = new Hono<HonoEnv>()

bucketRouter.get('/', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})

bucketRouter.post('/', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})

bucketRouter.put('/:id', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})

bucketRouter.delete('/:id', async (c) => {
  return c.json({ message: 'not implemented' }, 501)
})
