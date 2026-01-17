import { type BucketInfo, R2BucketClient, type StorageListObject } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import fexios from 'fexios'
import PQueue from 'p-queue'

export const useBucketStore = defineStore('bucket', () => {
  const client = new R2BucketClient()

  console.info('FlareDrive Env', {
    CDN_BASE_URL,
    FLARE_DRIVE_HIDDEN_KEY,
    RANDOM_UPLOAD_DIR,
    BATCH_UPLOAD_CONCURRENCY,
  })

  const checkIsRandomUploadDir = (key: string) => {
    return (
      RANDOM_UPLOAD_DIR &&
      RANDOM_UPLOAD_DIR.endsWith('/') &&
      RANDOM_UPLOAD_DIR !== '/' &&
      key.startsWith(RANDOM_UPLOAD_DIR)
    )
  }
  const checkIsHiddenDir = (key: string) => {
    return FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.startsWith(FLARE_DRIVE_HIDDEN_KEY + '/')
  }
  const checkIsHiddenFile = (key: string) => {
    return FLARE_DRIVE_HIDDEN_KEY && FLARE_DRIVE_HIDDEN_KEY !== '/' && key.endsWith(FLARE_DRIVE_HIDDEN_KEY)
  }

  const THUMBNAIL_PREFIX = `${FLARE_DRIVE_HIDDEN_KEY}/thumbnails/by-key/`
  const thumbnailKeyCache = shallowRef<Record<string, string>>({})
  const sha1Hex = async (value: string) => {
    if (!globalThis.crypto?.subtle) {
      return FileHelper.blobToSha1(new Blob([value]))
    }
    const data = new TextEncoder().encode(value)
    const digest = await globalThis.crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  const getThumbnailKey = async (key: string) => {
    const cached = thumbnailKeyCache.value[key]
    if (cached) return cached
    const hashed = await sha1Hex(key)
    const thumbKey = `${THUMBNAIL_PREFIX}${hashed}.png`
    thumbnailKeyCache.value = {
      ...thumbnailKeyCache.value,
      [key]: thumbKey,
    }
    return thumbKey
  }
  const isMediaObject = (item: StorageListObject) => {
    const isImage =
      item.httpMetadata?.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(item.key)
    const isVideo =
      item.httpMetadata?.contentType?.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(item.key)
    return { isImage, isVideo, isMedia: isImage || isVideo }
  }

  const currentBucketName = ref('')
  const availableBuckets = ref<BucketInfo[]>([])
  const isBucketListLoading = ref(false)
  const bucketCdnMap = ref<Record<string, string>>({})

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
      return availableBuckets.value
    } catch (error) {
      console.error('Failed to fetch bucket list', error)
      availableBuckets.value = []
      bucketCdnMap.value = {}
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
    // delete thumbnail if needed
    const mediaInfo = isMediaObject(item)
    if (mediaInfo.isMedia) {
      const thumbKey = await getThumbnailKey(item.key)
      client.delete(thumbKey).catch((e) => {
        // ignore error, this is not critical
        console.error('Error deleting thumbnail', item, e)
      })
    }
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
  const getThumbnailUrls = (
    item: StorageListObject,
    strict = false
  ): { square: string; small: string; medium: string; large: string } | null => {
    if (!item || item.key.endsWith('/')) {
      return null
    }
    const { isMedia } = isMediaObject(item)

    if (!isMedia) {
      return null
    }
    const cached = thumbnailKeyCache.value[item.key]
    if (!cached) {
      getThumbnailKey(item.key).catch((e) => console.error('Error hashing thumbnail key', item, e))
      return null
    }
    const square = getCDNUrl(cached)
    return {
      square,
      small: square,
      medium: square,
      large: square,
    }
  }

  const UPLOAD_HISTORY_MAX = 1000
  const uploadHistory = useLocalStorage<StorageListObject[]>('flaredrive:upload-history', [])
  const addToUploadHistory = (item: StorageListObject) => {
    console.info('Upload history', item)
    uploadHistory.value = [item, ...uploadHistory.value.filter((i) => i.key !== item.key)]
    if (uploadHistory.value.length > UPLOAD_HISTORY_MAX) {
      uploadHistory.value = uploadHistory.value.slice(0, UPLOAD_HISTORY_MAX)
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
    // 0. Prepare
    const fileHash = await FileHelper.blobToSha1(file)
    const { ext } = FileHelper.getSimpleFileInfoByFile(file)
    const isMediaFile = FileHelper.checkIsMediaFile(file)
    const contentType = file.type || 'application/octet-stream'

    let targetKey = key

    // 1. Handle thumbnails (optional/parallel)
    if (isMediaFile) {
      try {
        const size = await FileHelper.getMediaFileNaturalSize(file)
        metadata['width'] = size.width.toString()
        metadata['height'] = size.height.toString()
      } catch (e) {
        console.warn('Error getting media file size', file, e)
      }
    }

    if (checkIsRandomUploadDir(key) && !options?.ignoreRandom) {
      const hashFirst = fileHash.slice(0, 1)
      const hashSecond = fileHash.slice(0, 2)
      targetKey = `${RANDOM_UPLOAD_DIR}${hashFirst}/${hashSecond}/${fileHash}${ext ? '.' + ext : ''}`
      metadata['original_name'] = file.name
    }

    // 1.5 Upload thumbnail (deterministic key, no metadata dependency)
    if (isMediaFile) {
      try {
        const { blob } = await FileHelper.generateMediaFileThumbnail(file)
        const thumbnailKey = await getThumbnailKey(targetKey)
        await client.upload(thumbnailKey, blob, {
          contentType: 'image/png',
          metadata: {
            __flare_drive_internal__: '1',
          },
        })
      } catch (e) {
        console.error('Error generating thumbnail', file, e)
      }
    }

    console.info('Upload start', targetKey, file, { metadata })

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
    })

    // 4. Record History
    await recordUpload(targetKey, file.size, contentType)

    // 5. Construct Result for frontend
    const result = {
      key: targetKey,
      size: file.size,
      etag: '', // Cannot get etag easily from PUT response unless exposing ETag header
      uploaded: new Date().toISOString() as any, // Approximation
      httpMetadata: {
        contentType,
      },
      customMetadata: metadata as any,
    } as unknown as StorageListObject

    console.info('Upload finish', targetKey, file, result)
    addToUploadHistory(result)
    return { data: result }
  }

  // ---- Upload Queue ----
  const uploadQueue = new PQueue({
    concurrency: BATCH_UPLOAD_CONCURRENCY,
    interval: 500,
  })
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
    const existing = pendinUploadList.value.find((item) => item.key === key)
    if (existing) {
      console.info('Upload already in queue', key, file)
      existing.abort?.()
    }
    const abortController = new AbortController()
    const abort = () => {
      console.info('Upload aborted', key, file)
      abortController.abort()
      pendinUploadList.value = pendinUploadList.value.filter((item) => item.key !== key)
    }
    pendinUploadList.value.push({
      key,
      abort,
    })
    const handler = async () => {
      if (abortController.signal.aborted) {
        throw new Error('Upload aborted')
      }
      const { data } = await uploadOne(key, file, {}, options).catch((error) => {
        console.error('Upload failed', key, file, error)
        uploadFailedList.value.push({
          key: key,
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
    getThumbnailUrls,
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
