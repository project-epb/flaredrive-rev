export interface BucketInfo {
  id: string
  name: string
  cdnBaseUrl?: string
  endpointUrl: string
  region: string
  bucketName: string
  forcePathStyle: number
  createdAt: number
}

export type UIBadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export interface S3ObjectInfo {
  key: string
  size: number
  lastModified: string
  etag?: string
  contentType?: string
}

export interface BrowserItem extends Partial<S3ObjectInfo> {
  key: string
  displayName: string
  isFolder: boolean
  icon: string
  typeLabel: string
  badgeColor: UIBadgeColor
  name?: string
  formattedSize?: string
  formattedDate?: string
  thumbnailUrl?: string
  type?: string
  iconColor?: UIBadgeColor
  sortKey?: string
  cdnUrl?: string
}

export interface ObjectListResponse {
  objects: S3ObjectInfo[]
  prefixes: string[]
  prefix: string
  delimiter: string
  truncated: boolean
  continuationToken?: string
}

export const useBucketStore = defineStore('bucket', () => {
  const currentBucket = ref<BucketInfo | null>(null)
  const currentPath = ref('')
  const buckets = ref<BucketInfo[]>([])

  const setBucket = (bucket: BucketInfo | null) => {
    currentBucket.value = bucket
  }

  const setPath = (path: string) => {
    currentPath.value = path
  }

  const fetchBuckets = async (force = false) => {
    if (!force && buckets.value.length > 0) return buckets.value
    try {
      const res = await $fetch<{ buckets: BucketInfo[] }>('/api/buckets')
      buckets.value = res.buckets
      return buckets.value
    } catch (e) {
      console.error('Failed to fetch buckets', e)
      return []
    }
  }

  const getBucketName = async (id: string) => {
    if (buckets.value.length === 0) {
      await fetchBuckets()
    }
    return buckets.value.find((b) => b.id === id)?.name ?? ''
  }

  return {
    currentBucket,
    currentPath,
    buckets,
    setBucket,
    setPath,
    fetchBuckets,
    getBucketName,
  }
})
