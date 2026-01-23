import { type BucketInfo, BucketClient, type StorageListObject } from '@/models/BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import fexios from 'fexios'
import PQueue from 'p-queue'

export const useBucketStore = defineStore('bucket', () => {
  const client = new BucketClient()
  const site = useSiteStore()

  const getRandomUploadDir = () => {
    const raw = (site.randomUploadDir || '').toString().trim()
    if (!raw || raw === '/') return ''
    const dir = raw.replace(/^\/+/, '')
    return dir && !dir.endsWith('/') ? `${dir}/` : dir
  }

  const getBatchUploadConcurrency = () => {
    const n = Number(site.batchUploadConcurrency)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return 10
    return Math.min(64, n)
  }

  const getUploadHistoryLimit = () => {
    const n = Number(site.uploadHistoryLimit)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 1000
    return Math.min(100_000, n)
  }

  const checkIsRandomUploadDir = (key: string) => {
    const dir = getRandomUploadDir()
    return dir && dir.endsWith('/') && dir !== '/' && key.startsWith(dir)
  }
  const checkIsHiddenDir = (key: string) => {
    return FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.startsWith(FLARE_DRIVE_HIDDEN_KEY + '/')
  }
  const checkIsHiddenFile = (key: string) => {
    return FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.endsWith(FLARE_DRIVE_HIDDEN_KEY)
  }

  const currentBucketName = ref('')
  const currentBucketInfo = computed(() => {
    return availableBuckets.value.find((b) => b.id === currentBucketName.value) || null
  })
  const availableBuckets = ref<BucketInfo[]>([])
  const isBucketListLoading = ref(false)
  const bucketCdnMap = ref<Record<string, string>>({})
  const bucketEdgeThumbnailMap = ref<Record<string, string>>({})
  const bucketUploadMethodMap = ref<Record<string, 'presigned' | 'proxy'>>({})

  const normalizeCdnBaseUrl = (value: string) => {
    if (!value) return ''
    let normalized = value
    if (typeof window !== 'undefined') {
      normalized = new URL(value, window.location.origin).toString()
    }
    return normalized.endsWith('/') ? normalized : `${normalized}/`
  }

  const setCurrentBucket = (bucketId: string) => {
    currentBucketName.value = bucketId || ''
    const baseUrl = bucketId ? `/api/bucket/${bucketId}/` : '/api/bucket/'
    client.setBaseURL(baseUrl)
  }

  const fetchBucketList = async () => {
    if (isBucketListLoading.value) {
      return availableBuckets.value
    }
    isBucketListLoading.value = true
    try {
      const { data } = await fexios.get<BucketInfo[]>('/api/buckets')
      availableBuckets.value = data || []
      bucketCdnMap.value = (data || []).reduce(
        (acc, item) => {
          if (item?.id) {
            acc[item.id] = normalizeCdnBaseUrl(item.cdnBaseUrl || '')
          }
          return acc
        },
        {} as Record<string, string>
      )
      bucketEdgeThumbnailMap.value = (data || []).reduce(
        (acc, item) => {
          if (item?.id && item?.edgeThumbnailUrl) {
            acc[item.id] = item.edgeThumbnailUrl
          }
          return acc
        },
        {} as Record<string, string>
      )
      bucketUploadMethodMap.value = (data || []).reduce(
        (acc, item) => {
          if (item?.id) {
            acc[item.id] = item.uploadMethod === 'proxy' ? 'proxy' : 'presigned'
          }
          return acc
        },
        {} as Record<string, 'presigned' | 'proxy'>
      )
      return availableBuckets.value
    } catch (error) {
      console.error('Failed to fetch bucket list', error)
      availableBuckets.value = []
      bucketCdnMap.value = {}
      bucketUploadMethodMap.value = {}
      return availableBuckets.value
    } finally {
      isBucketListLoading.value = false
    }
  }

  const list = async (
    prefix: string,
    options?: { delimiter?: string; limit?: number; startAfter?: string },
    showHidden = false
  ) => {
    const response = await client.list(prefix, options)
    response.data.objects = response.data.objects.filter((item) => {
      if (showHidden) {
        return true
      }
      // Filter out hidden files
      if (item.key === FLARE_DRIVE_HIDDEN_KEY) {
        return false
      }
      return true
    })
    response.data.folders = response.data.folders.filter((folder) => {
      if (showHidden) {
        return true
      }
      // Filter out hidden folders
      if (folder.endsWith(`${FLARE_DRIVE_HIDDEN_KEY}/`)) {
        return false
      }
      return true
    })
    return response
  }
  const deleteFile = async (item: StorageListObject) => {
    await client.delete(item.key)
    // Remove from upload history
    uploadHistory.value = uploadHistory.value.filter((h) => item.key !== h.key)
  }
  const rename = client.rename.bind(client)

  const createFolder = async (key: string) => {
    if (!key.endsWith('/')) {
      key += '/'
    }
    await client.upload(`${key}${FLARE_DRIVE_HIDDEN_KEY}`, '', {
      contentType: 'text/plain',
      metadata: {
        __flare_drive_internal__: '1',
      },
    })
  }

  const getCDNUrl = (payload: StorageListObject | string, bucketName = currentBucketName.value) => {
    if (!payload) {
      return ''
    }
    const filePath = typeof payload === 'string' ? payload : payload.key
    if (!filePath) {
      return ''
    }
    const cdnBaseUrl =
      bucketCdnMap.value[bucketName] || (bucketName ? normalizeCdnBaseUrl(`/api/raw/${bucketName}/`) : CDN_BASE_URL)
    const url = new URL(filePath, cdnBaseUrl)
    return url.toString()
  }

  const getThumbnailUrl = (
    payload: StorageListObject | string,
    width: number,
    height: number,
    bucketName = currentBucketName.value
  ) => {
    if (!payload) return ''
    const filePath = typeof payload === 'string' ? payload : payload.key
    if (!filePath) return ''

    const templateUrl = bucketEdgeThumbnailMap.value[bucketName]
    const configuredCdnUrl = bucketCdnMap.value[bucketName]

    if (templateUrl && configuredCdnUrl) {
      // Replace variables
      return templateUrl
        .replace(/{cdn_base_url}/g, configuredCdnUrl)
        .replace(/{width}/g, width.toString())
        .replace(/{height}/g, height.toString())
        .replace(/{file_key}/g, filePath)
    }

    return getCDNUrl(payload, bucketName)
  }

  const uploadHistory = useLocalStorage<StorageListObject[]>('flaredrive:upload-history', [])
  const uploadHistoryMax = computed(() => getUploadHistoryLimit())

  watch(
    uploadHistoryMax,
    (max) => {
      if (uploadHistory.value.length > max) {
        uploadHistory.value = uploadHistory.value.slice(0, max)
      }
    },
    { immediate: true }
  )

  const addToUploadHistory = (item: StorageListObject) => {
    console.info('Upload history', item)
    uploadHistory.value = [item, ...uploadHistory.value.filter((i) => i.key !== item.key)]
    if (uploadHistory.value.length > uploadHistoryMax.value) {
      uploadHistory.value = uploadHistory.value.slice(0, uploadHistoryMax.value)
    }
  }

  const togglePublic = async (path: string, isPublic: boolean) => {
    try {
      const { data } = await fexios.patch(`/api/bucket/${currentBucketName.value}/${path}`, {
        isPublic,
      })
      // Should probably update the list item state locally too if we had it in store
      return data
    } catch (e) {
      console.error('Failed to toggle public', e)
      throw e
    }
  }

  const recordUpload = async (key: string, size: number, contentType: string) => {
    try {
      if (!currentBucketName.value) return
      await fexios.post(`/api/objects/${currentBucketName.value}/record`, {
        key,
        size,
        contentType,
      })
    } catch (e) {
      console.warn('Failed to record upload history', e)
    }
  }

  const uploadOne = async (
    key: string,
    file: File,
    metadata: Record<string, string> = {},
    options?: { ignoreRandom?: boolean }
  ) => {
    const normalizedKey = key.replace(/^\/+/, '')
    // 0. Prepare
    const fileHash = await FileHelper.blobToSha1(file)
    const { ext } = FileHelper.getSimpleFileInfoByFile(file)
    const isMediaFile = FileHelper.checkIsMediaFile(file)
    const contentType = file.type || 'application/octet-stream'
    const uploadMethod = bucketUploadMethodMap.value[currentBucketName.value] || 'presigned'

    let targetKey = normalizedKey

    // 1. Handle media metadata (width/height only)
    if (isMediaFile) {
      try {
        const size = await FileHelper.getMediaFileNaturalSize(file)
        metadata['width'] = size.width.toString()
        metadata['height'] = size.height.toString()
      } catch (e) {
        console.warn('Error getting media file size', file, e)
      }
    }

    if (checkIsRandomUploadDir(normalizedKey) && !options?.ignoreRandom) {
      const dir = getRandomUploadDir()
      const hashFirst = fileHash.slice(0, 1)
      const hashSecond = fileHash.slice(0, 2)
      targetKey = `${dir}${hashFirst}/${hashSecond}/${fileHash}${ext ? '.' + ext : ''}`
      metadata['original_name'] = file.name
    }

    console.info('Upload start', targetKey, file, { metadata })

    let result: StorageListObject

    if (uploadMethod === 'proxy') {
      const { data } = await client.upload(targetKey, file, {
        contentType,
        metadata,
      })
      result = (data || {
        key: targetKey,
        size: file.size,
        etag: '',
        uploaded: new Date().toISOString() as any,
        httpMetadata: { contentType },
        customMetadata: metadata as any,
      }) as StorageListObject
    } else {
      // 2. Presign Flow: Get URL
      const { data: presignInfo } = await fexios.post(`/api/objects/${currentBucketName.value}/presign`, {
        action: 'put',
        key: targetKey,
        contentType,
      })

      // 3. Direct PUT to S3
      await fexios.put(presignInfo.url, file, {
        headers: {
          'Content-Type': contentType,
        },
        timeout: 0,
      })

      // 4. Record History
      await recordUpload(targetKey, file.size, contentType)

      // 5. Construct Result for frontend
      result = {
        key: targetKey,
        size: file.size,
        etag: '', // Cannot get etag easily from PUT response unless exposing ETag header
        uploaded: new Date().toISOString() as any, // Approximation
        httpMetadata: {
          contentType,
        },
        customMetadata: metadata as any,
      } as unknown as StorageListObject
    }

    console.info('Upload finish', targetKey, file, result)
    addToUploadHistory(result)
    return { data: result }
  }

  // ---- Upload Queue ----
  const uploadQueue = new PQueue({
    concurrency: getBatchUploadConcurrency(),
    interval: 500,
  })

  watch(
    () => site.batchUploadConcurrency,
    () => {
      uploadQueue.concurrency = getBatchUploadConcurrency()
    }
  )
  const isUploading = ref(false)
  const pendingUploadCount = ref(0)
  const currentBatchTotal = ref(0)
  const currentBatchFinished = ref(0)
  const currentBatchPercentage = computed(() => {
    if (currentBatchTotal.value === 0) {
      return 0
    }
    return Math.floor((currentBatchFinished.value / currentBatchTotal.value) * 100)
  })
  uploadQueue.on('add', () => {
    console.info('[queue] add')
    pendingUploadCount.value = uploadQueue.size
    // 添加队列时，如果不处于活跃状态，则重置当前批次的总数和完成数
    if (!isUploading.value) {
      currentBatchTotal.value = 0
      currentBatchFinished.value = 0
    }
    currentBatchTotal.value++
  })
  uploadQueue.on('active', () => {
    console.info('[queue] active')
    pendingUploadCount.value = uploadQueue.size
    isUploading.value = true
  })
  uploadQueue.on('idle', () => {
    console.info('[queue] idle')
    pendingUploadCount.value = 0
    isUploading.value = false
  })
  uploadQueue.on('next', () => {
    pendingUploadCount.value = uploadQueue.size
  })
  uploadQueue.on('completed', () => {
    pendingUploadCount.value = uploadQueue.size
    currentBatchFinished.value++
  })
  uploadQueue.on('error', (ctx) => {
    console.error('[queue] error', ctx)
    pendingUploadCount.value = uploadQueue.size
  })
  uploadQueue.on('empty', () => {
    pendingUploadCount.value = 0
  })

  const pendinUploadList = ref<{ key: string; abort?: () => void }[]>([])
  const uploadFailedList = ref<
    {
      key: string
      file: File
      error: Error
    }[]
  >([])

  const addToUploadQueue = (key: string, file: File, options?: { ignoreRandom?: boolean }) => {
    const normalizedKey = key.replace(/^\/+/, '')
    const existing = pendinUploadList.value.find((item) => item.key === normalizedKey)
    if (existing) {
      console.info('Upload already in queue', normalizedKey, file)
      existing.abort?.()
    }
    const abortController = new AbortController()
    const abort = () => {
      console.info('Upload aborted', normalizedKey, file)
      abortController.abort()
      pendinUploadList.value = pendinUploadList.value.filter((item) => item.key !== normalizedKey)
    }
    pendinUploadList.value.push({
      key: normalizedKey,
      abort,
    })
    const handler = async () => {
      if (abortController.signal.aborted) {
        throw new Error('Upload aborted')
      }
      const { data } = await uploadOne(normalizedKey, file, {}, options).catch((error) => {
        console.error('Upload failed', normalizedKey, file, error)
        uploadFailedList.value.push({
          key: normalizedKey,
          file: file,
          error,
        })
        throw error
      })
      return data
    }
    const promise = uploadQueue.add(handler, { signal: abortController.signal })
    return {
      promise,
      abort,
    }
  }

  return {
    client,
    currentBucketName,
    currentBucketInfo,
    availableBuckets,
    isBucketListLoading,
    setCurrentBucket,
    fetchBucketList,
    checkIsRandomUploadDir,
    checkIsHiddenDir,
    checkIsHiddenFile,
    list,
    createFolder,
    uploadOne,
    deleteFile,
    rename,
    getCDNUrl,
    getThumbnailUrl,
    uploadHistory,
    // uploadQueue: uploadQueue as PQueue, // 类型问题！！
    addToUploadQueue,
    isUploading,
    pendingUploadCount,
    currentBatchTotal,
    currentBatchFinished,
    currentBatchPercentage,
    uploadFailedList,
    togglePublic,
  }
})
