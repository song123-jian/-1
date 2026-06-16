<template>
  <div
    class="app-container"
    :data-theme="themeStore.currentTheme"
    :data-preset="themeStore.currentPreset"
    :data-mode="themeStore.currentMode"
    :data-device="deviceType"
    :data-layout="layoutMode"
  >
    <!-- 移动端遮罩层 -->
    <div v-if="mobileMenuOpen" class="sidebar-overlay" @click="closeMobileMenu"></div>
    <AppSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileMenuOpen"
      @toggle-collapse="toggleSidebarCollapse"
      @close-mobile="closeMobileMenu"
    />
    <div class="app-main" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'no-sidebar': !isDesktop }">
      <AppTopbar
        :show-hamburger="shouldUseHamburger"
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-menu="toggleMobileMenu"
      />
      <main class="app-content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-up" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>
    <ToastNotification ref="toastRef" />
    <ConfirmDialog ref="confirmRef" />
    <GlobalSearch v-model:visible="showGlobalSearch" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref, computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'
import { SupabaseClient } from '@/lib/supabase'
import { useSyncEngine } from '@/utils/syncEngine'
import { useDataCenterStore } from '@/stores/dataCenter'
import { useResponsive } from '@/utils/responsive'
import autoSave from '@/utils/autoSave'
import dataCache from '@/utils/dataCache'
import eventBus from '@/utils/eventBus'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppTopbar from '@/layouts/AppTopbar.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import GlobalSearch from '@/components/common/GlobalSearch.vue'

const router = useRouter()
const themeStore = useThemeStore()
const sessionStore = useSessionStore()
const syncEngine = useSyncEngine()
const dataCenter = useDataCenterStore()
const { isDesktop, isMobile, deviceType, layoutMode, shouldUseHamburger, responsive } = useResponsive()

/* 全局 Toast 和 ConfirmDialog 引用 */
const toastRef = ref(null)
const confirmRef = ref(null)

/* 全局挂载 Toast 和 ConfirmDialog */
provide('toast', {
  show: (...args) => toastRef.value?.show(...args),
  success: (...args) => toastRef.value?.success(...args),
  error: (...args) => toastRef.value?.error(...args),
  warning: (...args) => toastRef.value?.warning(...args),
  info: (...args) => toastRef.value?.info(...args)
})
provide('confirm', {
  show: (...args) => confirmRef.value?.show(...args)
})

/* 侧边栏状态 */
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

/* 全局搜索状态 */
const showGlobalSearch = ref(false)

/* 全局搜索快捷键 Ctrl+K */
function handleGlobalSearchKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showGlobalSearch.value = true
  }
}

/* 切换侧边栏折叠 */
function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  autoSave.saveLayoutState({ sidebarCollapsed: sidebarCollapsed.value })
}

/* 切换移动端菜单 */
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

/* 关闭移动端菜单 */
function closeMobileMenu() {
  mobileMenuOpen.value = false
}

/* 定期检查连接状态，断线时自动重连 */
let _reconnectInterval = null
function startConnectionMonitor() {
  if (_reconnectInterval) return
  _reconnectInterval = setInterval(async () => {
    const { SupabaseClient } = await import('@/lib/supabase.js')
    const { useSupabaseStore } = await import('@/stores/supabase.js')
    const sbStore = useSupabaseStore()

    if (!SupabaseClient.isConnected() && sbStore.url.value) {
      console.warn('[App] 检测到连接断开，尝试自动重连...')
      const connected = await sbStore.autoConnect()
      if (connected) {
        console.info('[App] 自动重连成功')
        /* 显示 Toast 通知 */
        if (toastRef.value) {
          toastRef.value.show('云端同步已恢复', 'success')
        }
      }
    }
  }, 30000) // 每30秒检查一次
}

/* 初始化主题系统 */
function initTheme() {
  try {
    themeStore.init()
  } catch (e) {
    console.error('[App] 主题初始化失败:', e)
  }
}
/* 将主题属性同步到 <html> 元素 */
function syncThemeToHtml() {
  const html = document.documentElement
  html.setAttribute('data-mode', themeStore.currentMode)
  html.setAttribute('data-theme', themeStore.currentTheme)
  html.setAttribute('data-preset', themeStore.currentPreset)
}
watch(() => [themeStore.currentMode, themeStore.currentTheme, themeStore.currentPreset], syncThemeToHtml, {
  immediate: true
})

/* 监听设备类型变化，自动调整布局 */
watch(deviceType, (newType) => {
  if (newType === 'mobile' || newType === 'tablet') {
    mobileMenuOpen.value = false
  }
})

/* 监听路由变化，保存视图状态和当前路由 */
router.afterEach((to) => {
  autoSave.saveSessionState()
  closeMobileMenu()
})

/* 应用启动时恢复会话并初始化 */
onMounted(async () => {
  /* 注册全局搜索快捷键 */
  document.addEventListener('keydown', handleGlobalSearchKeydown)

  /* 浏览器兼容性检测 */
  try {
    const ua = navigator.userAgent
    const isIE = ua.indexOf('MSIE ') > 0 || ua.indexOf('Trident/') > 0
    if (isIE) {
      const app = document.getElementById('app')
      if (app) {
        app.innerHTML =
          '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#1a1f36;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Microsoft YaHei,sans-serif;z-index:99999"><div style="text-align:center;max-width:520px;padding:40px"><div style="font-size:64px;margin-bottom:20px">&#9888;</div><h2 style="font-size:24px;margin:0 0 12px;font-weight:normal">浏览器不兼容</h2><p style="font-size:14px;color:#a0aec0;line-height:1.8;margin:0 0 24px">冠久ERP使用了现代Web技术，Internet Explorer 浏览器无法正常运行。<br>请使用以下现代浏览器访问系统：</p><div style="text-align:center"><a href="https://www.google.cn/chrome/" target="_blank" style="display:inline-block;padding:12px 20px;margin:4px;background:#2d3748;border-radius:8px;color:#e2e8f0;font-size:13px;text-decoration:none">Chrome 浏览器</a><a href="https://www.microsoft.com/edge" target="_blank" style="display:inline-block;padding:12px 20px;margin:4px;background:#2d3748;border-radius:8px;color:#e2e8f0;font-size:13px;text-decoration:none">Microsoft Edge</a><a href="https://www.firefox.com.cn/" target="_blank" style="display:inline-block;padding:12px 20px;margin:4px;background:#2d3748;border-radius:8px;color:#e2e8f0;font-size:13px;text-decoration:none">Firefox 浏览器</a></div></div></div>'
      }
      return
    }
  } catch (e) {
    /* ignore */
  }

  /* 隐藏加载指示器 */
  try {
    const loading = document.getElementById('app-loading')
    if (loading) {
      loading.style.opacity = '0'
      setTimeout(() => {
        loading.remove()
      }, 300)
    }
  } catch (e) {
    /* ignore */
  }

  /* 初始化主题系统 */
  try {
    initTheme()
  } catch (e) {
    console.error('[App] 主题初始化失败:', e)
  }

  /* 初始化响应式管理器 */
  try {
    responsive.init()
  } catch (e) {
    console.error('[App] responsive初始化失败:', e)
  }

  /* 初始化自动保存管理器 */
  try {
    autoSave.init({ router })
  } catch (e) {
    console.error('[App] autoSave初始化失败:', e)
  }

  /* 恢复布局状态 */
  try {
    const layoutState = autoSave.restoreLayoutState()
    if (layoutState.sidebarCollapsed !== undefined) {
      sidebarCollapsed.value = layoutState.sidebarCollapsed
    }
  } catch (e) {
    console.error('[App] 布局状态恢复失败:', e)
  }

  /* 恢复会话 */
  try {
    sessionStore.restoreSession()
  } catch (e) {
    console.error('[App] 会话恢复失败:', e)
  }

  /* 初始化数据管理中心 */
  try {
    await dataCenter.init()
  } catch (e) {
    console.error('[App] 数据中心初始化失败:', e)
  }

  /* 恢复上次的路由 */
  try {
    const lastRoute = autoSave.restoreLastRoute()
    if (lastRoute && lastRoute !== '/' && router.currentRoute.value.path === '/') {
      await router.replace(lastRoute)
    }
  } catch (e) {
    console.error('[App] 路由恢复失败:', e)
  }

  /* 如果已连接 Supabase，订阅 Presence 并启动自动同步 */
  try {
    if (SupabaseClient.isConnected() && sessionStore.isLoggedIn) {
      sessionStore.subscribePresence(SupabaseClient.getClient())
      syncEngine.initAutoSync()
    }
  } catch (e) {
    console.error('[App] Supabase订阅失败:', e)
  }

  /* 自动恢复 Supabase 连接 */
  try {
    const { useSupabaseStore } = await import('@/stores/supabase.js')
    const sbStore = useSupabaseStore()
    const connected = await sbStore.autoConnect()
    if (connected) {
      console.info('[App] Supabase 自动连接成功')
      /* 连接成功后启动自动同步 */
      const { useSyncEngine } = await import('@/utils/syncEngine.js')
      const syncEngine = useSyncEngine()
      syncEngine.initAutoSync()
    } else {
      console.info('[App] Supabase 无保存的配置，跳过自动连接')
    }
  } catch (e) {
    console.warn('[App] Supabase 自动连接异常:', e.message)
  }

  /* 启动连接状态监控 */
  startConnectionMonitor()
})

/* 应用卸载时清理 */
onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalSearchKeydown)
  syncEngine.stopAutoSync()
  autoSave.destroy()
  responsive.destroy()
  if (_reconnectInterval) {
    clearInterval(_reconnectInterval)
    _reconnectInterval = null
  }
  try {
    sessionStore.unsubscribePresence?.()
  } catch (e) {
    /* ignore */
  }
  try {
    dataCache.destroy()
  } catch (e) {
    /* ignore */
  }
  try {
    eventBus.clear()
  } catch (e) {
    /* ignore */
  }
  try {
    themeStore.stopAutoSwitch()
  } catch (e) {
    /* ignore */
  }
})
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

/* 侧边栏遮罩层（移动端） */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 998;
  transition: opacity 300ms;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
}

.app-main.sidebar-collapsed {
  margin-left: var(--sidebar-collapsed-width);
}

/* 移动端无侧边栏偏移 */
.app-main.no-sidebar {
  margin-left: 0;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--content-padding, var(--space-6, 1.5rem));
  padding-top: calc(var(--topbar-height, 56px) + var(--content-padding, var(--space-6, 1.5rem)));
  width: 100%;
  box-sizing: border-box;
}

.fade-up-enter-active {
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}
.fade-up-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-content {
    padding: var(--space-3, 0.75rem);
    padding-top: calc(var(--topbar-height, 48px) + var(--space-3, 0.75rem));
  }
}

/* 平板适配 */
@media (min-width: 768px) and (max-width: 1024px) {
  .app-content {
    padding: var(--space-4, 1rem);
    padding-top: calc(var(--topbar-height, 52px) + var(--space-4, 1rem));
  }
}
</style>
