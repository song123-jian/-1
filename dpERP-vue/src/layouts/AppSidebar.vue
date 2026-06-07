<template>
  <aside class="app-sidebar" :class="{ 'collapsed': isCollapsed, 'open': isMobileOpen }">
    <div class="sidebar-header">
      <div class="sidebar-logo">冠</div>
      <span class="sidebar-brand" v-show="!isCollapsed">冠久ERP</span>
      <button class="sidebar-collapse-btn" @click="handleToggleCollapse" :title="isCollapsed ? '展开侧边栏' : '折叠侧边栏'">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M10 3L5 8L10 13"/>
        </svg>
      </button>
    </div>

    <div class="sidebar-shortcuts" v-show="!isCollapsed">
      <span class="sidebar-shortcuts-label">快捷入口</span>
      <button class="sidebar-shortcut-btn" @click="navigateTo('/dashboard')" title="仪表盘"><Icon name="chart" :size="16" /></button>
      <button class="sidebar-shortcut-btn" @click="navigateTo('/customers')" title="客户管理"><Icon name="users" :size="16" /></button>
      <button class="sidebar-shortcut-btn" @click="navigateTo('/inbound')" title="入库管理"><Icon name="upload" :size="16" /></button>
      <button class="sidebar-shortcut-btn" @click="navigateTo('/quotations')" title="报价管理"><Icon name="edit" :size="16" /></button>
    </div>

    <nav class="sidebar-nav">
      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.overview }"
        data-section="overview"
      >
        <div class="nav-section-title" @click="toggleSection('overview')">
          <Icon name="chart" :size="14" /> 概览
          <span class="section-arrow"><Icon :name="sectionCollapsed.overview ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <router-link
            v-for="item in overviewItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
          </router-link>
        </div>
      </div>

      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.sales }"
        data-section="sales"
      >
        <div class="nav-section-title" @click="toggleSection('sales')">
          <Icon name="dollar" :size="14" /> 销售
          <span class="section-arrow"><Icon :name="sectionCollapsed.sales ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <router-link
            v-for="item in salesItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
          </router-link>
        </div>
      </div>

      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.warehouse }"
        data-section="warehouse"
      >
        <div class="nav-section-title" @click="toggleSection('warehouse')">
          <Icon name="package" :size="14" /> 仓储
          <span class="section-arrow"><Icon :name="sectionCollapsed.warehouse ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <router-link
            v-for="item in warehouseItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
          </router-link>
        </div>
      </div>

      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.finance }"
        data-section="finance"
      >
        <div class="nav-section-title" @click="toggleSection('finance')">
          <Icon name="dollar" :size="14" /> 财务与结算
          <span class="section-arrow"><Icon :name="sectionCollapsed.finance ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <router-link
            v-for="item in financeItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
          </router-link>
        </div>
      </div>

      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.resource }"
        data-section="resource"
      >
        <div class="nav-section-title" @click="toggleSection('resource')">
          <Icon name="card" :size="14" /> 资源与档案
          <span class="section-arrow"><Icon :name="sectionCollapsed.resource ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <router-link
            v-for="item in resourceItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-item-badge">{{ item.badge }}</span>
          </router-link>
        </div>
      </div>

      <div
        class="nav-section"
        :class="{ collapsed: sectionCollapsed.system }"
        data-section="system"
      >
        <div class="nav-section-title" @click="toggleSection('system')">
          <Icon name="setting" :size="14" /> 系统与管理
          <span class="section-arrow"><Icon :name="sectionCollapsed.system ? 'chevronRight' : 'chevronDown'" :size="12" /></span>
        </div>
        <div class="nav-section-body">
          <div class="nav-item has-submenu" @click="toggleSettingsSubmenu" :class="{ open: settingsSubmenuOpen }">
            <span class="nav-item-icon"><Icon name="setting" :size="16" /></span>
            <span class="nav-item-text">系统设置</span>
            <span class="nav-item-badge settings-toggle-badge"><Icon :name="settingsSubmenuOpen ? 'chevronDown' : 'chevronRight'" :size="12" /></span>
          </div>
          <div class="nav-submenu" :class="{ collapsed: !settingsSubmenuOpen }">
            <router-link
              v-for="item in settingsItems"
              :key="item.path + item.label"
              :to="item.path"
              class="nav-item"
              :class="{ active: isItemActive(item) }"
            >
              <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
              <span class="nav-item-text">{{ item.label }}</span>
            </router-link>
          </div>
          <router-link
            v-for="item in systemItems"
            :key="item.path + item.label"
            :to="item.path"
            class="nav-item"
            :class="{ active: isItemActive(item) }"
          >
            <span class="nav-item-icon"><Icon :name="item.icon" :size="16" /></span>
            <span class="nav-item-text">{{ item.label }}</span>
          </router-link>
        </div>
      </div>
    </nav>

    <div class="sidebar-fav" v-show="!isCollapsed">
      <div class="sidebar-fav-label"><Icon name="star" :size="14" /> 收藏</div>
      <div class="sidebar-fav-list">
        <div v-if="favorites.length === 0" class="sidebar-fav-empty">右键导航项可添加收藏</div>
        <div
          v-for="fav in favorites"
          :key="fav.path"
          class="sidebar-fav-item"
          @click="navigateTo(fav.path)"
        >
          <span><Icon :name="fav.icon" :size="14" /></span>
          <span>{{ fav.label }}</span>
          <span class="fav-remove" @click.stop="removeFavorite(fav.path)"><Icon name="close" :size="12" /></span>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user" @click="handleSwitchRole" :title="'点击切换角色'">
        <div class="sidebar-avatar">{{ sessionStore.roleName?.charAt(0) || '?' }}</div>
        <div class="sidebar-user-info" v-show="!isCollapsed">
          <div class="sidebar-user-name">{{ sessionStore.roleName }}</div>
          <div class="sidebar-user-role"><Icon name="greenCircle" :size="10" /> 在线 {{ sessionStore.onlineMembers.length }}人 · <Icon name="refresh" :size="10" /> 切换身份</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useInventoryStore } from '@/stores/inventory'
import { useSessionStore } from '@/stores/session'
import { useSyncEngine } from '@/utils/syncEngine'
import autoSave from '@/utils/autoSave'

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  mobileOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-collapse', 'close-mobile'])

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const inventoryStore = useInventoryStore()
const sessionStore = useSessionStore()
const settingsSubmenuOpen = ref(false)

/* 内部折叠状态，与props同步 */
const isCollapsed = computed(() => props.collapsed)
const isMobileOpen = computed(() => props.mobileOpen)

function handleToggleCollapse() {
  emit('toggle-collapse')
}

function navigateTo(path) {
  router.push(path)
  /* 移动端导航后关闭菜单 */
  emit('close-mobile')
}

function handleSwitchRole() {
  const syncEngine = useSyncEngine()
  syncEngine.stopAutoSync()
  sessionStore.clearSession()
  router.push('/role-select')
}

const FAV_STORAGE_KEY = 'gj_erp_navFavorites'
const COLLAPSED_STORAGE_KEY = 'gj_erp_collapsedNavSections'

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

const sectionCollapsed = reactive({
  overview: false,
  sales: false,
  warehouse: false,
  finance: false,
  resource: false,
  system: false
})

const favorites = ref(loadFromStorage(FAV_STORAGE_KEY, []))

function toggleSection(section) {
  sectionCollapsed[section] = !sectionCollapsed[section]
  const state = { ...sectionCollapsed }
  saveToStorage(COLLAPSED_STORAGE_KEY, state)
  /* 自动保存布局状态 */
  autoSave.saveLayoutState({ navSectionsCollapsed: state })
}

function toggleSettingsSubmenu() {
  settingsSubmenuOpen.value = !settingsSubmenuOpen.value
}

function isItemActive(item) {
  if (item.matchPath && !item.tab) {
    return route.path.startsWith(item.matchPath) && !route.query.tab
  }
  if (item.tab) {
    return route.path === '/system' && route.query.tab === item.tab
  }
  return route.path === item.path
}

function addFavorite(item) {
  const exists = favorites.value.find(f => f.path === item.path && f.label === item.label)
  if (exists) return
  if (favorites.value.length >= 15) return
  favorites.value.push({ path: item.path, label: item.label, icon: item.icon })
  saveToStorage(FAV_STORAGE_KEY, favorites.value)
}

function removeFavorite(path) {
  favorites.value = favorites.value.filter(f => f.path !== path)
  saveToStorage(FAV_STORAGE_KEY, favorites.value)
}

onMounted(() => {
  /* 恢复导航分区折叠状态 */
  const collapsedState = loadFromStorage(COLLAPSED_STORAGE_KEY, {})
  Object.keys(collapsedState).forEach(key => {
    if (key in sectionCollapsed) {
      sectionCollapsed[key] = collapsedState[key]
    }
  })
})

const overviewItems = computed(() => [
  { path: '/dashboard', icon: 'table', label: '仪表盘' },
  { path: '/data-screen', icon: 'database', label: '数据大屏', matchPath: '/data-screen' },
  { path: '/todos', icon: 'check', label: '待办事项', badge: todoStore.stats.overdue || null },
  { path: '/workflow', icon: 'layers', label: '工作流管理', matchPath: '/workflow' },
  { path: '/favorites', icon: 'star', label: '收藏导航', matchPath: '/favorites' },
])

const salesItems = computed(() => [
  { path: '/customers', icon: 'building', label: '客户管理', matchPath: '/customers' },
  { path: '/tag-category', icon: 'tag', label: '标签分类', matchPath: '/tag-category' },
  { path: '/project-tracking', icon: 'target', label: '项目追踪', matchPath: '/project-tracking' },
  { path: '/quotations', icon: 'list', label: '报价管理', badge: quotationStore.pendingCount || null, matchPath: '/quotations' },
  { path: '/contracts', icon: 'file', label: '合同管理', badge: contractStore.pendingApprovalCount || null, matchPath: '/contracts' },
  { path: '/transactions', icon: 'dollar', label: '交易管理', matchPath: '/transactions' },
  { path: '/statements', icon: 'clipboard', label: '对账管理', matchPath: '/statements' },
])

const warehouseItems = computed(() => [
  { path: '/suppliers', icon: 'building', label: '供应商管理', matchPath: '/suppliers' },
  { path: '/purchase', icon: 'clipboard', label: '采购管理', matchPath: '/purchase' },
  { path: '/inbound', icon: 'upload', label: '入库管理', badge: inventoryStore.pendingInboundCount || null, matchPath: '/inbound' },
  { path: '/inventory', icon: 'package', label: '库存管理', badge: inventoryStore.lowStockCount + inventoryStore.exhaustedCount || null, matchPath: '/inventory' },
  { path: '/outbound', icon: 'download', label: '出库管理', badge: inventoryStore.pendingOutboundCount || null, matchPath: '/outbound' },
  { path: '/stocktaking', icon: 'clipboardCheck', label: '盘点管理', matchPath: '/stocktaking' },
  { path: '/transfer', icon: 'shuffle', label: '调拨管理', matchPath: '/transfer' },
  { path: '/production', icon: 'layers', label: '生产管理', matchPath: '/production' },
  { path: '/warehouse-locations', icon: 'mapPin', label: '仓位管理', matchPath: '/warehouse-locations' },
  { path: '/deliveries', icon: 'truck', label: '送货管理', matchPath: '/deliveries' },
  { path: '/ecommerce', icon: 'globe', label: '电商对接', matchPath: '/ecommerce' },
])

const financeItems = computed(() => [
  { path: '/monthly-stats', icon: 'calendar', label: '月度统计', matchPath: '/monthly-stats' },
  { path: '/collections', icon: 'dollar', label: '回款管理', matchPath: '/collections' },
  { path: '/receivables', icon: 'trendUp', label: '应收管理', matchPath: '/receivables' },
  { path: '/payables', icon: 'arrowDown', label: '应付管理', matchPath: '/payables' },
  { path: '/cost-analysis', icon: 'calculator', label: '成本核算', matchPath: '/cost-analysis' },
  { path: '/reports', icon: 'trendUp', label: '报表中心', matchPath: '/reports' },
])

const resourceItems = computed(() => [
  { path: '/archives', icon: 'card', label: '档案管理', matchPath: '/archives' },
  { path: '/doc-settings', icon: 'award', label: '资质设置', matchPath: '/doc-settings' },
])

const settingsItems = computed(() => [
  { path: '/settings/company', icon: 'building', label: '公司信息', matchPath: '/settings/company' },
  { path: '/settings/params', icon: 'tool', label: '系统参数', matchPath: '/settings/params' },
  { path: '/system?tab=themes', icon: 'palette', label: '主题管理', matchPath: '/system', tab: 'themes' },
  { path: '/system?tab=data', icon: 'save', label: '数据管理', matchPath: '/system', tab: 'data' },
  { path: '/system?tab=users', icon: 'users', label: '用户管理', matchPath: '/system', tab: 'users' },
  { path: '/system?tab=dict', icon: 'list', label: '数据字典', matchPath: '/system', tab: 'dict' },
])

const systemItems = computed(() => [
  { path: '/approvals', icon: 'check', label: '审批配置', matchPath: '/approvals' },
  { path: '/sales-permission', icon: 'shield', label: '销售权限配置', matchPath: '/sales-permission' },
  { path: '/database-connection', icon: 'link', label: '数据库连接', matchPath: '/database-connection' },
  { path: '/logs', icon: 'list', label: '操作日志', matchPath: '/logs' },
  { path: '/mobile-design', icon: 'mobile', label: '移动端设计', matchPath: '/mobile-design' },
])
</script>

<style scoped>
.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width, 260px);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.app-sidebar.collapsed {
  width: 52px;
}
.app-sidebar.collapsed .sidebar-brand,
.app-sidebar.collapsed .sidebar-shortcuts-label,
.app-sidebar.collapsed .nav-section-title,
.app-sidebar.collapsed .nav-item-text,
.app-sidebar.collapsed .nav-item-badge,
.app-sidebar.collapsed .nav-submenu,
.app-sidebar.collapsed .sidebar-user-info,
.app-sidebar.collapsed .sidebar-fav-label,
.app-sidebar.collapsed .sidebar-fav-list,
.app-sidebar.collapsed .sidebar-fav-empty {
  display: none;
}
.app-sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: var(--space-4) 0;
}
.app-sidebar.collapsed .sidebar-shortcuts {
  justify-content: center;
}
.app-sidebar.collapsed .nav-section {
  padding: var(--space-1) 0;
}
.app-sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--space-2);
  margin: 1px 6px;
  position: relative;
}
.app-sidebar.collapsed .nav-item::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast);
  z-index: 200;
  box-shadow: var(--shadow-md);
}
.app-sidebar.collapsed .nav-item:hover::after {
  opacity: 1;
}
.app-sidebar.collapsed .nav-item-icon {
  width: 24px;
  height: 24px;
  font-size: var(--font-size-lg);
}
.app-sidebar.collapsed .sidebar-footer {
  padding: var(--space-3);
  justify-content: center;
}
.app-sidebar.collapsed .sidebar-user {
  justify-content: center;
}

/* 移动端侧边栏 */
@media (max-width: 1023px) {
  .app-sidebar {
    transform: translateX(-100%);
    z-index: 200;
    width: 280px;
  }
  .app-sidebar.open {
    transform: translateX(0);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }
  .app-sidebar.collapsed {
    width: 280px;
    transform: translateX(-100%);
  }
  .app-sidebar.collapsed.open {
    transform: translateX(0);
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  height: var(--topbar-height, 56px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-logo {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-accent), var(--color-purple));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
  font-weight: 700;
  font-size: var(--font-size-base);
  flex-shrink: 0;
}

.sidebar-brand {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  transition: opacity var(--transition-fast);
}

.sidebar-collapse-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.sidebar-collapse-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.sidebar-collapse-btn svg {
  width: 16px;
  height: 16px;
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.app-sidebar.collapsed .sidebar-collapse-btn svg {
  transform: rotate(180deg);
}

.sidebar-shortcuts {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.sidebar-shortcuts-label {
  width: 100%;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}
.sidebar-shortcut-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.sidebar-shortcut-btn:hover {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: scale(1.1);
  box-shadow: 0 0 12px var(--color-accent-subtle);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
  -webkit-overflow-scrolling: touch;
}

.nav-section {
  padding: var(--space-1) var(--space-4);
  margin-bottom: var(--space-1);
}

.nav-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: color 0.15s ease, background 0.15s ease;
  user-select: none;
  border-radius: var(--radius-sm);
}
.nav-section-title:hover {
  color: var(--color-text-secondary);
  background: var(--color-accent-subtle);
}
.section-arrow {
  font-size: 8px;
  transition: transform 200ms ease;
}
.nav-section.collapsed .section-arrow {
  transform: rotate(-90deg);
}
.nav-section-body {
  max-height: 800px;
  opacity: 1;
  overflow: hidden;
  transition: max-height 250ms ease-in, opacity 150ms ease-in 50ms;
}
.nav-section.collapsed .nav-section-body {
  max-height: 0;
  opacity: 0;
  transition: max-height 250ms ease-out, opacity 150ms ease-out;
}

.nav-section[data-section="overview"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-accent);
  margin-right: 8px;
  vertical-align: middle;
}
.nav-section[data-section="sales"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-success);
  margin-right: 8px;
  vertical-align: middle;
}
.nav-section[data-section="warehouse"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-warning);
  margin-right: 8px;
  vertical-align: middle;
}
.nav-section[data-section="finance"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-purple);
  margin-right: 8px;
  vertical-align: middle;
}
.nav-section[data-section="resource"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-danger);
  margin-right: 8px;
  vertical-align: middle;
}
.nav-section[data-section="system"] .nav-section-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--color-text-tertiary);
  margin-right: 8px;
  vertical-align: middle;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  margin: 1px 0;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: background 0.15s ease, transform 0.1s ease, color var(--transition-fast);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  position: relative;
  text-decoration: none;
}
.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: transparent;
  transition: background var(--transition-fast);
}
.nav-item:hover {
  background: var(--color-accent-subtle);
  color: var(--color-text-primary);
}
.nav-item:hover::before {
  background: var(--color-accent);
}
.nav-item:active {
  transform: scale(0.98);
}
.nav-item.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  font-weight: 600;
}
.nav-item.active::before {
  background: var(--color-accent);
}
.nav-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: -0.02em;
}
.nav-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item-badge {
  margin-left: auto;
  font-size: var(--font-size-xs);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-weight: 600;
}
.settings-toggle-badge {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  margin-left: auto;
}

.nav-submenu {
  padding-left: var(--space-6);
  overflow: hidden;
  max-height: 500px;
  opacity: 1;
  transition: max-height 250ms ease, opacity 200ms ease;
}
.nav-submenu.collapsed {
  max-height: 0;
  opacity: 0;
}
.nav-submenu .nav-item {
  position: relative;
}
.nav-submenu .nav-item::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  opacity: 0.5;
  transform: translateY(-50%);
  transition: background 0.15s ease, opacity 0.15s ease;
}
.nav-submenu .nav-item:hover::after,
.nav-submenu .nav-item.active::after {
  background: var(--color-accent);
  opacity: 1;
}

.sidebar-fav {
  border-top: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  flex-shrink: 0;
  max-height: 160px;
  overflow-y: auto;
}
.sidebar-fav-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-1) var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.sidebar-fav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar-fav-empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: var(--space-1) var(--space-2);
}
.sidebar-fav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 3px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, padding-left 0.15s ease;
}
.sidebar-fav-item:hover {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  padding-left: 8px;
}
.sidebar-fav-item .fav-remove {
  margin-left: auto;
  opacity: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 10px;
  transition: opacity var(--transition-fast);
}
.sidebar-fav-item:hover .fav-remove {
  opacity: 1;
}

.sidebar-footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-5);
  flex-shrink: 0;
}
.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
}
.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
  font-weight: 600;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}
.sidebar-user-info {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: opacity var(--transition-fast);
}
.sidebar-user-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}
.sidebar-user-role {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* 移动端快捷按钮更紧凑 */
@media (max-width: 767px) {
  .sidebar-shortcuts {
    padding: var(--space-2) var(--space-3);
  }
  .sidebar-shortcut-btn {
    width: 32px;
    height: 32px;
    font-size: var(--font-size-sm);
  }
}

@keyframes favPulse {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 0.7; }
}
.nav-fav-indicator {
  display: inline-block;
  animation: favPulse 0.3s ease-out;
}
</style>
