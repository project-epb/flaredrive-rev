import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'

const getD1 = (event: H3Event) => {
  const env = event.context.cloudflare?.env as { DB?: D1Database } | undefined
  if (!env?.DB) {
    throw new Error('D1 binding not found on event.context.cloudflare.env.DB')
  }
  return env.DB
}

export const createDb = (event: H3Event) => {
  return drizzle(getD1(event))
}
