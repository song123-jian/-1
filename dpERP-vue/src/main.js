import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { vSafeHtml } from './directives/safeHtml'
import { vPermission } from './utils/permissionGuard'
import Icon from '@/components/Icon.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('safe-html', vSafeHtml)
app.directive('permission', vPermission)
app.component('Icon', Icon)
app.mount('#app')
