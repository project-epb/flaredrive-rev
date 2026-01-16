export default defineNuxtRouteMiddleware(async () => {
  // 客户端和服务端都运行
  if (import.meta.server) return

  const { user, fetchUser } = useUser()

  if (!user.value) {
    await fetchUser()
  }

  if (!user.value || !user.value.id) {
    return navigateTo('/auth/login')
  }
})
