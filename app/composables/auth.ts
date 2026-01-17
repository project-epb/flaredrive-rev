export const useUser = () => {
  const user = useState<any>('user', () => null)

  const fetchUser = async () => {
    if (user.value) return user.value
    try {
      const data = await $fetch('/api/auth/me')
      user.value = (data as any).user
    } catch (e) {
      user.value = null
    }
    return user.value
  }

  const setUser = (newUser: any) => {
    user.value = newUser
  }

  const logout = async () => {
    user.value = null
    await $fetch('/api/auth/logout', { method: 'POST' })
  }

  return {
    user,
    fetchUser,
    setUser,
    logout,
  }
}
