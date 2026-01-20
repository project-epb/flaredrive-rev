import type { Context } from 'hono'
import { buckets as bucketsTable } from '../../db/schema.js'
import { getDb } from './db.js'
import { createStorageAdapter } from '../storage/factory.js'

export type BucketInfo = {
  id: string
  name: string
  cdnBaseUrl: string
}

export const normalizeBaseUrl = (value: string) => {
  if (!value) return ''
  return value.endsWith('/') ? value : `${value}/`
}

export const getBucketInfoList = async (ctx: Context) => {
  const db = getDb(ctx as any)
  const rows = await db
    .select({
      id: bucketsTable.id,
      name: bucketsTable.name,
      cdnBaseUrl: bucketsTable.cdnBaseUrl,
      bucketName: bucketsTable.bucketName,
      endpointUrl: bucketsTable.endpointUrl,
      region: bucketsTable.region,
      forcePathStyle: bucketsTable.forcePathStyle,
    })
    .from(bucketsTable)
    .all()

  return (rows || [])
    .map((r) => ({
      ...r,
      cdnBaseUrl: r.cdnBaseUrl ? normalizeBaseUrl(r.cdnBaseUrl) : normalizeBaseUrl(`/api/raw/${r.id}/`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const isValidKey = (key: string) => {
  if (!key) return false
  if (key.length > 1024) return false
  if (key.startsWith('/')) return false
  if (key.includes('\u0000')) return false
  return true
}

export const createAdapterFromConfig = (cfg: {
  endpointUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  forcePathStyle: number
}) => {
  return createStorageAdapter({
    endpointUrl: cfg.endpointUrl,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    bucketName: cfg.bucketName,
    forcePathStyle: cfg.forcePathStyle,
  })
}
