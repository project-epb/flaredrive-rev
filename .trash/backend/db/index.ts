import { drizzle } from 'drizzle-orm/d1'
import type { HonoEnv } from '../env.js'

export const createDb = (env: HonoEnv['Bindings']) => {
  return drizzle(env.DB)
}
