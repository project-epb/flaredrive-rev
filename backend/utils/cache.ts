import type { KVNamespace } from '@cloudflare/workers-types/2023-07-01'
import type { Context } from 'hono'
import { env } from 'hono/adapter'
import type { HonoEnv } from '../index.js'

type MemoryEntry = {
  value: string
  expiresAt: number
}

const memory = new Map<string, MemoryEntry>()

const nowMs = () => Date.now()

const getKv = (ctx: Context<HonoEnv>): KVNamespace | null => {
  try {
    const kv = env(ctx).KV as KVNamespace | undefined
    return kv || null
  } catch {
    return null
  }
}

const memoryGet = (key: string) => {
  const entry = memory.get(key)
  if (!entry) return null
  if (entry.expiresAt <= nowMs()) {
    memory.delete(key)
    return null
  }
  return entry.value
}

const memorySet = (key: string, value: string, ttlSeconds: number) => {
  const ttlMs = Math.max(0, ttlSeconds) * 1000
  memory.set(key, { value, expiresAt: nowMs() + ttlMs })
}

export type CachePutOptions = {
  /** KV TTL (seconds). */
  ttlSeconds: number
  /** Optional memory TTL (seconds). Defaults to min(5s, ttlSeconds). */
  memoryTtlSeconds?: number
}

export const cacheGetString = async (ctx: Context<HonoEnv>, key: string): Promise<string | null> => {
  const mem = memoryGet(key)
  if (mem !== null) return mem

  const kv = getKv(ctx)
  if (!kv) return null

  try {
    const value = await kv.get(key)
    if (typeof value === 'string') {
      // Super-short memory layer to shave off repeated KV reads in bursts.
      memorySet(key, value, 3)
      return value
    }
    return null
  } catch {
    return null
  }
}

export const cacheGetJson = async <T>(ctx: Context<HonoEnv>, key: string): Promise<T | null> => {
  const raw = await cacheGetString(ctx, key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    // Corrupted cache entry; ignore.
    return null
  }
}

export const cachePutJson = async (ctx: Context<HonoEnv>, key: string, value: unknown, options: CachePutOptions) => {
  const kv = getKv(ctx)
  if (!kv) return

  const ttlSeconds = Math.max(0, Math.floor(options.ttlSeconds))
  const memoryTtlSeconds =
    typeof options.memoryTtlSeconds === 'number'
      ? Math.max(0, Math.floor(options.memoryTtlSeconds))
      : Math.min(5, ttlSeconds)

  try {
    const serialized = JSON.stringify(value)
    if (memoryTtlSeconds > 0) memorySet(key, serialized, memoryTtlSeconds)

    if (ttlSeconds > 0) {
      await kv.put(key, serialized, { expirationTtl: ttlSeconds })
    } else {
      await kv.put(key, serialized)
    }
  } catch {
    // Best-effort cache write; ignore errors.
  }
}

export const cacheDelete = async (ctx: Context<HonoEnv>, key: string) => {
  memory.delete(key)

  const kv = getKv(ctx)
  if (!kv) return

  try {
    await kv.delete(key)
  } catch {
    // ignore
  }
}
