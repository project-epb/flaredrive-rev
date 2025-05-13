import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import {
  IconFileMusic,
  IconFileTypeBmp,
  IconFileTypeCss,
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypeJs,
  IconFileTypePdf,
  IconFileTypePng,
  IconFileTypePpt,
  IconFileTypeSvg,
  IconFileTypeTs,
  IconFileTypeTxt,
  IconFileTypeXls,
  IconFileUnknown,
  IconFileZip,
  IconFolderFilled,
  IconFolderRoot,
  IconFolderUp,
  IconGif,
  IconMovie,
  IconPhoto,
} from '@tabler/icons-vue'

export namespace FileHelper {
  export const THUMBNAIL_SIZE = 256

  /**
   * @returns width, height, sha1, thumbnailBlob
   */
  export async function getMediaFileMetadata(file: File) {
    if (!checkIsMediaFile(file)) {
      throw new TypeError('Unsupported file type')
    }
    const { width, height } = await getMediaFileNaturalSize(file)
    const thumbnail = await generateMediaFileThumbnail(file)
    const sha1 = await blobToSha1(file)
    return {
      width,
      height,
      sha1,
      thumbnail,
    }
  }

  function checkIsMediaFile(file: File) {
    return file && file.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))
  }

  const NATURAL_SIZE_CACHES = new WeakMap<File, { width: number; height: number }>()
  export async function getMediaFileNaturalSize(file: File) {
    if (NATURAL_SIZE_CACHES.has(file)) {
      return NATURAL_SIZE_CACHES.get(file)!
    }
    if (!checkIsMediaFile(file)) {
      throw new TypeError('Unsupported file type')
    }
    let width = 0
    let height = 0
    if (file.type.startsWith('image/')) {
      const image = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.src = URL.createObjectURL(file)
      })
      width = image.naturalWidth
      height = image.naturalHeight
    } else if (file.type.startsWith('video/')) {
      const video = await new Promise<HTMLVideoElement>((resolve) => {
        const video = document.createElement('video')
        video.muted = true
        video.src = URL.createObjectURL(file)
        video.onloadedmetadata = () => resolve(video)
      })
      width = video.videoWidth
      height = video.videoHeight
    }
    NATURAL_SIZE_CACHES.set(file, { width, height })
    return {
      width,
      height,
    }
  }

  const THUMB_CACHES = new WeakMap<File, { blob: Blob; width: number; height: number }>()
  export async function generateMediaFileThumbnail(file: File) {
    if (THUMB_CACHES.has(file)) {
      return THUMB_CACHES.get(file)!
    }
    const canvas = document.createElement('canvas')
    canvas.width = THUMBNAIL_SIZE
    canvas.height = THUMBNAIL_SIZE
    const ctx = canvas.getContext('2d')!
    const objectUrl = URL.createObjectURL(file)

    try {
      // Image
      if (file.type.startsWith('image/')) {
        const image = await new Promise<HTMLImageElement>((resolve) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.src = objectUrl
        })
        const { width, height } = computeThumbPixel({
          width: image.naturalWidth,
          height: image.naturalHeight,
          maxWidth: THUMBNAIL_SIZE,
          maxHeight: THUMBNAIL_SIZE,
          fit: 'contain',
        })
        canvas.width = width
        canvas.height = height
        ctx.drawImage(image, 0, 0, width, height)
      }
      // Video
      else if (file.type.startsWith('video/')) {
        const video = await new Promise<HTMLVideoElement>(async (resolve, reject) => {
          const video = document.createElement('video')
          video.muted = true
          video.src = objectUrl
          setTimeout(() => reject(new Error('Video load timeout')), 2000)
          await video.play()
          video.pause()
          video.currentTime = 0
          const canPlay = video.canPlayType(file.type)
          if (canPlay) {
            resolve(video)
          } else {
            reject(new Error('Failed to play video'))
          }
        })
        const { width, height } = computeThumbPixel({
          width: video.videoWidth,
          height: video.videoHeight,
          maxWidth: THUMBNAIL_SIZE,
          maxHeight: THUMBNAIL_SIZE,
          fit: 'contain',
        })
        canvas.width = width
        canvas.height = height
        ctx.drawImage(video, 0, 0, width, height)
      } else {
        throw new Error('Unsupported file type')
      }

      const thumbnailBlob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
      const payload = {
        blob: thumbnailBlob!,
        width: canvas.width,
        height: canvas.height,
      }

      THUMB_CACHES.set(file, payload)
      return payload
    } finally {
      URL.revokeObjectURL(objectUrl)
      canvas.remove()
    }
  }

  /**
   * Utility function to compute thumbnail pixel size
   */
  function computeThumbPixel({
    width,
    height,
    maxWidth,
    maxHeight,
    fit,
  }: {
    width: number
    height: number
    maxWidth: number
    maxHeight: number
    fit?: 'cover' | 'contain'
  }) {
    let scale = 1
    if (width > maxWidth || height > maxHeight) {
      scale = Math.min(maxWidth / width, maxHeight / height)
    } else if (fit === 'cover') {
      scale = Math.max(maxWidth / width, maxHeight / height)
    } else if (fit === 'contain') {
      scale = Math.min(maxWidth / width, maxHeight / height)
    }
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    }
  }

  const SHA1_CACHES = new WeakMap<Blob, string>()
  export async function blobToSha1(blob: Blob) {
    if (SHA1_CACHES.has(blob)) {
      return SHA1_CACHES.get(blob)!
    }
    const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer())
    const digestArray = Array.from(new Uint8Array(digest))
    const digestHex = digestArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    SHA1_CACHES.set(blob, digestHex)
    return digestHex
  }

  export function createFolderObject(key: string) {
    return {
      key,
      customMetadata: {
        __is_dir__: true,
        __is_folder__: true,
      },
      httpMetadata: {},
      uploaded: new Date(0).toISOString(),
      size: 0,
      etag: '',
      httpEtag: '',
      version: '',
      storageClass: '',
      checksums: null as any,
      _isDir: true,
    } as unknown as R2Object
  }

  export function getObjectIcon(item: R2Object) {
    if (item.key === '/') {
      return IconFolderRoot
    }
    if (item.key === '../') {
      return IconFolderUp
    }
    if (item.key.endsWith('/')) {
      return IconFolderFilled
    }

    const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
    const fileName = item.key.split('/').pop() || ''
    const ext = fileName.toLocaleLowerCase().split('.').pop() || contentType.split('/').pop() || ''

    if (contentType === 'text/plain') {
      return IconFileTypeTxt
    }
    if (contentType.startsWith('image/')) {
      switch (ext) {
        case 'bmp':
          return IconFileTypeBmp
        case 'gif':
          return IconGif
        case 'jpg':
        case 'jpeg':
          return IconFileTypeJpg
        case 'png':
          return IconFileTypePng
        case 'svg':
          return IconFileTypeSvg
      }
      return IconPhoto
    }
    if (contentType.startsWith('video/')) {
      return IconMovie
    }
    if (contentType.startsWith('audio/')) {
      return IconFileMusic
    }

    // offiece files
    if (['doc', 'docx'].includes(ext)) {
      return IconFileTypeDocx
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return IconFileTypeXls
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return IconFileTypePpt
    }

    // adobe files
    if (['pdf'].includes(ext)) {
      return IconFileTypePdf
    }

    // codes
    if (['js', 'jsx'].includes(ext) && contentType.startsWith('text/')) {
      return IconFileTypeJs
    }
    if (['ts', 'tsx'].includes(ext) && contentType.startsWith('text/')) {
      return IconFileTypeTs
    }
    if (['css', 'sass', 'less', 'scss'].includes(ext) && contentType.startsWith('text/')) {
      return IconFileTypeCss
    }

    // archive files zip/rar/7z/tar/...
    if (
      contentType.startsWith('application/zip') ||
      contentType.startsWith('application/x-zip-compressed') ||
      contentType.startsWith('application/x-zip') ||
      contentType.startsWith('application/x-rar-compressed') ||
      contentType.startsWith('application/x-7z-compressed') ||
      contentType.startsWith('application/x-tar') ||
      contentType.startsWith('application/gzip') ||
      contentType.startsWith('application/x-gzip') ||
      contentType.startsWith('application/x-bzip2') ||
      contentType.startsWith('application/x-xz')
    ) {
      return IconFileZip
    }

    return IconFileUnknown
  }

  export function formatFileSize(size: number = 0) {
    size = parseFloat(size as any)
    if (isNaN(size) || size < 0) {
      return '0.00 B'
    }
    let unit = 'B'
    while (size > 1024) {
      size /= 1024
      if (unit === 'B') unit = 'KB'
      else if (unit === 'KB') unit = 'MB'
      else if (unit === 'MB') unit = 'GB'
      else if (unit === 'GB') unit = 'TB'
      else break
    }
    return `${size.toFixed(2)} ${unit}`
  }

  export function parseFileName(item: R2Object | null | undefined) {
    if (!item) {
      return {
        key: '',
        path: '',
        name: '',
        shortName: '',
        ext: '',
        contentType: '',
      }
    }
    const fullName = item.key.split('/').pop() || ''
    const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
    const ext = fullName.split('.').pop() || contentType.split('/').pop()?.split('-').pop() || ''
    const shortName = fullName.slice(0, fullName.length - ext.length - 1)
    return {
      key: item.key,
      path: item.key.split('/').slice(0, -1).join('/'),
      name: fullName,
      shortName,
      ext,
      contentType,
    }
  }
}
