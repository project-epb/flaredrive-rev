import fexios from 'fexios'

export type PublicSiteSettings = {
  siteName: string
  allowRegister: boolean
}

export const useSiteStore = defineStore('site', () => {
  const siteName = ref('FlareDrive')
  const allowRegister = ref(true)

  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const pending = ref<Promise<PublicSiteSettings> | null>(null)

  const fetchPublicSettings = async (force = false) => {
    if (pending.value) return pending.value
    if (hasLoaded.value && !force) {
      return { siteName: siteName.value, allowRegister: allowRegister.value }
    }

    isLoading.value = true
    pending.value = (async () => {
      try {
        const { data } = await fexios.get<PublicSiteSettings>('/api/site/public-settings')
        siteName.value = (data?.siteName || '').toString().trim() || 'FlareDrive'
        allowRegister.value = !!data?.allowRegister
        return { siteName: siteName.value, allowRegister: allowRegister.value }
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
    isLoading,
    hasLoaded,
    fetchPublicSettings,
  }
})
