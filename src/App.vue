<template>
  <div class="app-container" :data-device="deviceType" :data-layout="layoutMode">
    <template v-if="isAuthPage">
      <router-view v-slot="{ Component, route: authRoute }">
        <transition name="fade-up" mode="out-in">
          <component :is="Component" :key="authRoute.path" />
        </transition>
      </router-view>
    </template>
    <template v-else>
      <div v-if="mobileMenuOpen" class="sidebar-overlay" @click="closeMobileMenu"></div>
      <AppSidebar
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileMenuOpen"
        @toggle-collapse="toggleSidebarCollapse"
        @close-mobile="closeMobileMenu"
      />
      <div class="app-main" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'no-sidebar': !isDesktop }">
        <AppTopbar :show-hamburger="shouldUseHamburger" :collapsed="sidebarCollapsed" @toggle-menu="toggleMobileMenu" />
        <main class="app-content">
          <router-view v-slot="{ Component, route: appRoute }">
            <transition name="fade-up" mode="out-in">
              <component :is="Component" :key="appRoute.path" />
            </transition>
          </router-view>
        </main>
      </div>
      <ToastNotification ref="toastRef" />
      <ConfirmDialog ref="confirmRef" />
      <GlobalSearch v-model:visible="showGlobalSearch" />
    </template>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useResponsive } from '@/utils/responsive'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppTopbar from '@/layouts/AppTopbar.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppBootstrap } from '@/composables/useAppBootstrap'
import autoSave from '@/utils/autoSave'

const GlobalSearch = defineAsyncComponent(() => import('@/components/common/GlobalSearch.vue'))

const route = useRoute()
const { isDesktop, deviceType, layoutMode, shouldUseHamburger } = useResponsive()
const isAuthPage = computed(() => route.name === 'RoleSelect')

const toastRef = ref(null)
const confirmRef = ref(null)
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const showGlobalSearch = ref(false)

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

function handleGlobalSearchKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    showGlobalSearch.value = true
  }
}

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  autoSave.saveLayoutState({ sidebarCollapsed: sidebarCollapsed.value })
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

watch(deviceType, (newType) => {
  if (newType === 'mobile' || newType === 'tablet') {
    mobileMenuOpen.value = false
  }
})

const { bootstrap, cleanup } = useAppBootstrap({
  onSidebarCollapsed: (value) => {
    sidebarCollapsed.value = value
  },
  onMobileLayoutChange: () => {
    mobileMenuOpen.value = false
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleGlobalSearchKeydown)
  const loading = document.getElementById('app-loading')
  if (loading) {
    loading.style.opacity = '0'
    window.setTimeout(() => {
      loading.remove()
    }, 300)
  }
  bootstrap(toastRef)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalSearchKeydown)
  cleanup()
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

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: var(--z-overlay);
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

@media (max-width: 768px) {
  .app-content {
    padding: var(--space-3, 0.75rem);
    padding-top: calc(var(--topbar-height, 48px) + var(--space-3, 0.75rem));
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .app-content {
    padding: var(--space-4, 1rem);
    padding-top: calc(var(--topbar-height, 52px) + var(--space-4, 1rem));
  }
}
</style>
