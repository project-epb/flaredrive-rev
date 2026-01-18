import fexios from 'fexios'

export type AuthUser = {
  id: number
  email: string
  authorizationLevel: number
}

const getErrorMessage = (e: any) => {
  return e?.response?.data?.error || e?.message || (typeof e === 'string' ? e : '') || 'Request failed'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const pending = ref<Promise<AuthUser | null> | null>(null)

  const isAuthed = computed(() => !!user.value && user.value.id > 0)

  const fetchMe = async (force = false) => {
    if (pending.value) return pending.value
    if (hasLoaded.value && !force) return user.value

    isLoading.value = true
    pending.value = (async () => {
      try {
        const { data } = await fexios.get<AuthUser>('/api/auth/me')
        user.value = data
        return data
      } catch (e) {
        user.value = null
        return null
      } finally {
        hasLoaded.value = true
        isLoading.value = false
        pending.value = null
      }
    })()

    return pending.value
  }

  const register = async (payload: { email: string; password: string }) => {
    try {
      await fexios.post('/api/auth/register', payload)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }

  const login = async (payload: { email: string; password: string }) => {
    try {
      await fexios.post('/api/auth/login', payload)
      await fetchMe(true)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }

  const logout = async () => {
    try {
      await fexios.post('/api/auth/logout')
    } catch {
      // ignore
    } finally {
      user.value = null
      hasLoaded.value = true
    }
  }

  return {
    user,
    isAuthed,
    isLoading,
    hasLoaded,
    fetchMe,
    register,
    login,
    logout,
  }
})
