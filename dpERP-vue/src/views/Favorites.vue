<template>
  <div class="favorites-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title"><Icon name="star" :size="14" /> 收藏导航</h2>
        <p class="page-header-subtitle">管理您收藏的常用页面，快速跳转</p>
      </div>
      <button class="btn btn-ghost" @click="$router.push('/dashboard')"><Icon name="chevronLeft" :size="14" /> 返回仪表盘</button>
    </div>

    <div class="fav-stats-bar">
      <div class="fav-stat-item">
        <span class="fav-stat-value">{{ favorites.length }}</span>
        <span class="fav-stat-label">已收藏</span>
      </div>
      <div class="fav-stat-item">
        <span class="fav-stat-value">{{ recentCount }}</span>
        <span class="fav-stat-label">最近访问</span>
      </div>
      <div class="fav-stat-item">
        <span class="fav-stat-value">{{ maxFavorites }}</span>
        <span class="fav-stat-label">收藏上限</span>
      </div>
    </div>

    <div class="fav-grid" v-if="favorites.length > 0">
      <div
        v-for="(fav, index) in favorites"
        :key="fav.path"
        class="panel-card fav-card"
        @click="navigateTo(fav.path)"
      >
        <div class="fav-card-icon"><Icon :name="fav.icon" :size="14" /></div>
        <div class="fav-card-info">
          <div class="fav-card-name">{{ fav.label }}</div>
          <div class="fav-card-path">{{ fav.path }}</div>
        </div>
        <button class="fav-card-remove" @click.stop="removeFavorite(fav.path)" title="取消收藏"><Icon name="close" :size="14" /></button>
      </div>
    </div>

    <div v-else class="fav-empty">
      <div class="fav-empty-icon"><Icon name="star" :size="14" /></div>
      <div class="fav-empty-title">暂无收藏</div>
      <div class="fav-empty-desc">右键点击侧边栏导航项可添加收藏</div>
    </div>

    <div class="fav-recommend" v-if="recommendItems.length > 0">
      <div class="fav-recommend-header">
        <span class="panel-card-title">[推荐] 推荐收藏</span>
        <span class="fav-recommend-hint">点击快速添加常用页面</span>
      </div>
      <div class="fav-recommend-grid">
        <div
          v-for="item in recommendItems"
          :key="item.path"
          class="fav-recommend-item"
          @click="addFavorite(item)"
        >
          <span class="fav-recommend-icon"><Icon :name="item.icon" :size="14" /></span>
          <span class="fav-recommend-label">{{ item.label }}</span>
          <span class="fav-recommend-add">+</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const FAV_STORAGE_KEY = 'gj_erp_navFavorites'
const maxFavorites = 15
const recentCount = ref(0)

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

const favorites = ref(loadFromStorage(FAV_STORAGE_KEY, []))

const allNavItems = [
  { path: '/dashboard', icon: 'table', label: '仪表盘' },
  { path: '/todos', icon: 'check', label: '待办事项' },
  { path: '/customers', icon: 'building', label: '客户管理' },
  { path: '/tag-category', icon: 'tag', label: '标签分类' },
  { path: '/project-tracking', icon: 'target', label: '项目追踪' },
  { path: '/quotations', icon: 'list', label: '报价管理' },
  { path: '/contracts', icon: 'file', label: '合同管理' },
  { path: '/transactions', icon: 'creditCard', label: '交易管理' },
  { path: '/inbound', icon: 'upload', label: '入库管理' },
  { path: '/warehouse-locations', icon: 'mapPin', label: '仓位管理' },
  { path: '/deliveries', icon: 'truck', label: '送货管理' },
  { path: '/monthly-stats', icon: 'calendar', label: '月度统计' },
  { path: '/collections', icon: 'dollar', label: '回款管理' },
  { path: '/cost-analysis', icon: 'calculator', label: '成本核算' },
  { path: '/reports', icon: 'trendUp', label: '报表中心' },
  { path: '/statements', icon: 'file', label: '对账管理' },
  { path: '/archives', icon: 'archive', label: '档案管理' },
  { path: '/doc-settings', icon: 'award', label: '资质设置' },
  { path: '/approvals', icon: 'checkCircle', label: '审批配置' },
  { path: '/sales-permission', icon: 'shield', label: '销售权限配置' },
  { path: '/database-connection', icon: 'link', label: '数据库连接' },
  { path: '/logs', icon: 'log', label: '操作日志' },
  { path: '/mobile-design', icon: 'mobile', label: '移动端设计' },
  { path: '/settings/company', icon: 'building', label: '公司信息' },
  { path: '/settings/params', icon: 'setting', label: '系统参数' },
]

const recommendItems = computed(() => {
  const favPaths = new Set(favorites.value.map(f => f.path))
  return allNavItems.filter(item => !favPaths.has(item.path))
})

function navigateTo(path) {
  router.push(path)
}

function addFavorite(item) {
  const exists = favorites.value.find(f => f.path === item.path)
  if (exists) return
  if (favorites.value.length >= maxFavorites) return
  favorites.value.push({ path: item.path, label: item.label, icon: item.icon })
  saveToStorage(FAV_STORAGE_KEY, favorites.value)
}

function removeFavorite(path) {
  favorites.value = favorites.value.filter(f => f.path !== path)
  saveToStorage(FAV_STORAGE_KEY, favorites.value)
}

function handleStorageChange(e) {
  if (e.key === FAV_STORAGE_KEY) {
    favorites.value = loadFromStorage(FAV_STORAGE_KEY, [])
  }
}

onMounted(() => {
  window.addEventListener('storage', handleStorageChange)
  recentCount.value = Math.min(favorites.value.length, 5)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.favorites-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.page-header-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0;
}

.fav-stats-bar {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.fav-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-4);
  border-right: 1px solid var(--color-border);
}

.fav-stat-item:last-child {
  border-right: none;
}

.fav-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.fav-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.fav-card {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  transition: all var(--transition-fast);
  position: relative;
}

.fav-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-subtle);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.fav-card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  font-weight: 600;
  flex-shrink: 0;
}

.fav-card-info {
  flex: 1;
  min-width: 0;
}

.fav-card-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-card-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-card-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--transition-fast);
}

.fav-card:hover .fav-card-remove {
  opacity: 1;
}

.fav-card-remove:hover {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.fav-empty {
  text-align: center;
  padding: var(--space-10) 0;
  margin-bottom: var(--space-6);
}

.fav-empty-icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
  opacity: 0.3;
}

.fav-empty-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.fav-empty-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.fav-recommend {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-5);
}

.fav-recommend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.fav-recommend-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.fav-recommend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-2);
}

.fav-recommend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.fav-recommend-item:hover {
  border-color: var(--color-accent);
  border-style: solid;
  background: var(--color-accent-subtle);
  color: var(--color-accent);
}

.fav-recommend-icon {
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}

.fav-recommend-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-recommend-add {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-accent);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.fav-recommend-item:hover .fav-recommend-add {
  opacity: 1;
}

@media (max-width: 1024px) {
  .fav-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  .fav-stats-bar {
    flex-wrap: wrap;
  }
}
@media (max-width: 768px) {
  .fav-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  .fav-stats-bar {
    flex-wrap: wrap;
  }
  .fav-stat-item {
    flex: 1;
    min-width: 80px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2);
  }
  .fav-stat-item:last-child {
    border-bottom: none;
  }
  .fav-recommend-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
