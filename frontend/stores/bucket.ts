import { R2BucketClient } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
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
  const deleteFile = async (item: R2Object) => {
    await client.delete(item.key)
    // Remove from upload history
    uploadHistory.value = uploadHistory.value.filter((h) => item.key !== h.key)
    // delete thumbnail if needed
    if (item.customMetadata?.thumbnail) {
      client.delete(`${FLARE_DRIVE_HIDDEN_KEY}/thumbnails/${item.customMetadata.thumbnail}.png`).catch((e) => {
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

  const getCDNUrl = (payload: R2Object | string) => {
    if (!payload) {
      return ''
    }
    const filePath = typeof payload === 'string' ? payload : payload.key
    if (!filePath) {
      return ''
    }
    const url = new URL(filePath, CDN_BASE_URL)
    return url.toString()
  }
  const getThumbnailUrls = (
    item: R2Object,
    strict = false
  ): { square: string; small: string; medium: string; large: string } | null => {
    if (!item || item.key.endsWith('/')) {
      return null
    }
    if (
      !item.httpMetadata?.contentType?.startsWith('image/') &&
      !item.httpMetadata?.contentType?.startsWith('video/')
    ) {
      return null
    }
    if (strict && !item.customMetadata?.thumbnail) {
      return null
    }
    const makeCgiUrl = (size: number) => {
      const url = new URL(getCDNUrl(item.key))
      if (import.meta.env.DEV) {
        url.search = `thumbsize=${size}`
        return url.href
      }
      url.pathname = `/cdn-cgi/image/format=auto,fit=contain,width=${size},height=${size},onerror=redirect${url.pathname}`
      return url.href
    }
    const square = item.customMetadata?.thumbnail
      ? getCDNUrl(`${FLARE_DRIVE_HIDDEN_KEY}/thumbnails/${item.customMetadata.thumbnail}.png`)
      : ''
    if (item.httpMetadata?.contentType?.startsWith('video/')) {
      return square
        ? {
            square,
            small: square,
            medium: square,
            large: square,
          }
        : null
    }
    const small = makeCgiUrl(256)
    const medium = makeCgiUrl(400)
    const large = makeCgiUrl(800)
    return {
      square,
      small,
      medium,
      large,
    }
  }

  const UPLOAD_HISTORY_MAX = 1000
  const uploadHistory = useLocalStorage<R2Object[]>('flaredrive:upload-history', [])
  const addToUploadHistory = (item: R2Object) => {
    console.info('Upload history', item)
    uploadHistory.value = [item, ...uploadHistory.value.filter((i) => i.key !== item.key)]
    if (uploadHistory.value.length > UPLOAD_HISTORY_MAX) {
      uploadHistory.value = uploadHistory.value.slice(0, UPLOAD_HISTORY_MAX)
    }
  }

  const uploadOne = async (key: string, file: File, metadata: Record<string, string> = {}) => {
    const fileHash = await FileHelper.blobToSha1(file)
    const { ext } = FileHelper.getSimpleFileInfoByFile(file)
    const isMediaFile = FileHelper.checkIsMediaFile(file)

    if (isMediaFile) {
      try {
        const size = await FileHelper.getMediaFileNaturalSize(file)
        metadata['width'] = size.width.toString()
        metadata['height'] = size.height.toString()
      } catch (e) {
        console.warn('Error getting media file size', file, e)
      }
      try {
        const mediaMeta = await FileHelper.getMediaFileMetadata(file)
        await client.upload(`${FLARE_DRIVE_HIDDEN_KEY}/thumbnails/${fileHash}.png`, mediaMeta.thumbnail.blob, {
          metadata: {
            width: mediaMeta.thumbnail.width.toString(),
            height: mediaMeta.thumbnail.height.toString(),
          },
        })
        metadata['thumbnail'] = mediaMeta.sha1
        metadata['thumbnail_width'] = mediaMeta.thumbnail.width.toString()
        metadata['thumbnail_height'] = mediaMeta.thumbnail.height.toString()
      } catch (e) {
        console.error('Error generating thumbnail', file, e)
      }
    }
    if (checkIsRandomUploadDir(key)) {
      const hashFirst = fileHash.slice(0, 1)
      const hashSecond = fileHash.slice(0, 2)
      key = `${RANDOM_UPLOAD_DIR}${hashFirst}/${hashSecond}/${fileHash}${ext ? '.' + ext : ''}`
      metadata['original_name'] = file.name
    }

    console.info('Upload start', key, file, { metadata })
    const res = await client.upload(key, file, {
      metadata,
    })
    console.info('Upload finish', key, file, res)
    if (res.data) {
      addToUploadHistory(res.data)
    }
    return res
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

  const addToUploadQueue = (key: string, file: File) => {
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
      const { data } = await uploadOne(key, file).catch((error) => {
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
  }
})
