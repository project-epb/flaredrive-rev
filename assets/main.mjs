const THUMBNAIL_SIZE = 256

/**
 * @param {File} file
 */
export async function generateThumbnail(file) {
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_SIZE
  canvas.height = THUMBNAIL_SIZE
  const ctx = canvas.getContext('2d')
  const objectUrl = URL.createObjectURL(file)

  try {
    // Image
    if (file.type.startsWith('image/')) {
      /** @type {HTMLImageElement} */
      const image = await new Promise((resolve) => {
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
      /** @type {HTMLVideoElement} */
      const video = await new Promise(async (resolve, reject) => {
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
    }

    /** @type Blob */
    const thumbnailBlob = await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob))
    )

    return thumbnailBlob
  } finally {
    URL.revokeObjectURL(objectUrl)
    canvas.remove()
  }
}

/**
 * Utility function to compute thumbnail pixel size
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.maxWidth
 * @param {number} options.maxHeight
 * @param {'cover' | 'contain' | undefined} options.fit
 */
function computeThumbPixel({ width, height, maxWidth, maxHeight, fit }) {
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

/**
 * @param {Blob} blob
 */
export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer())
  const digestArray = Array.from(new Uint8Array(digest))
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return digestHex
}

export const SIZE_LIMIT = 100 * 1000 * 1000 // 100MB

/**
 * @param {string} key
 * @param {File} file
 * @param {Record<string, any>} options
 */
export async function multipartUpload(key, file, options) {
  const headers = options?.headers || {}
  headers['content-type'] = file.type

  const uploadId = await axios
    .post(`/api/write/items/${key}?uploads`, '', { headers })
    .then((res) => res.data.uploadId)
  const totalChunks = Math.ceil(file.size / SIZE_LIMIT)

  const promiseGenerator = function* () {
    for (let i = 1; i <= totalChunks; i++) {
      const chunk = file.slice((i - 1) * SIZE_LIMIT, i * SIZE_LIMIT)
      const searchParams = new URLSearchParams({ partNumber: i, uploadId })
      yield axios
        .put(`/api/write/items/${key}?${searchParams}`, chunk, {
          onUploadProgress(progressEvent) {
            if (typeof options?.onUploadProgress !== 'function') return
            options.onUploadProgress({
              loaded: (i - 1) * SIZE_LIMIT + progressEvent.loaded,
              total: file.size,
            })
          },
        })
        .then((res) => ({
          partNumber: i,
          etag: res.headers.etag,
        }))
    }
  }

  const uploadedParts = []
  for (const part of promiseGenerator()) {
    const { partNumber, etag } = await part
    uploadedParts[partNumber - 1] = { partNumber, etag }
  }
  const completeParams = new URLSearchParams({ uploadId })
  await axios.post(`/api/write/items/${key}?${completeParams}`, {
    parts: uploadedParts,
  })
}
