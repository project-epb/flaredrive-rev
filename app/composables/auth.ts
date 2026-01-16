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
    // Here implies we might want to call a logout API endpoint if it existed,
    // but the original code didn't seem to have one in context usage yet, or just clearing state.
    // Usually there is /api/auth/logout. But for now just clearing state.
  }

  return {
    user,
    fetchUser,
    setUser,
    logout,
  }
}
