import { env } from 'hono/adapter'
import type { Context } from 'hono'
import type { HonoEnv } from '../index.js'

const DO_NAME = 'global'

const getStub = (ctx: Context<HonoEnv>) => {
  const ns = env(ctx).SESSION_REVOCATION
  const id = ns.idFromName(DO_NAME)
  return ns.get(id)
}

export const revokeTokenHash = async (ctx: Context<HonoEnv>, tokenHash: string, expiresAtMs: number) => {
  if (!tokenHash) return
  const stub = getStub(ctx)
  await stub.fetch('https://session-revocation/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tokenHash, expiresAtMs }),
  })
}

export const isTokenHashRevoked = async (ctx: Context<HonoEnv>, tokenHash: string): Promise<boolean> => {
  if (!tokenHash) return false
  const stub = getStub(ctx)
  const res = await stub.fetch(`https://session-revocation/check?tokenHash=${encodeURIComponent(tokenHash)}`)
  const data = (await res.json().catch(() => null)) as any
  return !!data?.revoked
}
