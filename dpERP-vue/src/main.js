import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './styles/main.css'
import { vSafeHtml } from './directives/safeHtml'
import { vPermission } from './utils/permissionGuard'
import Icon from '@/components/Icon.vue'
import notificationEngine from '@/utils/notificationEngine'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.directive('safe-html', vSafeHtml)
app.directive('permission', vPermission)
app.component('Icon', Icon)

/* 初始化通知引擎 */
notificationEngine.init()

app.mount('#app')
