import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/global.scss'
import { initGlobalKeyBindings } from './utils/keyBindings'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

initGlobalKeyBindings()
