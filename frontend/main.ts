import App from './App.vue'
import { router } from './router'
import { useNavigationStore } from './stores/navigation'
import './styles/index.sass'
import 'uno.css'

const app = createApp(App)
app.use(router)

const pinia = createPinia()
app.use(pinia)

router.afterEach((to) => {
	if (to.path !== '/') {
		const navigation = useNavigationStore(pinia)
		navigation.markInitialNavigationDone()
	}
})

app.mount('#app')
