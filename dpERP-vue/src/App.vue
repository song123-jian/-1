<template>
  <div class="app-container" :data-theme="themeStore.currentTheme" :data-preset="themeStore.currentPreset">
    <AppSidebar />
    <div class="app-main">
      <AppTopbar />
      <main class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from '@/stores/theme'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppTopbar from '@/layouts/AppTopbar.vue'

const themeStore = useThemeStore()
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  padding-top: calc(var(--topbar-height) + var(--space-6));
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
