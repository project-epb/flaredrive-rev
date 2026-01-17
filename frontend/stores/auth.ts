import axios from 'axios'

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

  const isAuthed = computed(() => !!user.value)

  const fetchMe = async (force = false) => {
    if (isLoading.value) return user.value
    if (hasLoaded.value && !force) return user.value

    isLoading.value = true
    try {
      const { data } = await axios.get<AuthUser>('/api/auth/me')
      user.value = data
      return user.value
    } catch (e) {
      user.value = null
      return null
    } finally {
      hasLoaded.value = true
      isLoading.value = false
    }
  }

  const register = async (payload: { email: string; password: string }) => {
    try {
      await axios.post('/api/auth/register', payload)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }

  const login = async (payload: { email: string; password: string }) => {
    try {
      await axios.post('/api/auth/login', payload)
      await fetchMe(true)
    } catch (e) {
      throw new Error(getErrorMessage(e))
    }
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
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
