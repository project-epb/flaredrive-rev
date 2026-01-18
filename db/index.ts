import { D1Database } from '@cloudflare/workers-types/2023-07-01'
import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'

const getD1 = (event: H3Event) => {
  const env = event.context.cloudflare?.env as { D1?: D1Database } | undefined
  if (!env?.D1) {
    throw new Error('D1 binding not found on event.context.cloudflare.env.D1')
  }
  return env.D1
}

export const getDrizzle = (event: H3Event) => {
  return drizzle(getD1(event))
}
