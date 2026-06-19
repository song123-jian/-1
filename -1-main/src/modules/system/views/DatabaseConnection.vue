<template>
  <div class="db-connection-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">数据库连接</h2>
        <p class="page-header-subtitle">配置 Supabase 云数据库，实现团队数据共享与实时同步</p>
      </div>
      <div class="page-header-actions">
        <span class="status-badge" :class="sbStore.isConnected ? 'success' : 'neutral'">
          {{ sbStore.isConnected ? '已连接' : '未连接' }}
        </span>
      </div>
    </div>

    <!-- 连接状态卡片 -->
    <div class="panel-card" style="margin-bottom: var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="setting" :size="14" />
          连接配置
        </span>
        <span v-if="sbStore.isConnected" style="color: var(--color-success); font-size: var(--font-size-sm)">
          {{ sbStore.connectionSummary }}
        </span>
      </div>
      <div class="panel-card-body">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Project URL</label>
            <input
              v-model="sbStore.url"
              type="url"
              class="form-input"
              placeholder="https://xxxxx.supabase.co"
              :disabled="sbStore.connected"
            />
            <div class="form-hint">
              在 Supabase 项目设置
              <Icon name="chevronRight" :size="14" />
              API
              <Icon name="chevronRight" :size="14" />
              Project URL 中获取
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Anon Public Key</label>
            <input
              v-model="sbStore.anonKey"
              type="password"
              class="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              :disabled="sbStore.connected"
            />
            <div class="form-hint">
              在 Supabase 项目设置
              <Icon name="chevronRight" :size="14" />
              API
              <Icon name="chevronRight" :size="14" />
              anon public 中获取
            </div>
          </div>
        </div>

        <div class="form-actions">
          <template v-if="!sbStore.connected">
            <button
              class="btn btn-outline"
              :disabled="sbStore.testing || !sbStore.url || !sbStore.anonKey"
              @click="handleTest"
            >
              <template v-if="sbStore.testing">测试中...</template>
              <template v-else>
                <Icon name="search" :size="14" />
                测试连接
              </template>
            </button>
            <button
              class="btn btn-primary"
              :disabled="sbStore.connecting || !sbStore.url || !sbStore.anonKey"
              @click="handleConnect"
            >
              <template v-if="sbStore.connecting">连接中...</template>
              <template v-else>
                <Icon name="link" :size="14" />
                连接
              </template>
            </button>
          </template>
          <template v-else>
            <button class="btn btn-outline btn-danger" @click="handleDisconnect">[状态] 断开连接</button>
          </template>
        </div>

        <div v-if="sbStore.testResult" class="test-result" :class="sbStore.testResult.success ? 'success' : 'error'">
          {{ sbStore.testResult.message }}
        </div>
      </div>
    </div>

    <!-- 数据同步面板 -->
    <div v-if="sbStore.isConnected" class="panel-card" style="margin-bottom: var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="refresh" :size="14" />
          数据同步
        </span>
        <span v-if="sbStore.lastSyncTime" style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
          最近同步: {{ formatTime(sbStore.lastSyncTime) }}
        </span>
      </div>
      <div class="panel-card-body">
        <div class="sync-actions">
          <button class="btn btn-primary" :disabled="syncing || syncEngine.isSyncing.value" @click="handlePushAll">
            <template v-if="syncing || syncEngine.isSyncing.value">同步中...</template>
            <template v-else>
              <Icon name="download" :size="14" />
              上传本地数据到云端
            </template>
          </button>
          <button class="btn btn-outline" :disabled="syncing || syncEngine.isSyncing.value" @click="handlePullAll">
            <template v-if="syncing || syncEngine.isSyncing.value">同步中...</template>
            <template v-else>
              <Icon name="download" :size="14" />
              从云端拉取数据
            </template>
          </button>
          <button
            class="btn btn-outline"
            :disabled="syncing || syncEngine.isSyncing.value"
            @click="handleBidirectionalSync"
          >
            {{ syncing || syncEngine.isSyncing.value ? '同步中...' : '[合并] 双向合并同步' }}
          </button>
          <button class="btn btn-outline" :disabled="!sbStore.isConnected" @click="handleAutoSync">
            [自动] 启动自动同步
          </button>
          <button
            class="btn btn-outline"
            :disabled="syncing || syncEngine.isSyncing.value"
            @click="handleForceFullSync"
          >
            <Icon name="refresh" :size="14" />
            强制全量同步
          </button>
        </div>

        <div
          v-if="syncEngine.syncStats.value.lastSyncTime"
          class="sync-info"
          style="margin-top: var(--space-3); font-size: var(--font-size-sm); color: var(--color-text-secondary)"
        >
          自动同步统计: 已同步 {{ syncEngine.syncStats.value.totalSynced }} 条 · 错误
          {{ syncEngine.syncStats.value.totalErrors }} 个 · 最近
          {{ formatTime(syncEngine.syncStats.value.lastSyncTime) }}
        </div>

        <div v-if="syncing" class="sync-warning">
          <span><Icon name="warning" :size="14" /></span>
          同步进行中，请勿关闭页面...
        </div>

        <!-- 同步状态表 -->
        <div class="table-container" style="margin-top: var(--space-4)">
          <table class="data-table">
            <thead>
              <tr>
                <th>数据表</th>
                <th>本地记录数</th>
                <th>同步状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="table in syncTables" :key="table.name">
                <td>
                  <strong>{{ table.label }}</strong>
                </td>
                <td>{{ table.localCount }}</td>
                <td>
                  <span class="status-badge" :class="syncBadgeClass(table.name)">
                    {{ syncBadgeText(table.name) }}
                  </span>
                </td>
                <td>
                  <button
                    class="btn btn-ghost btn-sm"
                    :disabled="syncing"
                    @click="handlePushOne(table.name, table.dataKey)"
                  >
                    <Icon name="download" :size="14" />
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    :disabled="syncing"
                    @click="handlePullOne(table.name, table.storeRef)"
                  >
                    <Icon name="download" :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 同步错误日志 -->
    <div
      v-if="sbStore.syncErrors.length > 0"
      class="panel-card"
      style="margin-bottom: var(--space-6); border-left: 3px solid var(--color-danger)"
    >
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="log" :size="14" />
          同步错误
        </span>
        <button class="btn btn-ghost btn-sm" @click="sbStore.clearErrors()">清除</button>
      </div>
      <div class="panel-card-body">
        <div v-for="(err, idx) in sbStore.syncErrors" :key="idx" class="error-item">
          <span class="error-resource">{{ err.resource }}</span>
          <span class="error-action">{{ err.action === 'push' ? '上传' : '下载' }}</span>
          <span class="error-msg">{{ err.error }}</span>
          <span class="error-time">{{ formatTime(err.time) }}</span>
        </div>
      </div>
    </div>

    <!-- 建表指南 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="file" :size="14" />
          快速入门指南
        </span>
      </div>
      <div class="panel-card-body">
        <div class="guide-steps">
          <div class="guide-step">
            <div class="guide-step-num">1</div>
            <div class="guide-step-content">
              <strong>注册 Supabase</strong>
              <p>
                访问
                <a href="https://supabase.com" target="_blank" rel="noopener" style="color: var(--color-accent)">
                  supabase.com
                </a>
                注册免费账号，创建新项目
              </p>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">2</div>
            <div class="guide-step-content">
              <strong>创建数据库表</strong>
              <p>在 Supabase SQL Editor 中执行建表语句（点击下方按钮复制）</p>
              <button class="btn btn-outline btn-sm" style="margin-top: var(--space-2)" @click="copySQL">
                <Icon name="copy" :size="14" />
                复制建表SQL
              </button>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">3</div>
            <div class="guide-step-content">
              <strong>获取连接信息</strong>
              <p>
                在项目设置
                <Icon name="chevronRight" :size="14" />
                API 中复制 Project URL 和 anon public key，填入上方表单
              </p>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">4</div>
            <div class="guide-step-content">
              <strong>测试并连接</strong>
              <p>点击"测试连接"确认可用，然后点击"连接"建立连接</p>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">5</div>
            <div class="guide-step-content">
              <strong>同步数据</strong>
              <p>首次使用点击"上传本地数据到云端"，之后其他团队成员点击"从云端拉取数据"即可共享</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <div v-if="copySuccess" class="toast-success">SQL 已复制到剪贴板</div>
  </div>
</template>

<script>
export default { name: 'DatabaseConnection' }
</script>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSupabaseStore } from '@/stores/supabase'
import { useSyncEngine } from '@/utils/syncEngine'
import { mergeArrays } from '@/utils/conflictResolver'
import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { useTodoStore } from '@/stores/todo'
import { useCostStore } from '@/modules/finance/stores/cost'
import { useWarehouseLocationStore } from '@/modules/warehouse/stores/warehouseLocation'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import { useConfirm } from '@/composables/useConfirm'

const sbStore = useSupabaseStore()
const syncEngine = useSyncEngine()
const confirm = useConfirm()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const contractStore = useContractStore()
const inventoryStore = useInventoryStore()
const deliveryStore = useDeliveryStore()
const collectionStore = useCollectionStore()
const statementStore = useStatementStore()
const todoStore = useTodoStore()
const costStore = useCostStore()
const warehouseLocationStore = useWarehouseLocationStore()
const supplierStore = useSupplierStore()

const syncing = ref(false)
const copySuccess = ref(false)

/**
 * 校验从远端拉取的数据数组是否合法
 * 确保数据是数组且每条记录包含 id 字段，过滤掉不合法的记录
 * @param {*} data - 待校验的数据
 * @param {string} tableName - 表名（用于日志）
 * @returns {Array} 校验后的合法数据数组
 */
function validateDataArray(data, tableName) {
  if (!Array.isArray(data)) {
    console.warn(`[数据校验] ${tableName}: 拉取数据不是数组，已忽略 (类型: ${typeof data})`)
    return []
  }
  const validItems = data.filter((item) => {
    if (!item || typeof item !== 'object') {
      console.warn(`[数据校验] ${tableName}: 存在非对象记录，已过滤`)
      return false
    }
    if (!item.id) {
      console.warn(`[数据校验] ${tableName}: 存在缺少id字段的记录，已过滤`, item)
      return false
    }
    return true
  })
  if (validItems.length !== data.length) {
    console.warn(
      `[数据校验] ${tableName}: 原始 ${data.length} 条，有效 ${validItems.length} 条，过滤 ${data.length - validItems.length} 条`
    )
  }
  return validItems
}

const syncTables = computed(() => [
  {
    name: 'customers',
    label: '客户管理',
    localCount: customerStore.customers.length,
    dataKey: 'customers',
    storeRef: customerStore
  },
  {
    name: 'quotations',
    label: '报价管理',
    localCount: quotationStore.quotations.length,
    dataKey: 'quotations',
    storeRef: quotationStore
  },
  {
    name: 'contracts',
    label: '合同管理',
    localCount: contractStore.contracts.length,
    dataKey: 'contracts',
    storeRef: contractStore
  },
  {
    name: 'inventory',
    label: '库存数据',
    localCount: inventoryStore.enrichedInventory.length,
    dataKey: 'enrichedInventory',
    storeRef: inventoryStore
  },
  {
    name: 'inbound_orders',
    label: '入库单',
    localCount: inventoryStore.inboundOrders.length,
    dataKey: 'inboundOrders',
    storeRef: inventoryStore
  },
  {
    name: 'outbound_orders',
    label: '出库单',
    localCount: inventoryStore.outboundOrders.length,
    dataKey: 'outboundOrders',
    storeRef: inventoryStore
  },
  {
    name: 'deliveries',
    label: '送货单',
    localCount: deliveryStore.deliveries.length,
    dataKey: 'deliveries',
    storeRef: deliveryStore
  },
  {
    name: 'collections',
    label: '回款记录',
    localCount: collectionStore.collections.length,
    dataKey: 'collections',
    storeRef: collectionStore
  },
  {
    name: 'statements',
    label: '对账单',
    localCount: statementStore.statements.length,
    dataKey: 'statements',
    storeRef: statementStore
  },
  { name: 'todos', label: '待办事项', localCount: todoStore.todos.length, dataKey: 'todos', storeRef: todoStore },
  {
    name: 'cost_records',
    label: '成本核算',
    localCount: costStore.records.length,
    dataKey: 'records',
    storeRef: costStore
  },
  {
    name: 'warehouse_locations',
    label: '仓位管理',
    localCount: warehouseLocationStore.locations.length,
    dataKey: 'locations',
    storeRef: warehouseLocationStore
  },
  {
    name: 'suppliers',
    label: '供应商管理',
    localCount: supplierStore.suppliers.length,
    dataKey: 'suppliers',
    storeRef: supplierStore
  }
])

function syncBadgeClass(name) {
  const s = sbStore.syncStatus[name]
  if (s === 'synced') return 'success'
  if (s === 'syncing') return 'warning'
  if (s === 'error') return 'danger'
  return 'neutral'
}

function syncBadgeText(name) {
  const s = sbStore.syncStatus[name]
  if (s === 'synced') return '已同步'
  if (s === 'syncing') return '同步中'
  if (s === 'error') return '失败'
  return '待同步'
}

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

async function handleTest() {
  try {
    await sbStore.testConnection()
  } catch (e) {
    console.error('[DatabaseConnection] 测试连接失败:', e)
    alert('测试连接失败: ' + (e.message || '未知错误'))
  }
}

async function handleConnect() {
  try {
    const result = await sbStore.connect()
    if (result.success) {
      // 连接成功后订阅实时变更
      subscribeAllTables()
    }
  } catch (e) {
    console.error('[DatabaseConnection] 连接失败:', e)
    alert('连接失败: ' + (e.message || '未知错误'))
  }
}

async function handleDisconnect() {
  try {
    const ok = await confirm.show({
      title: '断开连接',
      message: '断开连接后，数据将仅保存在本地浏览器中。确定断开？',
      danger: true
    })
    if (ok) {
      sbStore.disconnect()
    }
  } catch (e) {
    console.warn('[DatabaseConnection] 断开连接异常:', e.message)
  }
}

function subscribeAllTables() {
  const tables = [
    'customers',
    'quotations',
    'contracts',
    'inventory',
    'inbound_orders',
    'outbound_orders',
    'deliveries',
    'collections',
    'statements',
    'todos',
    'cost_records',
    'warehouse_locations'
  ]
  const storeMap = {
    customers: { store: customerStore, dataKey: 'customers' },
    quotations: { store: quotationStore, dataKey: 'quotations' },
    contracts: { store: contractStore, dataKey: 'contracts' },
    inventory: { store: inventoryStore, dataKey: 'inventory' },
    inbound_orders: { store: inventoryStore, dataKey: 'inboundOrders', replaceMethod: 'replaceInbound' },
    outbound_orders: { store: inventoryStore, dataKey: 'outboundOrders', replaceMethod: 'replaceOutbound' },
    deliveries: { store: deliveryStore, dataKey: 'deliveries' },
    collections: { store: collectionStore, dataKey: 'collections' },
    statements: { store: statementStore, dataKey: 'statements' },
    todos: { store: todoStore, dataKey: 'todos' },
    cost_records: { store: costStore, dataKey: 'records' },
    warehouse_locations: { store: warehouseLocationStore, dataKey: 'locations' }
  }

  for (const t of tables) {
    const config = storeMap[t]
    if (!config) continue

    sbStore.subscribeRealtime(t, {
      onInsert: (row) => {
        if (!row || !row.id) return
        const data = config.store[config.dataKey]
        if (Array.isArray(data) && !data.some((item) => item.id === row.id)) {
          data.push(row)
          console.debug(`[Realtime] ${t} 新增同步到Store:`, row.id)
        }
      },
      onUpdate: (row) => {
        if (!row || !row.id) return
        const data = config.store[config.dataKey]
        if (Array.isArray(data)) {
          const idx = data.findIndex((item) => item.id === row.id)
          if (idx !== -1) {
            data[idx] = row
            console.debug(`[Realtime] ${t} 更新同步到Store:`, row.id)
          }
        }
      },
      onDelete: (old) => {
        if (!old || !old.id) return
        const data = config.store[config.dataKey]
        if (Array.isArray(data)) {
          const filtered = data.filter((item) => item.id !== old.id)
          if (filtered.length !== data.length) {
            // 使用 replaceData 方法触发响应式更新和持久化
            if (config.replaceMethod && config.store[config.replaceMethod]) {
              config.store[config.replaceMethod](filtered)
            } else if (config.store.replaceData) {
              config.store.replaceData(filtered)
            } else {
              config.store[config.dataKey] = filtered
            }
            console.debug(`[Realtime] ${t} 删除同步到Store:`, old.id)
          }
        }
      }
    })
  }
}

async function handlePushAll() {
  syncing.value = true
  try {
    await sbStore.pushAll({
      customer: customerStore,
      quotation: quotationStore,
      contract: contractStore,
      inventory: inventoryStore,
      delivery: deliveryStore,
      collection: collectionStore,
      statement: statementStore,
      todo: todoStore,
      cost: costStore,
      warehouseLocation: warehouseLocationStore
    })
  } finally {
    syncing.value = false
  }
}

async function handlePullAll() {
  const ok = await confirm.show({
    title: '拉取数据',
    message: '从云端拉取数据将覆盖本地数据，确定继续？',
    danger: true
  })
  if (!ok) return
  syncing.value = true
  try {
    const data = await sbStore.pullAll()
    // 将拉取的数据校验后写入各 Store
    if (data.customers) customerStore.replaceData(validateDataArray(data.customers, 'customers'))
    if (data.quotations) quotationStore.replaceData(validateDataArray(data.quotations, 'quotations'))
    if (data.contracts) contractStore.replaceData(validateDataArray(data.contracts, 'contracts'))
    if (data.inventory) inventoryStore.replaceData(validateDataArray(data.inventory, 'inventory'))
    if (data.inbound_orders) inventoryStore.replaceInbound(validateDataArray(data.inbound_orders, 'inbound_orders'))
    if (data.outbound_orders) inventoryStore.replaceOutbound(validateDataArray(data.outbound_orders, 'outbound_orders'))
    if (data.deliveries) deliveryStore.replaceData(validateDataArray(data.deliveries, 'deliveries'))
    if (data.collections) collectionStore.replaceData(validateDataArray(data.collections, 'collections'))
    if (data.statements) statementStore.replaceData(validateDataArray(data.statements, 'statements'))
    if (data.todos) todoStore.replaceData(validateDataArray(data.todos, 'todos'))
    if (data.cost_records) costStore.replaceData(validateDataArray(data.cost_records, 'cost_records'))
    if (data.warehouse_locations)
      warehouseLocationStore.replaceData(validateDataArray(data.warehouse_locations, 'warehouse_locations'))
  } finally {
    syncing.value = false
  }
}

async function handleBidirectionalSync() {
  syncing.value = true
  try {
    // 拉取远端数据
    const remoteData = await sbStore.pullAll()
    if (!remoteData) {
      console.warn('[双向同步] 拉取远端数据失败')
      return
    }

    // 定义表与本地数据/替换方法的映射
    const tableConfigs = [
      {
        name: 'customers',
        localData: customerStore.customers,
        replaceFn: (merged) => customerStore.replaceData(merged)
      },
      {
        name: 'quotations',
        localData: quotationStore.quotations,
        replaceFn: (merged) => quotationStore.replaceData(merged)
      },
      {
        name: 'contracts',
        localData: contractStore.contracts,
        replaceFn: (merged) => contractStore.replaceData(merged)
      },
      {
        name: 'inventory',
        localData: inventoryStore.inventory,
        replaceFn: (merged) => inventoryStore.replaceData(merged)
      },
      {
        name: 'inbound_orders',
        localData: inventoryStore.inboundOrders,
        replaceFn: (merged) => inventoryStore.replaceInbound(merged)
      },
      {
        name: 'outbound_orders',
        localData: inventoryStore.outboundOrders,
        replaceFn: (merged) => inventoryStore.replaceOutbound(merged)
      },
      {
        name: 'deliveries',
        localData: deliveryStore.deliveries,
        replaceFn: (merged) => deliveryStore.replaceData(merged)
      },
      {
        name: 'collections',
        localData: collectionStore.collections,
        replaceFn: (merged) => collectionStore.replaceData(merged)
      },
      {
        name: 'statements',
        localData: statementStore.statements,
        replaceFn: (merged) => statementStore.replaceData(merged)
      },
      { name: 'todos', localData: todoStore.todos, replaceFn: (merged) => todoStore.replaceData(merged) },
      { name: 'cost_records', localData: costStore.records, replaceFn: (merged) => costStore.replaceData(merged) },
      {
        name: 'warehouse_locations',
        localData: warehouseLocationStore.locations,
        replaceFn: (merged) => warehouseLocationStore.replaceData(merged)
      },
      {
        name: 'suppliers',
        localData: supplierStore.suppliers,
        replaceFn: (merged) => supplierStore.replaceData(merged)
      }
    ]

    for (const config of tableConfigs) {
      try {
        const remoteTableData = remoteData[config.name] || []
        // 双向合并：保留双方独有数据，冲突取最新
        const merged = mergeArrays(config.localData, remoteTableData, 'id')
        // 推送合并结果到远端
        await sbStore.pushToServer(config.name, merged)
        // 更新本地数据
        config.replaceFn(merged)
      } catch (e) {
        console.warn(`双向同步表 ${config.name} 失败:`, e)
      }
    }
  } finally {
    syncing.value = false
  }
}

/* 启动自动双向增量同步 */
function handleAutoSync() {
  const result = syncEngine.initAutoSync()
  if (result) {
    console.debug('[数据库连接] 自动同步已启动')
  }
}

/* 强制全量同步 */
async function handleForceFullSync() {
  syncing.value = true
  try {
    await syncEngine.forceFullSync()
  } finally {
    syncing.value = false
  }
}

async function handlePushOne(resourceName, dataKey) {
  const storeMap = {
    customers: customerStore,
    quotations: quotationStore,
    contracts: contractStore,
    inventory: inventoryStore,
    inbound_orders: inventoryStore,
    outbound_orders: inventoryStore,
    deliveries: deliveryStore,
    collections: collectionStore,
    statements: statementStore,
    todos: todoStore,
    cost_records: costStore,
    warehouse_locations: warehouseLocationStore
  }
  const store = storeMap[resourceName]
  if (store && store[dataKey]) {
    await sbStore.pushToServer(resourceName, store[dataKey])
  }
}

async function handlePullOne(resourceName, storeRef) {
  const data = await sbStore.pullFromServer(resourceName)
  if (data === null) return

  const replaceMap = {
    customers: () => customerStore.replaceData(data),
    quotations: () => quotationStore.replaceData(data),
    contracts: () => contractStore.replaceData(data),
    inventory: () => inventoryStore.replaceData(data),
    inbound_orders: () => inventoryStore.replaceInbound(data),
    outbound_orders: () => inventoryStore.replaceOutbound(data),
    deliveries: () => deliveryStore.replaceData(data),
    collections: () => collectionStore.replaceData(data),
    statements: () => statementStore.replaceData(data),
    todos: () => todoStore.replaceData(data),
    cost_records: () => costStore.replaceData(data),
    warehouse_locations: () => warehouseLocationStore.replaceData(data)
  }
  if (replaceMap[resourceName]) {
    replaceMap[resourceName]()
  }
}

const INIT_SQL = `-- 冠久ERP 数据库建表语句
-- 在 Supabase SQL Editor 中执行

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  "customerNo" TEXT, "fullName" TEXT, name TEXT, "shortName" TEXT,
  contact TEXT, "contactName" TEXT, phone TEXT, email TEXT,
  department TEXT, position TEXT, level TEXT DEFAULT 'B',
  "decisionAuthority" TEXT, "coreConcerns" TEXT, region TEXT,
  balance NUMERIC DEFAULT 0, "creditLimit" NUMERIC DEFAULT 0,
  address TEXT, status TEXT DEFAULT 'active', tags JSONB DEFAULT '[]',
  "createdBy" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quotations (
  id TEXT PRIMARY KEY, "quoteNo" TEXT,
  "customerId" TEXT, "customerName" TEXT, "customerFullName" TEXT,
  "custContact" TEXT, "custPhone" TEXT, "custEmail" TEXT,
  "senderContact" TEXT, "senderCompany" TEXT, "senderPhone" TEXT, "senderEmail" TEXT,
  date TEXT, "expiryDate" TEXT, status TEXT DEFAULT 'draft',
  subtotal NUMERIC DEFAULT 0, "taxRate" NUMERIC DEFAULT 13, total NUMERIC DEFAULT 0,
  "costBasis" NUMERIC DEFAULT 0, "profitMargin" NUMERIC,
  currency TEXT DEFAULT 'CNY', items JSONB DEFAULT '[]',
  "termPrice" TEXT, "termPayment" TEXT, "termDelivery" TEXT,
  "termDeliveryAddr" TEXT, "termQuality" TEXT, "termPriceAdj" TEXT,
  notes TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contracts (
  id TEXT PRIMARY KEY, "contractNo" TEXT,
  "contractType" TEXT, "partyA" TEXT, "partyAId" TEXT,
  "partyB" TEXT, "signPlace" TEXT, "signDate" TEXT, "endDate" TEXT,
  settlement TEXT, products JSONB DEFAULT '[]', terms JSONB DEFAULT '{}',
  "partyAInfo" JSONB DEFAULT '{}', "partyBInfo" JSONB DEFAULT '{}',
  "totalAmount" NUMERIC DEFAULT 0, "sourceQuoteId" TEXT,
  status TEXT DEFAULT 'draft', notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory (
  id TEXT PRIMARY KEY, code TEXT, name TEXT, grade TEXT,
  category TEXT, quantity NUMERIC DEFAULT 0,
  "safetyStock" NUMERIC DEFAULT 0, "maxStock" NUMERIC DEFAULT 0,
  unit TEXT, warehouse TEXT, "locationId" TEXT,
  "supplierId" TEXT, "supplierName" TEXT, "unitPrice" NUMERIC DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inbound_orders (
  id TEXT PRIMARY KEY, "orderNo" TEXT, type TEXT, date TEXT,
  supplier TEXT, "customerId" TEXT,
  "warehouseId" TEXT, "warehouseName" TEXT,
  status TEXT DEFAULT 'pending', notes TEXT,
  "totalAmount" NUMERIC DEFAULT 0, items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outbound_orders (
  id TEXT PRIMARY KEY, "outboundNo" TEXT, "outType" TEXT, date TEXT,
  customer TEXT, "customerId" TEXT,
  "warehouseId" TEXT, "warehouseName" TEXT,
  status TEXT DEFAULT 'pending', notes TEXT,
  "totalAmount" NUMERIC DEFAULT 0, items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deliveries (
  id TEXT PRIMARY KEY, "deliveryNo" TEXT, "customerName" TEXT,
  date TEXT, "orderId" TEXT, urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'created', address TEXT, contact TEXT, phone TEXT,
  "expectedDate" TEXT, "expectedArrivalDate" TEXT,
  "transportMethod" TEXT DEFAULT 'logistics', carrier TEXT,
  driver TEXT, "driverPhone" TEXT, "plateNo" TEXT, "driverMobile" TEXT,
  "trackingNo" TEXT,
  "totalQuantity" NUMERIC DEFAULT 0, "totalAmount" NUMERIC DEFAULT 0,
  "totalTax" NUMERIC DEFAULT 0, "grandTotal" NUMERIC DEFAULT 0,
  "actualDate" TEXT, "acceptanceResult" TEXT, "acceptNote" TEXT,
  "acceptPerson" TEXT, "acceptDate" TEXT,
  items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY, "collectionNo" TEXT, "customerName" TEXT,
  "customerId" TEXT, "statementId" TEXT,
  amount NUMERIC DEFAULT 0, "dueDate" TEXT,
  currency TEXT DEFAULT 'CNY', method TEXT,
  "referenceNo" TEXT, "bankAccount" TEXT,
  status TEXT DEFAULT 'pending', installments JSONB DEFAULT '[]',
  notes TEXT, "createdBy" TEXT,
  date TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE statements (
  id TEXT PRIMARY KEY, "statementNo" TEXT, "reconDate" TEXT,
  "buyerName" TEXT, "sellerName" TEXT, "totalAmount" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY, title TEXT, type TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium',
  source TEXT, "sourceId" TEXT,
  "dueDate" TEXT, "startDate" TEXT, "completedAt" TEXT,
  notes TEXT, tag TEXT, reminder TEXT DEFAULT '不提醒',
  "repeat" TEXT DEFAULT 'none', progress NUMERIC DEFAULT 0,
  remark TEXT, subtasks JSONB DEFAULT '[]',
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cost_records (
  id TEXT PRIMARY KEY, "poNo" TEXT, "supplierId" TEXT, "supplierName" TEXT,
  date TEXT, "materialName" TEXT, quantity NUMERIC DEFAULT 0,
  "actualCost" NUMERIC DEFAULT 0, "standardCost" NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0, "varianceRate" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE warehouse_locations (
  id TEXT PRIMARY KEY, "locationCode" TEXT,
  "warehouseName" TEXT, "warehouseId" TEXT,
  "areaName" TEXT DEFAULT '合格品区',
  manager TEXT, "managerPhone" TEXT, notes TEXT,
  "createdBy" TEXT, "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

-- 允许认证用户读写
CREATE POLICY "Auth users full access" ON customers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON quotations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON contracts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON inventory FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON inbound_orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON outbound_orders FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON deliveries FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON collections FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON statements FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON todos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON cost_records FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users full access" ON warehouse_locations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE inbound_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE outbound_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE statements;
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE cost_records;
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_locations;`

async function copySQL() {
  try {
    await navigator.clipboard.writeText(INIT_SQL)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (e) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = INIT_SQL
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

onMounted(async () => {
  // 自动恢复连接
  await sbStore.autoConnect()
  if (sbStore.isConnected) {
    subscribeAllTables()
    /* 启动自动同步引擎 */
    const { useSyncEngine } = await import('@/utils/syncEngine.js')
    const syncEngine = useSyncEngine()
    syncEngine.initAutoSync()
  }
})
</script>

<style scoped>
.db-connection-page {
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}
.form-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.test-result {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.test-result.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}
.test-result.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}
.sync-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.sync-warning {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-warning-subtle);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}
.status-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.status-badge.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}
.status-badge.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.status-badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}
.status-badge.neutral {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}
.error-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.error-resource {
  font-weight: 600;
  min-width: 100px;
}
.error-action {
  color: var(--color-accent);
  min-width: 40px;
}
.error-msg {
  flex: 1;
  color: var(--color-danger);
}
.error-time {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.guide-step {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}
.guide-step-num {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}
.guide-step-content p {
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.toast-success {
  position: fixed;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-success);
  color: #fff;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  z-index: var(--z-toast, 3000);
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ===== Keyframes ===== */
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Stat Cards ===== */
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card-value {
  font-family: var(--font-mono);
}

/* ===== Connection Status Card ===== */
.status-card {
  animation: statCardIn 0.4s ease-out both;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ===== Sync Button ===== */
.sync-btn {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.sync-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ===== Table Row Animation ===== */
.row-slide-in {
  animation: rowSlideIn 0.3s ease-out both;
}

/* ===== Empty State ===== */
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
}
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
</style>
