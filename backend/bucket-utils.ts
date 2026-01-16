import type { Context } from 'hono'

export type BucketInfo = {
  name: string
  cdnBaseUrl: string
}

type EnvRecord = Record<string, unknown>

export const isR2Bucket = (value: unknown): value is R2Bucket => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const bucket = value as R2Bucket
  return (
    typeof bucket.list === 'function' &&
    typeof bucket.get === 'function' &&
    typeof bucket.put === 'function' &&
    typeof bucket.delete === 'function'
  )
}

export const getBucketBindings = (env: EnvRecord) => {
  const buckets: Record<string, R2Bucket> = {}
  Object.entries(env || {}).forEach(([key, value]) => {
    if (isR2Bucket(value)) {
      buckets[key] = value
    }
  })
  return buckets
}

const getDefaultBucketName = (buckets: Record<string, R2Bucket>) => {
  if (buckets.BUCKET) {
    return 'BUCKET'
  }
  return Object.keys(buckets)[0] || ''
}

const getDefaultBucket = (buckets: Record<string, R2Bucket>) => {
  const defaultName = getDefaultBucketName(buckets)
  return defaultName ? buckets[defaultName] : undefined
}

export const normalizeBaseUrl = (value: string) => {
  if (!value) return ''
  return value.endsWith('/') ? value : `${value}/`
}

export const getBucketCdnBaseUrl = (env: EnvRecord, bucketName: string) => {
  const cdnKey = `${bucketName}_CDN`
  const cdnValue = env[cdnKey]
  if (typeof cdnValue !== 'string' || !cdnValue) {
    return ''
  }
  return normalizeBaseUrl(cdnValue)
}

export const getBucketInfoList = (env: EnvRecord): BucketInfo[] => {
  const buckets = getBucketBindings(env)
  return Object.keys(buckets)
    .sort()
    .map((name) => {
      const cdnBaseUrl = getBucketCdnBaseUrl(env, name) || normalizeBaseUrl(`/api/raw/${name}/`)
      return {
        name,
        cdnBaseUrl,
      }
    })
}

export const resolveBucketRequest = (ctx: Context, baseSegment: 'bucket' | 'raw') => {
  const env = ctx.env as EnvRecord
  const buckets = getBucketBindings(env)
  const fullPath = ctx.req.path.split(`/${baseSegment}/`).slice(1).join(`/${baseSegment}/`)
  const normalizedPath = fullPath || ''
  if (!normalizedPath) {
    return {
      bucketName: getDefaultBucketName(buckets),
      bucket: getDefaultBucket(buckets),
      path: '',
    }
  }
  const [firstSegment, ...rest] = normalizedPath.split('/')
  if (firstSegment && buckets[firstSegment]) {
    return {
      bucketName: firstSegment,
      bucket: buckets[firstSegment],
      path: rest.join('/'),
    }
  }
  return {
    bucketName: getDefaultBucketName(buckets),
    bucket: getDefaultBucket(buckets),
    path: normalizedPath,
  }
}
