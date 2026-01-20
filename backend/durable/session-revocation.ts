import type { DurableObjectState } from '@cloudflare/workers-types/2023-07-01'

type RevokePayload = {
  tokenHash: string
  expiresAtMs: number
}

const keyFor = (tokenHash: string) => `revoked:${tokenHash}`

export class SessionRevocationDO {
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/check') {
      const tokenHash = url.searchParams.get('tokenHash') || ''
      if (!tokenHash) return Response.json({ revoked: false })

      const stored = await this.state.storage.get<number>(keyFor(tokenHash))
      if (typeof stored !== 'number') {
        return Response.json({ revoked: false })
      }

      const now = Date.now()
      if (stored <= now) {
        await this.state.storage.delete(keyFor(tokenHash))
        return Response.json({ revoked: false })
      }

      return Response.json({ revoked: true, expiresAtMs: stored })
    }

    if (request.method === 'POST' && url.pathname === '/revoke') {
      const body = (await request.json().catch(() => null)) as RevokePayload | null
      const tokenHash = body?.tokenHash || ''
      const expiresAtMs = Number(body?.expiresAtMs)

      if (!tokenHash || !Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
        return Response.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
      }

      await this.state.storage.put(keyFor(tokenHash), expiresAtMs)
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
