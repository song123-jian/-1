import { onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'
import { SupabaseClient } from '@/lib/supabase'
import { useSupabaseStore } from '@/stores/supabase.js'
import { useSyncEngine } from '@/utils/syncEngine'
import { useDataCenterStore } from '@/stores/dataCenter'
import { useResponsive } from '@/utils/responsive'
import autoSave from '@/utils/autoSave'
import dataCache from '@/utils/dataCache'
import eventBus from '@/utils/eventBus'

export function useAppBootstrap(options = {}) {
  const router = options.router || useRouter()
  const themeStore = useThemeStore()
  const sessionStore = useSessionStore()
  const supabaseStore = useSupabaseStore()
  const syncEngine = useSyncEngine()
  const dataCenter = useDataCenterStore()
  const responsiveState = useResponsive()
  const responsiveManager = responsiveState.responsive

  let reconnectInterval = null

  function initTheme() {
    try {
      themeStore.init()
    } catch (error) {
      console.error('[App] 主题初始化失败', error)
    }
  }

  function startConnectionMonitor(toastRef) {
    if (reconnectInterval) return

    reconnectInterval = setInterval(async () => {
      if (!SupabaseClient.isConnected() && supabaseStore.url) {
        const connected = await supabaseStore.autoConnect()
        if (connected && toastRef?.value) {
          toastRef.value.show('云端同步已恢复', 'success')
        }
      }
    }, 30000)
  }

  function stopConnectionMonitor() {
    if (reconnectInterval) {
      clearInterval(reconnectInterval)
      reconnectInterval = null
    }
  }

  async function bootstrap(toastRef) {
    try {
      responsiveManager.init()
    } catch (error) {
      console.error('[App] responsive 初始化失败', error)
    }

    try {
      autoSave.init({ router })
    } catch (error) {
      console.error('[App] autoSave 初始化失败', error)
    }

    try {
      initTheme()
    } catch (error) {
      console.error('[App] 主题初始化失败', error)
    }

    try {
      const layoutState = autoSave.restoreLayoutState()
      if (layoutState.sidebarCollapsed !== undefined && typeof options.onSidebarCollapsed === 'function') {
        options.onSidebarCollapsed(layoutState.sidebarCollapsed)
      }
    } catch (error) {
      console.error('[App] 布局状态恢复失败', error)
    }

    try {
      sessionStore.restoreSession()
    } catch (error) {
      console.error('[App] 会话恢复失败', error)
    }

    try {
      await dataCenter.init()
    } catch (error) {
      console.error('[App] 数据中心初始化失败', error)
    }

    try {
      await router.isReady()
      const lastRoute = autoSave.restoreLastRoute()
      const isAtRootEntry =
        typeof window !== 'undefined' &&
        window.location.pathname === '/' &&
        !window.location.search &&
        !window.location.hash

      if (lastRoute && lastRoute !== '/' && isAtRootEntry && router.currentRoute.value.path === '/') {
        await router.replace(lastRoute)
      }
    } catch (error) {
      console.error('[App] 路由恢复失败', error)
    }

    try {
      if (SupabaseClient.isConnected() && sessionStore.isLoggedIn) {
        sessionStore.subscribePresence(SupabaseClient.getClient())
        syncEngine.initAutoSync()
      }
    } catch (error) {
      console.error('[App] Supabase 订阅失败', error)
    }

    try {
      const connected = await supabaseStore.autoConnect()
      if (connected) {
        syncEngine.initAutoSync()
      }
    } catch (error) {
      console.warn('[App] Supabase 自动连接异常:', error?.message || error)
    }

    startConnectionMonitor(toastRef)
  }

  function cleanup() {
    stopConnectionMonitor()
    syncEngine.stopAutoSync()
    autoSave.destroy()
    responsiveManager.destroy()

    try {
      sessionStore.unsubscribePresence?.()
    } catch {
      /* ignore */
    }
    try {
      dataCache.destroy()
    } catch {
      /* ignore */
    }
    try {
      eventBus.clear()
    } catch {
      /* ignore */
    }
    try {
      themeStore.stopAutoSwitch()
    } catch {
      /* ignore */
    }
  }

  watch(
    () => responsiveState.deviceType.value,
    (newType) => {
      if (newType === 'mobile' || newType === 'tablet') {
        options.onMobileLayoutChange?.()
      }
    }
  )

  return {
    bootstrap,
    cleanup,
    startConnectionMonitor,
    stopConnectionMonitor
  }
}
