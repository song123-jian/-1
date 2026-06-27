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

/* CSS变量polyfill - 仅在旧浏览器中按需加载 */
async function ensureCssVarsCompat() {
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || CSS.supports?.('color', 'var(--x)')) return
  const { default: cssVars } = await import('css-vars-ponyfill')
  cssVars({
    onlyLegacy: true,
    preserveVars: true,
    silent: true,
    updateDOM: true,
    watch: true
  })
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.directive('safe-html', vSafeHtml)
app.directive('permission', vPermission)
app.component('Icon', Icon)

/* 初始化通知引擎 */
notificationEngine.init()

async function bootstrapApp() {
  await ensureCssVarsCompat()
  app.mount('#app')
}

bootstrapApp()
