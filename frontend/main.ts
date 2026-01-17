import App from './App.vue'
import { router } from './router'
import { useNavigationStore } from './stores/navigation'
import './styles/index.sass'
import 'uno.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

app.use(router)

// Auth bootstrap + simple route guard (only affects routes that explicitly set meta.requiresAuth=true)
const auth = useAuthStore(pinia)
auth.fetchMe().catch(() => void 0)

router.beforeEach(async (to) => {
  if ((to.meta as any)?.requiresAuth) {
    await auth.fetchMe()
    if (!auth.isAuthed) {
      return {
        path: '/@auth/login',
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
