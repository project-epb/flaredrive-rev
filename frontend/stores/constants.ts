const useEnv = <T = string>(key: string, defaultValue?: T, transform?: (value: string) => T) => {
  const rawValue = import.meta.env[key] || import.meta.env[`VITE_${key}`]
  if (typeof rawValue === 'undefined') {
    if (typeof defaultValue === 'undefined') {
      return void 0 as T
    }
    return defaultValue as T
  }
  if (typeof transform === 'function') {
    return transform(rawValue)
  }
  return rawValue as T
}

export const CDN_BASE_URL = useEnv<string>('VITE_CDN_BASE_URL', '/api/raw/', (value) => {
  return new URL(value || '', window.location.origin).toString()
})
export const FLARE_DRIVE_HIDDEN_KEY: string = '_$flaredrive$'
export const RANDOM_UPLOAD_DIR = useEnv<string>('VITE_RANDOM_UPLOAD_DIR', '')
export const BATCH_UPLOAD_CONCURRENCY = useEnv('VITE_BATCH_UPLOAD_CONCURRENCY', 10, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue <= 0) {
    return 10
  }
  return parsedValue
})
export const UPLOAD_HISORY_LIMIT = useEnv('VITE_UPLOAD_HISORY_LIMIT', 1000, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue < 0) {
    return 1000
  }
  return parsedValue
})
export const PREVIEW_SIZE_LIMIT_TEXT = useEnv('VITE_PREVIEW_SIZE_LIMIT_TEXT', 5 * 1024 * 1024, (value) => {
  const parsedValue = parseInt(value)
  if (isNaN(parsedValue) || parsedValue < 0) {
    return 5 * 1024 * 1024
  }
  return parsedValue
})
