import App from './App.vue'
import { router } from './router'
import { useNavigationStore } from './stores/navigation'
import './styles/index.sass'
import 'uno.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

app.use(router)

// Auth bootstrap + route guard
const auth = useAuthStore(pinia)
auth.fetchMe().catch(() => void 0)

// Site settings bootstrap
const site = useSiteStore(pinia)
site.fetchPublicSettings().catch(() => void 0)

watchEffect(() => {
  if ('document' in globalThis) {
    const name = site.siteName || 'FlareDrive'
    document.title = name
  }
})

router.beforeEach(async (to) => {
  const isAuthRoute = to.path.startsWith('/auth')
  const requiresAuth = (to.meta as any)?.requiresAuth !== false && !isAuthRoute

  if (requiresAuth) {
    const data = auth.isAuthed ? auth.user : await auth.fetchMe(true)
    if (!data) {
      return {
        path: '/auth/login',
        query: { redirect: to.fullPath },
      }
    }
  }

  return true
})

router.afterEach((to) => {
  if (to.path !== '/') {
    const navigation = useNavigationStore(pinia)
    navigation.markInitialNavigationDone()
  }
})

app.mount('#app')
