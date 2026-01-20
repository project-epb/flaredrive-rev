import type { BucketInfo } from '@/models/BucketClient'

export const useNavigationStore = defineStore('navigation', () => {
  const router = useRouter()
  const lastRoute = useLocalStorage('flaredrive:last-route', '/')
  const didInitialNavigation = ref(false)

  /**
   * Save current route as last visited
   */
  function saveCurrentRoute(fullPath: string) {
    if (fullPath && fullPath !== '/') {
      lastRoute.value = fullPath
    }
  }

  /**
   * Try to restore last visited route
   * @returns true if restored, false otherwise
   */
  function tryRestoreLastRoute(availableBuckets: BucketInfo[]): boolean {
    if (!lastRoute.value || lastRoute.value === '/') {
      return false
    }

    // Extract bucket name from path (e.g., /MY_BUCKET/foo/ -> MY_BUCKET)
    const bucketName = lastRoute.value.split('/')[1]
    if (!bucketName) {
      return false
    }

    // Check if bucket exists
    const bucketExists = availableBuckets.some((b) => b.id === bucketName)
    if (!bucketExists) {
      return false
    }

    router.replace(lastRoute.value)
    return true
  }

  /**
   * Redirect to single bucket if only one available
   * @returns true if redirected, false otherwise
   */
  function tryRedirectToSingleBucket(availableBuckets: BucketInfo[]): boolean {
    if (availableBuckets.length === 1 && availableBuckets[0]?.id) {
      router.replace(`/${availableBuckets[0].id}/`)
      return true
    }
    return false
  }

  /**
   * Handle initial navigation on app load
   * Priority: lastRoute > single bucket redirect > stay on home
   */
  async function handleInitialNavigation(availableBuckets: BucketInfo[]): Promise<void> {
    return // temporary disable auto navigation

    if (didInitialNavigation.value) {
      return
    }

    // Try to restore last route first
    if (tryRestoreLastRoute(availableBuckets)) {
      didInitialNavigation.value = true
      return
    }

    // In production, auto redirect if only one bucket
    if (import.meta.env.PROD && tryRedirectToSingleBucket(availableBuckets)) {
      didInitialNavigation.value = true
      return
    }

    didInitialNavigation.value = true
  }

  function markInitialNavigationDone() {
    didInitialNavigation.value = true
  }

  return {
    lastRoute,
    saveCurrentRoute,
    tryRestoreLastRoute,
    tryRedirectToSingleBucket,
    handleInitialNavigation,
    markInitialNavigationDone,
  }
})
