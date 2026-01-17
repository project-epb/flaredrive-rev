import type { Context } from 'hono'
import { buckets as bucketsTable } from '../../db/schema.js'
import { getDb } from './db.js'

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
    })
    .from(bucketsTable)
    .all()

  return (rows || [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      cdnBaseUrl: r.cdnBaseUrl ? normalizeBaseUrl(r.cdnBaseUrl) : normalizeBaseUrl(`/api/raw/${r.id}/`),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
