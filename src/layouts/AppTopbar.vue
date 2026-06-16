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
          placeholder="搜索客户、物料、订单、报价..."
          v-model="searchQuery"
          @focus="onSearchFocus"
          @input="onSearchInput"
          @blur="onSearchBlur"
        />
        <!-- 搜索结果下拉面板 -->
        <div v-if="showSearchResults && searchResults.length > 0" class="search-results-panel">
          <div
            v-for="item in searchResults"
            :key="item.key"
            class="search-result-item"
            @mousedown.prevent="onSearchResultClick(item)"
          >
            <span class="search-result-icon"><Icon :name="item.icon" :size="14" /></span>
            <span class="search-result-label">{{ item.label }}</span>
            <span class="search-result-type">{{ item.typeLabel }}</span>
          </div>
        </div>
        <div v-if="showSearchResults && searchQuery && searchResults.length === 0" class="search-results-panel">
          <div class="search-result-empty">未找到匹配结果</div>
        </div>
      </div>
      <div class="topbar-mode-toggle">
        <button class="mode-toggle-btn" :title="themeStore.currentMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'" @click="themeStore.toggleMode()">
          <svg v-if="themeStore.currentMode === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mode-icon"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mode-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
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
        <button v-if="themeStore.themes.length > 5" class="theme-dot theme-more" :class="{ active: showThemeMenu }" @click="showThemeMenu = !showThemeMenu" title="更多主题">+</button>
        <div v-if="showThemeMenu" class="theme-dropdown">
          <button
            v-for="theme in themeStore.themes"
            :key="theme.key"
            class="theme-dropdown-item"
            :class="{ active: themeStore.currentTheme === theme.key }"
            @click="themeStore.setTheme(theme.key); showThemeMenu = false"
          >
            <span class="theme-dropdown-dot" :style="{ background: theme.color }"></span>
            <span>{{ theme.name }}</span>
          </button>
        </div>
      </div>
      <LanguageSwitcher />
      <NotificationBell />
      <div class="topbar-user" @click="showRoleMenu = !showRoleMenu">
        <div class="user-avatar">{{ sessionStore.roleName?.charAt(0) || '?' }}</div>
        <span class="user-role-name">{{ sessionStore.roleName }}</span>
        <svg class="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        <!-- 角色快速切换下拉菜单 -->
        <div v-if="showRoleMenu" class="role-switch-dropdown">
          <div class="role-dropdown-header">切换身份</div>
          <button
            v-for="role in sessionStore.availableRoles"
            :key="role"
            class="role-dropdown-item"
            :class="{ active: sessionStore.currentRole === role }"
            @click.stop="onSwitchRole(role)"
          >
            <span class="role-check">{{ sessionStore.currentRole === role ? '✓' : '' }}</span>
            {{ role }}
          </button>
          <div class="role-dropdown-divider"></div>
          <button class="role-dropdown-item role-logout" @click.stop="onLogout">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import NotificationBell from '@/components/layout/NotificationBell.vue'

const props = defineProps({
  showHamburger: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-menu'])

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const sessionStore = useSessionStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const quotationStore = useQuotationStore()
const searchQuery = ref('')
const searchCollapsed = ref(false)
const showSearchResults = ref(false)
const showThemeMenu = ref(false)
const showRoleMenu = ref(false)
let debounceTimer = null

const pageTitle = computed(() => route.meta.title || '冠久ERP')
const hasSidebar = computed(() => !props.showHamburger)

/* 搜索结果 */
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const results = []

  /* 搜索客户 */
  const customers = customerStore.customers || []
  customers.forEach(c => {
    const name = (c.name || c.shortName || '').toLowerCase()
    if (name.includes(q)) {
      results.push({
        key: 'customer_' + c.id,
        label: c.name || c.shortName,
        typeLabel: '客户',
        icon: 'users',
        path: '/customers'
      })
    }
  })

  /* 搜索物料 */
  const items = inventoryStore.inventory || []
  items.forEach(i => {
    const code = (i.code || '').toLowerCase()
    const name = (i.name || '').toLowerCase()
    if (code.includes(q) || name.includes(q)) {
      results.push({
        key: 'material_' + i.id,
        label: (i.code || '') + ' ' + (i.name || ''),
        typeLabel: '物料',
        icon: 'package',
        path: '/inventory'
      })
    }
  })

  /* 搜索报价单 */
  const quotations = quotationStore.quotations || []
  quotations.forEach(qt => {
    const no = (qt.quotationNo || qt.quoteNo || '').toLowerCase()
    const customerName = (qt.customerName || '').toLowerCase()
    if (no.includes(q) || customerName.includes(q)) {
      results.push({
        key: 'quotation_' + qt.id,
        label: (qt.quotationNo || qt.quoteNo || '') + ' - ' + (qt.customerName || ''),
        typeLabel: '报价单',
        icon: 'edit',
        path: '/quotations'
      })
    }
  })

  /* 搜索出库单 */
  const outboundOrders = inventoryStore.outboundOrders || []
  outboundOrders.forEach(o => {
    const no = (o.outboundNo || o.orderNo || '').toLowerCase()
    if (no.includes(q)) {
      results.push({
        key: 'outbound_' + o.id,
        label: (o.outboundNo || o.orderNo || ''),
        typeLabel: '出库单',
        icon: 'download',
        path: '/outbound'
      })
    }
  })

  /* 搜索入库单 */
  const inboundOrders = inventoryStore.inboundOrders || []
  inboundOrders.forEach(o => {
    const no = (o.orderNo || '').toLowerCase()
    if (no.includes(q)) {
      results.push({
        key: 'inbound_' + o.id,
        label: o.orderNo || '',
        typeLabel: '入库单',
        icon: 'upload',
        path: '/inbound'
      })
    }
  })

  return results.slice(0, 10)
})

function onSearchFocus() {
  searchCollapsed.value = false
  if (searchQuery.value.trim()) {
    showSearchResults.value = true
  }
}

function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    showSearchResults.value = searchQuery.value.trim().length > 0
  }, 300)
}

function onSearchBlur() {
  if (!searchQuery.value) {
    searchCollapsed.value = false
  }
  /* 延迟关闭，让 mousedown 事件先触发 */
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

function onSearchResultClick(item) {
  showSearchResults.value = false
  searchQuery.value = ''
  if (item.path) {
    router.push(item.path)
  }
}

function onSwitchRole(role) {
  sessionStore.switchRole(role)
  showRoleMenu.value = false
  /* 刷新当前页面以重新加载权限相关数据 */
  router.go(0)
}

function onLogout() {
  sessionStore.clearSession()
  showRoleMenu.value = false
  router.replace('/')
}

function handleClickOutside(e) {
  if (!e.target.closest('.topbar-search')) {
    showSearchResults.value = false
  }
  if (!e.target.closest('.topbar-user')) {
    showRoleMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  clearTimeout(debounceTimer)
  try { themeStore.stopAutoSwitch() } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.app-topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width, 260px);
  right: 0;
  height: var(--topbar-height, 56px);
  background: var(--color-bg-secondary, #1e293b);
  border-bottom: 1px solid var(--color-border, #475569);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6, 1.5rem);
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
  position: relative;
}
.topbar-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-subtle), 0 0 12px rgba(59, 130, 246, 0.1);
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

/* 明暗模式切换按钮 */
.topbar-mode-toggle {
  display: flex;
  align-items: center;
}
.mode-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.mode-toggle-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-accent);
}
.mode-toggle-btn:hover .mode-icon {
  transform: rotate(180deg);
}
.mode-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.5s ease;
}

.topbar-theme-switcher {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.theme-dot {
  width: 20px;
  height: 20px;
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
  box-shadow: 0 0 0 2px var(--color-bg-primary), 0 0 8px rgba(59, 130, 246, 0.3);
  transform: scale(1.15);
}
.theme-more {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
}
.theme-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-popover, 9999);
  min-width: 140px;
  padding: var(--space-1) 0;
  max-height: 300px;
  overflow-y: auto;
}
.theme-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}
.theme-dropdown-item:hover {
  background: var(--color-surface-hover);
}
.theme-dropdown-item.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}
.theme-dropdown-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  position: relative;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.topbar-user:hover {
  background: var(--color-surface-hover);
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
  flex-shrink: 0;
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.user-role-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 600;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-chevron {
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

/* 角色切换下拉菜单 */
.role-switch-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-popover, 9999);
  min-width: 160px;
  padding: var(--space-1) 0;
}
.role-dropdown-header {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
}
.role-dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
}
.role-dropdown-item:hover {
  background: var(--color-surface-hover);
}
.role-dropdown-item.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  font-weight: 500;
}
.role-check {
  width: 16px;
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-accent);
}
.role-dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-1) 0;
}
.role-logout {
  color: var(--color-danger, #EF4444);
}
.role-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 平板适配 */
@media (max-width: 1024px) {
  .app-topbar {
    left: 0;
    padding: 0 var(--space-4);
  }
  .search-input {
    width: 160px;
  }
}

/* 手机适配 */
@media (max-width: 768px) {
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
  /* 手机端隐藏主题切换器和模式切换 */
  .topbar-theme-switcher,
  .topbar-mode-toggle {
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

/* 搜索结果面板 */
.search-results-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl), 0 0 20px rgba(0, 0, 0, 0.15);
  z-index: var(--z-popover, 9999);
  max-height: 320px;
  overflow-y: auto;
  animation: fadeInDown 200ms ease;
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: background var(--transition-fast);
}
.search-result-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.search-result-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}
.search-result-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-result-type {
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.search-result-empty {
  padding: var(--space-4) var(--space-3);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>