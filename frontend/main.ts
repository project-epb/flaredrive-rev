import App from './App.vue'
import { router } from './router'
import './styles/index.sass'
import 'uno.css'

const app = createApp(App)
app.use(router)

const pinia = createPinia()
app.use(pinia)

app.mount('#app')
