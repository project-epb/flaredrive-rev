import { R2BucketClient } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { c } from 'naive-ui'

export const useBucketStore = defineStore('bucket', () => {
  const client = new R2BucketClient()
  const CDN_BASE_URL = new URL(import.meta.env.VITE_CDN_BASE_URL || '', window.location.origin)
  const FLARE_DRIVE_HIDDEN_KEY = import.meta.env.VITE_FLARE_DRIVE_HIDDEN_KEY || '_$flaredrive$'
  const RANDOM_UPLOAD_DIR = import.meta.env.VITE_RANDOM_UPLOAD_DIR || ''

  console.info('FlareDrive Env', {
    CDN_BASE_URL: CDN_BASE_URL.toString(),
    FLARE_DRIVE_HIDDEN_KEY,
    RANDOM_UPLOAD_DIR,
  })

  const checkIsRandomUploadDir = (key: string) => {
    return (
      RANDOM_UPLOAD_DIR &&
      RANDOM_UPLOAD_DIR.endsWith('/') &&
      RANDOM_UPLOAD_DIR !== '/' &&
      key.startsWith(RANDOM_UPLOAD_DIR)
    )
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
  const deleteFile = async (key: string) => {
    await client.delete(key)
    // Remove from upload history
    uploadHistory.value = uploadHistory.value.filter((item) => item.key !== key)
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
    const version = typeof payload === 'string' ? '' : payload.version
    if (!filePath) {
      return ''
    }
    const url = new URL(filePath, CDN_BASE_URL)
    version && url.searchParams.set('v', version)
    return url.toString()
  }
  const getThumbnailUrl = (item: R2Object): { square: string; small: string; medium: string; large: string } | null => {
    if (!item || item.key.endsWith('/')) {
      return null
    }
    if (
      !item.httpMetadata?.contentType?.startsWith('image/') &&
      !item.httpMetadata?.contentType?.startsWith('video/')
    ) {
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

  const uploadOne = async (key: string, file: File) => {
    const fileHash = await FileHelper.blobToSha1(file)
    const ext = file.name.split('.').pop() || file.type.split('/')[1] || ''

    const metadata: Record<string, string> = {}
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      try {
        const thumbBlob = await FileHelper.generateThumbnail(file)
        await client.upload(`${FLARE_DRIVE_HIDDEN_KEY}/thumbnails/${fileHash}.png`, thumbBlob)
        metadata['thumbnail'] = fileHash
        console.info('Thumbnail generated', file, fileHash)
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

    console.info('Now uploading', key, file, { metadata })

    const res = await client.upload(key, file, {
      metadata,
    })
    console.info('Upload complete', res)
    if (res.data) {
      addToUploadHistory(res.data)
    }
    return res
  }

  const MAX_UPLOAD_BATCH = 10
  const uploadQueue = ref<{ file: File; key: string }[]>([])
  const currentUploading = ref<{ file: File; key: string; promise: Promise<R2Object> }[]>([])
  const uploadFailedList = ref<
    {
      key: string
      file: File
      error: Error
    }[]
  >([])
  // Process the upload queue
  const processUploadQueue = () => {
    while (uploadQueue.value.length > 0 && currentUploading.value.length < MAX_UPLOAD_BATCH) {
      const item = uploadQueue.value.shift()
      if (!item) {
        break
      }
      const promise = uploadOne(item.key, item.file).then(({ data }) => data)
      currentUploading.value.push({ file: item.file, key: item.key, promise })
      promise
        .catch((error) => {
          console.error('Upload failed', item.key, item.file, error)
          uploadFailedList.value.push({
            key: item.key,
            file: item.file,
            error,
          })
        })
        .finally(() => {
          currentUploading.value = currentUploading.value.filter((i) => i.key !== item.key)
          // Process more items when one completes
          processUploadQueue()
        })
    }
  }
  // Watch the queue and start processing when items are added
  watch(
    computed(() => uploadQueue.value.length),
    (newLength, oldLength) => {
      if (newLength > oldLength) {
        processUploadQueue()
      }
    }
  )

  const addToUploadQueue = (file: File, key: string) => {
    uploadQueue.value = uploadQueue.value.filter((i) => i.key !== key)
    uploadQueue.value = [...uploadQueue.value, { file, key }]
    return uploadQueue.value
  }

  return {
    client,
    checkIsRandomUploadDir,
    list,
    createFolder,
    uploadOne,
    deleteFile,
    rename,
    getCDNUrl,
    getThumbnailUrl,
    uploadHistory,
    uploadQueue,
    currentUploading,
    uploadFailedList,
    addToUploadQueue,
  }
})
