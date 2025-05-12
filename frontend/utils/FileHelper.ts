import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import {
  IconFileMusic,
  IconFileTypeBmp,
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePng,
  IconFileTypePpt,
  IconFileTypeSvg,
  IconFileTypeTxt,
  IconFileTypeXls,
  IconFileTypeZip,
  IconFileUnknown,
  IconFileZip,
  IconFolder,
  IconFolderFilled,
  IconGif,
  IconMovie,
  IconMusic,
  IconPhoto,
} from '@tabler/icons-vue'

export namespace FileHelper {
  export const THUMBNAIL_SIZE = 256

  export async function generateThumbnail(file: File) {
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

      return thumbnailBlob
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

  export async function blobToSha1(blob: Blob) {
    const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer())
    const digestArray = Array.from(new Uint8Array(digest))
    const digestHex = digestArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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
    if (item.key === '/' || item.key === '../') {
      return IconFolder
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
}
