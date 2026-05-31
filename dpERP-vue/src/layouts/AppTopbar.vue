<template>
  <header class="app-topbar">
    <div class="topbar-left">
      <h1 class="topbar-page-title">{{ pageTitle }}</h1>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="search-input"
          placeholder="搜索客户、报价、合同..."
          v-model="searchQuery"
        />
      </div>
      <div class="topbar-theme-switcher">
        <button
          v-for="theme in themeStore.themes.slice(0, 5)"
          :key="theme.key"
          class="theme-dot"
          :class="{ active: themeStore.currentTheme === theme.key }"
          :style="{ background: theme.color }"
          :title="theme.name"
          @click="themeStore.setTheme(theme.key)"
        />
      </div>
      <div class="topbar-user">
        <div class="user-avatar">管</div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const themeStore = useThemeStore()
const searchQuery = ref('')

const pageTitle = computed(() => route.meta.title || '冠久ERP')
</script>

<style scoped>
.app-topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--topbar-height);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  z-index: 90;
  transition: left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.topbar-page-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.topbar-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
  transition: border-color var(--transition-fast);
}
.topbar-search:focus-within {
  border-color: var(--color-accent);
}
.search-icon {
  font-size: 14px;
  color: var(--color-text-tertiary);
}
.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  width: 200px;
}
.search-input::placeholder {
  color: var(--color-text-tertiary);
}
.topbar-theme-switcher {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.theme-dot {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.theme-dot:hover {
  transform: scale(1.2);
}
.theme-dot.active {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 2px var(--color-bg-primary);
}
.topbar-user {
  display: flex;
  align-items: center;
}
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
}
</style>
