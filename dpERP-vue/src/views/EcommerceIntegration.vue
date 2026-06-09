<template>
  <div class="ecommerce-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-header-title">电商对接</h1>
          <p class="page-header-subtitle">管理电商平台连接、数据同步与商品映射</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" @click="handleSyncAll" :disabled="isSyncingAll">
            <span v-if="isSyncingAll" class="spinner"></span>
            <Icon v-else name="refresh" :size="14" />
            {{ isSyncingAll ? '同步中...' : '立即全量同步' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">已连接平台</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success);">
            <Icon name="link" :size="14" />
          </div>
        </div>
        <div class="stat-card-value">{{ store.connectedCount }}</div>
        <div class="stat-card-change">共 {{ store.platforms.length }} 个平台</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">今日同步</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent);">
            <Icon name="refresh" :size="14" />
          </div>
        </div>
        <div class="stat-card-value">{{ store.todaySyncCount }}</div>
        <div class="stat-card-change">次成功同步</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">同步失败</span>
          <div class="stat-card-icon" style="background: var(--color-danger-subtle); color: var(--color-danger);">
            <Icon name="warning" :size="14" />
          </div>
        </div>
        <div class="stat-card-value">{{ store.failedSyncCount }}</div>
        <div class="stat-card-change">需要关注</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-label">商品映射</span>
          <div class="stat-card-icon" style="background: var(--color-purple-subtle); color: var(--color-purple);">
            <Icon name="layers" :size="14" />
          </div>
        </div>
        <div class="stat-card-value">{{ store.totalMappingCount }}</div>
        <div class="stat-card-change">条映射关系</div>
      </div>
    </div>

    <!-- 平台连接卡片 -->
    <div class="panel-card" style="margin-bottom: var(--space-5);">
      <div class="panel-card-header">
        <span class="panel-card-title">平台连接</span>
        <span class="panel-card-subtitle">已连接 {{ store.connectedCount }}/{{ store.platforms.length }}</span>
      </div>
      <div class="panel-card-body">
        <div class="platform-grid">
          <PlatformCard
            v-for="platform in store.platforms"
            :key="platform.id"
            :platform="platform"
            :is-connecting="store.connectingPlatforms.has(platform.id)"
            :is-syncing="store.syncingPlatforms.has(platform.id)"
            @connect="handleConnect"
            @disconnect="handleDisconnect"
            @sync="handleSync"
          />
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="panel-card">
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" :size="14" />
          {{ tab.label }}
        </button>
      </div>

      <div class="panel-card-body">
        <!-- 同步记录 -->
        <div v-if="activeTab === 'logs'">
          <SyncLogTable :logs="store.syncLogs" :platforms="store.platforms" />
        </div>

        <!-- 商品映射 -->
        <div v-if="activeTab === 'mappings'">
          <ProductMappingTable
            :mappings="store.productMappings"
            @add="handleAddMapping"
            @remove="handleRemoveMapping"
          />
        </div>

        <!-- 同步设置 -->
        <div v-if="activeTab === 'settings'">
          <SyncSettingsPanel
            :settings="store.syncSettings"
            @save="handleSaveSettings"
          />
        </div>
      </div>
    </div>

    <!-- 断开连接确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDisconnectConfirm" class="modal-overlay" @click.self="showDisconnectConfirm = false">
        <div class="modal-dialog" style="max-width: 400px;">
          <div class="modal-header">
            <h3 class="modal-title">确认断开连接</h3>
            <button class="modal-close" @click="showDisconnectConfirm = false"><Icon name="close" :size="14" /></button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
              确定要断开与 <strong style="color: var(--color-text-primary);">{{ disconnectTargetName }}</strong> 的连接吗？断开后将停止该平台的所有数据同步。
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDisconnectConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmDisconnect">确认断开</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 全量同步提示 -->
    <Teleport to="body">
      <div v-if="showSyncAllToast" class="toast-container" style="z-index: 10001;">
        <div class="toast toast-success">已触发全量同步，请稍候查看同步结果</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEcommerceStore } from '@/stores/ecommerce'
import PlatformCard from '@/components/ecommerce/PlatformCard.vue'
import SyncLogTable from '@/components/ecommerce/SyncLogTable.vue'
import ProductMappingTable from '@/components/ecommerce/ProductMappingTable.vue'
import SyncSettingsPanel from '@/components/ecommerce/SyncSettingsPanel.vue'

const store = useEcommerceStore()

const activeTab = ref('logs')
const showDisconnectConfirm = ref(false)
const disconnectTargetId = ref(null)
const showSyncAllToast = ref(false)
const isSyncingAll = ref(false)

const tabs = [
  { key: 'logs', label: '同步记录', icon: 'log' },
  { key: 'mappings', label: '商品映射', icon: 'layers' },
  { key: 'settings', label: '同步设置', icon: 'setting' }
]

const disconnectTargetName = computed(() => {
  if (!disconnectTargetId.value) return ''
  const platform = store.platforms.find(p => p.id === disconnectTargetId.value)
  return platform ? platform.name : ''
})

function handleConnect(platformId) {
  store.connectPlatform(platformId)
}

function handleDisconnect(platformId) {
  disconnectTargetId.value = platformId
  showDisconnectConfirm.value = true
}

function confirmDisconnect() {
  if (disconnectTargetId.value) {
    store.disconnectPlatform(disconnectTargetId.value)
  }
  showDisconnectConfirm.value = false
  disconnectTargetId.value = null
}

function handleSync(platformId) {
  store.syncNow(platformId, 'order')
}

function handleSyncAll() {
  isSyncingAll.value = true
  store.syncAll()
  showSyncAllToast.value = true
  setTimeout(() => {
    showSyncAllToast.value = false
    isSyncingAll.value = false
  }, 3000)
}

function handleAddMapping(mapping) {
  store.addProductMapping(mapping)
}

function handleRemoveMapping(id) {
  store.removeProductMapping(id)
}

function handleSaveSettings(settings) {
  store.updateSyncSettings(settings)
}

onMounted(() => {
  store.initSeedData()
})
</script>

<style scoped>
.ecommerce-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}

.page-header {
  margin-bottom: var(--space-5);
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.page-header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-5);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-hover);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.panel-card-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1023px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .platform-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .platform-grid {
    grid-template-columns: 1fr;
  }

  .page-header-row {
    flex-direction: column;
  }
}
</style>
