import { nanoid } from 'nanoid'

export type BucketConfigRow = {
  id: string
  ownerUserId: number
  name: string
  cdnBaseUrl: string | null
  endpointUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  forcePathStyle: number
  createdAt: number
}

export const generateBucketId = () => {
  // 3-30 chars requirement; nanoid default alphabet is URL-safe and never includes '@'
  // Use 12 chars for shorter URLs but still collision-resistant for this use-case.
  return nanoid(12)
}

export const normalizeBaseUrl = (value: string) => {
  if (!value) return ''
  return value.endsWith('/') ? value : `${value}/`
}

export const validateBucketConfigInput = (input: any) => {
  const name = (input?.name || '').toString().trim()
  const bucketName = (input?.bucketName || '').toString().trim()
  const endpointUrl = (input?.endpointUrl || '').toString().trim()
  const region = (input?.region || 'auto').toString().trim() || 'auto'
  const accessKeyId = (input?.accessKeyId || '').toString().trim()
  const secretAccessKey = (input?.secretAccessKey || '').toString()
  const cdnBaseUrlRaw = (input?.cdnBaseUrl || '').toString().trim()
  const cdnBaseUrl = cdnBaseUrlRaw ? normalizeBaseUrl(cdnBaseUrlRaw) : ''
  const forcePathStyle = !!input?.forcePathStyle

  if (!name) return { ok: false as const, error: 'Invalid name' }
  if (!bucketName) return { ok: false as const, error: 'Invalid bucketName' }
  if (!endpointUrl) return { ok: false as const, error: 'Invalid endpointUrl' }

  try {
    // eslint-disable-next-line no-new
    new URL(endpointUrl)
  } catch {
    return { ok: false as const, error: 'Invalid endpointUrl' }
  }

  if (!region) return { ok: false as const, error: 'Invalid region' }

  return {
    ok: true as const,
    value: {
      name,
      bucketName,
      endpointUrl,
      region,
      accessKeyId,
      secretAccessKey,
      cdnBaseUrl: cdnBaseUrl || null,
      forcePathStyle: forcePathStyle ? 1 : 0,
    },
  }
}
