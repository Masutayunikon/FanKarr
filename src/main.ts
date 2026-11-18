import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from '@/App.vue'
import { initTheme } from '@/composables/useTheme'
import { installBaseFetch } from '@/utils/base'
import '@/assets/main.css'

installBaseFetch()
initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
