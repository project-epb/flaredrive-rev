import fexios from 'fexios'

export type PublicSiteSettings = {
  siteName: string
  allowRegister: boolean
  randomUploadDir: string
  batchUploadConcurrency: number
  uploadHistoryLimit: number
  previewSizeLimitText: number
}

export const useSiteStore = defineStore('site', () => {
  const siteName = ref('FlareDrive')
  const allowRegister = ref(true)
  const randomUploadDir = ref('')
  const batchUploadConcurrency = ref(10)
  const uploadHistoryLimit = ref(1000)
  const previewSizeLimitText = ref(5 * 1024 * 1024)

  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const pending = ref<Promise<PublicSiteSettings> | null>(null)

  const fetchPublicSettings = async (force = false) => {
    if (pending.value) return pending.value
    if (hasLoaded.value && !force) {
      return {
        siteName: siteName.value,
        allowRegister: allowRegister.value,
        randomUploadDir: randomUploadDir.value,
        batchUploadConcurrency: batchUploadConcurrency.value,
        uploadHistoryLimit: uploadHistoryLimit.value,
        previewSizeLimitText: previewSizeLimitText.value,
      }
    }

    isLoading.value = true
    pending.value = (async () => {
      try {
        const { data } = await fexios.get<PublicSiteSettings>('/api/site/public-settings')
        siteName.value = (data?.siteName || '').toString().trim() || 'FlareDrive'
        allowRegister.value = !!data?.allowRegister

        // Normalize random upload dir: strip leading '/', ensure trailing '/', treat '/' as disabled.
        {
          let dir = (data?.randomUploadDir || '').toString().trim()
          if (!dir || dir === '/') {
            dir = ''
          } else {
            dir = dir.replace(/^\/+/, '')
            if (dir && !dir.endsWith('/')) dir += '/'
          }
          randomUploadDir.value = dir
        }

        {
          const n = Number((data as any)?.batchUploadConcurrency)
          batchUploadConcurrency.value = Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : 10
        }

        {
          const n = Number((data as any)?.uploadHistoryLimit)
          uploadHistoryLimit.value = Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : 1000
        }

        {
          const n = Number((data as any)?.previewSizeLimitText)
          previewSizeLimitText.value = Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : 5 * 1024 * 1024
        }

        return {
          siteName: siteName.value,
          allowRegister: allowRegister.value,
          randomUploadDir: randomUploadDir.value,
          batchUploadConcurrency: batchUploadConcurrency.value,
          uploadHistoryLimit: uploadHistoryLimit.value,
          previewSizeLimitText: previewSizeLimitText.value,
        }
      } finally {
        hasLoaded.value = true
        isLoading.value = false
        pending.value = null
      }
    })()

    return pending.value
  }

  return {
    siteName,
    allowRegister,
    randomUploadDir,
    batchUploadConcurrency,
    uploadHistoryLimit,
    previewSizeLimitText,
    isLoading,
    hasLoaded,
    fetchPublicSettings,
  }
})
