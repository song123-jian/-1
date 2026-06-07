<template>
  <header class="app-topbar" :class="{ 'no-sidebar': !hasSidebar, 'sidebar-collapsed': collapsed }">
    <div class="topbar-left">
      <!-- 汉堡菜单按钮（移动端） -->
      <button v-if="showHamburger" class="hamburger-btn" @click="emit('toggle-menu')" title="菜单">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <h1 class="topbar-page-title">{{ pageTitle }}</h1>
    </div>
    <div class="topbar-right">
      <div class="topbar-search" :class="{ 'search-collapsed': searchCollapsed }">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input
          type="text"
          class="search-input"
          placeholder="搜索客户、报价、合同..."
          v-model="searchQuery"
          @focus="searchCollapsed = false"
          @blur="handleSearchBlur"
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
        <div class="user-avatar">{{ sessionStore.roleName?.charAt(0) || '?' }}</div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'

const props = defineProps({
  showHamburger: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-menu'])

const route = useRoute()
const themeStore = useThemeStore()
const sessionStore = useSessionStore()
const searchQuery = ref('')
const searchCollapsed = ref(false)

const pageTitle = computed(() => route.meta.title || '冠久ERP')
const hasSidebar = computed(() => !props.showHamburger)

function handleSearchBlur() {
  if (!searchQuery.value) {
    searchCollapsed.value = false
  }
}
</script>

<style scoped>
.app-topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width, 260px);
  right: 0;
  height: var(--topbar-height, 56px);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  z-index: 90;
  transition: left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 侧边栏折叠状态偏移 */
.app-topbar.sidebar-collapsed {
  left: var(--sidebar-collapsed-width, 52px);
}

/* 移动端无侧边栏偏移 */
.app-topbar.no-sidebar {
  left: 0;
  padding: 0 var(--space-3);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.hamburger-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.hamburger-btn svg {
  width: 20px;
  height: 20px;
}

.topbar-page-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.topbar-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
  transition: border-color var(--transition-fast), width 200ms ease;
}
.topbar-search:focus-within {
  border-color: var(--color-accent);
}
.search-icon {
  font-size: 14px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  width: 200px;
  transition: width 200ms ease;
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

/* 平板适配 */
@media (max-width: 1023px) {
  .app-topbar {
    left: 0;
    padding: 0 var(--space-4);
  }
  .search-input {
    width: 160px;
  }
}

/* 手机适配 */
@media (max-width: 767px) {
  .app-topbar {
    left: 0;
    padding: 0 var(--space-3);
    height: var(--topbar-height, 48px);
  }
  .topbar-page-title {
    font-size: var(--font-size-base);
  }
  .search-input {
    width: 120px;
  }
  .topbar-search.search-collapsed .search-input {
    width: 80px;
  }
  /* 手机端隐藏主题切换器 */
  .topbar-theme-switcher {
    display: none;
  }
}

/* 超小屏幕 */
@media (max-width: 480px) {
  .search-input {
    width: 100px;
  }
  .topbar-right {
    gap: var(--space-2);
  }
}
</style>
