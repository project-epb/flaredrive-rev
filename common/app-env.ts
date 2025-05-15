const readEnv = <T = string>(key: string, defaultValue?: T, transform?: (value: string) => T) => {
  let rawValue = import.meta.env[key] || import.meta.env[`VITE_${key}`]
  if (typeof rawValue === 'undefined') {
    if (typeof defaultValue === 'undefined') {
      return void 0 as T
    }
    rawValue = defaultValue
  }
  return transform ? transform(rawValue) : rawValue
}

/**
 * CDN base with trailing slash
 * `CDN_BASE_URL` + `R2Object.key` = public URL
 */
export const CDN_BASE_URL = readEnv<string>('VITE_CDN_BASE_URL', '/api/raw/', (value) => {
  return 'document' in globalThis ? new URL(value || '', window.location.origin).toString() : value
})
/**
 * Internal hidden directory key, for generation thumbnails and so on
 * @example /_$flaredrive$/thumbnails/sha1sum.png
 */
export const FLARE_DRIVE_HIDDEN_KEY: string = '_$flaredrive$'
/**
 * Files uploaded to this directory will be randomly renamed
 * with trailing slash
 * empty or `/` means no random dir
 * @example /-/yyyy/MM/dd/random-name.png
 */
export const RANDOM_UPLOAD_DIR = readEnv<string>('VITE_RANDOM_UPLOAD_DIR', '')
/**
 * To control the batch upload concurrency
 */
export const BATCH_UPLOAD_CONCURRENCY = readEnv('VITE_BATCH_UPLOAD_CONCURRENCY', 10, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue <= 0) {
    return 10
  }
  return parsedValue
})
/**
 * To control the upload history limit
 * x of last uploaded files
 */
export const UPLOAD_HISORY_LIMIT = readEnv('VITE_UPLOAD_HISORY_LIMIT', 1000, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue < 0) {
    return 1000
  }
  return parsedValue
})
/**
 * To control the preview size limit for text/* files
 * 5MB by default
 */
export const PREVIEW_SIZE_LIMIT_TEXT = readEnv('VITE_PREVIEW_SIZE_LIMIT_TEXT', 5 * 1024 * 1024, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue < 0) {
    return 5 * 1024 * 1024
  }
  return parsedValue
})
