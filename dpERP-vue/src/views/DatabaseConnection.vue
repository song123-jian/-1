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
    <div class="panel-card" style="margin-bottom:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="setting" :size="14" /> 连接配置</span>
        <span v-if="sbStore.isConnected" style="color:var(--color-success);font-size:var(--font-size-sm)">{{ sbStore.connectionSummary }}</span>
      </div>
      <div class="panel-card-body">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Project URL</label>
            <input
              type="url"
              class="form-input"
              v-model="sbStore.url"
              placeholder="https://xxxxx.supabase.co"
              :disabled="sbStore.connected"
            />
            <div class="form-hint">在 Supabase 项目设置 <Icon name="chevronRight" :size="14" /> API <Icon name="chevronRight" :size="14" /> Project URL 中获取</div>
          </div>
          <div class="form-group">
            <label class="form-label">Anon Public Key</label>
            <input
              type="password"
              class="form-input"
              v-model="sbStore.anonKey"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              :disabled="sbStore.connected"
            />
            <div class="form-hint">在 Supabase 项目设置 <Icon name="chevronRight" :size="14" /> API <Icon name="chevronRight" :size="14" /> anon public 中获取</div>
          </div>
        </div>

        <div class="form-actions">
          <template v-if="!sbStore.connected">
            <button class="btn btn-outline" @click="handleTest" :disabled="sbStore.testing || !sbStore.url || !sbStore.anonKey">
              <template v-if="sbStore.testing">测试中...</template>
              <template v-else><Icon name="search" :size="14" /> 测试连接</template>
            </button>
            <button class="btn btn-primary" @click="handleConnect" :disabled="sbStore.connecting || !sbStore.url || !sbStore.anonKey">
              <template v-if="sbStore.connecting">连接中...</template>
              <template v-else><Icon name="link" :size="14" /> 连接</template>
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
    <div v-if="sbStore.isConnected" class="panel-card" style="margin-bottom:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="refresh" :size="14" /> 数据同步</span>
        <span v-if="sbStore.lastSyncTime" style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">
          最近同步: {{ formatTime(sbStore.lastSyncTime) }}
        </span>
      </div>
      <div class="panel-card-body">
        <div class="sync-actions">
          <button class="btn btn-primary" @click="handlePushAll" :disabled="syncing || syncEngine.isSyncing.value">
            <template v-if="syncing || syncEngine.isSyncing.value">同步中...</template>
            <template v-else><Icon name="download" :size="14" /> 上传本地数据到云端</template>
          </button>
          <button class="btn btn-outline" @click="handlePullAll" :disabled="syncing || syncEngine.isSyncing.value">
            <template v-if="syncing || syncEngine.isSyncing.value">同步中...</template>
            <template v-else><Icon name="download" :size="14" /> 从云端拉取数据</template>
          </button>
          <button class="btn btn-outline" @click="handleBidirectionalSync" :disabled="syncing || syncEngine.isSyncing.value">
            {{ (syncing || syncEngine.isSyncing.value) ? '同步中...' : '[合并] 双向合并同步' }}
          </button>
          <button class="btn btn-outline" @click="handleAutoSync" :disabled="!sbStore.isConnected">
            [自动] 启动自动同步
          </button>
          <button class="btn btn-outline" @click="handleForceFullSync" :disabled="syncing || syncEngine.isSyncing.value">
            <Icon name="refresh" :size="14" /> 强制全量同步
          </button>
        </div>

        <div class="sync-info" v-if="syncEngine.syncStats.value.lastSyncTime" style="margin-top:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text-secondary)">
          自动同步统计: 已同步 {{ syncEngine.syncStats.value.totalSynced }} 条 · 错误 {{ syncEngine.syncStats.value.totalErrors }} 个 · 最近 {{ formatTime(syncEngine.syncStats.value.lastSyncTime) }}
        </div>

        <div class="sync-warning" v-if="syncing">
          <span><Icon name="warning" :size="14" /></span> 同步进行中，请勿关闭页面...
        </div>

        <!-- 同步状态表 -->
        <div class="table-container" style="margin-top:var(--space-4)">
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
                <td><strong>{{ table.label }}</strong></td>
                <td>{{ table.localCount }}</td>
                <td>
                  <span class="status-badge" :class="syncBadgeClass(table.name)">
                    {{ syncBadgeText(table.name) }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="handlePushOne(table.name, table.dataKey)" :disabled="syncing"><Icon name="download" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" @click="handlePullOne(table.name, table.storeRef)" :disabled="syncing"><Icon name="download" :size="14" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 同步错误日志 -->
    <div v-if="sbStore.syncErrors.length > 0" class="panel-card" style="margin-bottom:var(--space-6);border-left:3px solid var(--color-danger)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="log" :size="14" /> 同步错误</span>
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
        <span class="panel-card-title"><Icon name="file" :size="14" /> 快速入门指南</span>
      </div>
      <div class="panel-card-body">
        <div class="guide-steps">
          <div class="guide-step">
            <div class="guide-step-num">1</div>
            <div class="guide-step-content">
              <strong>注册 Supabase</strong>
              <p>访问 <a href="https://supabase.com" target="_blank" rel="noopener" style="color:var(--color-accent)">supabase.com</a> 注册免费账号，创建新项目</p>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">2</div>
            <div class="guide-step-content">
              <strong>创建数据库表</strong>
              <p>在 Supabase SQL Editor 中执行建表语句（点击下方按钮复制）</p>
              <button class="btn btn-outline btn-sm" @click="copySQL" style="margin-top:var(--space-2)"><Icon name="copy" :size="14" /> 复制建表SQL</button>
            </div>
          </div>
          <div class="guide-step">
            <div class="guide-step-num">3</div>
            <div class="guide-step-content">
              <strong>获取连接信息</strong>
              <p>在项目设置 <Icon name="chevronRight" :size="14" /> API 中复制 Project URL 和 anon public key，填入上方表单</p>
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

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSupabaseStore } from '@/stores/supabase'
import { useSyncEngine } from '@/utils/syncEngine'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useContractStore } from '@/stores/contract'
import { useInventoryStore } from '@/stores/inventory'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/stores/collection'
import { useStatementStore } from '@/stores/statement'
import { useTodoStore } from '@/stores/todo'
import { useCostStore } from '@/stores/cost'
import { useWarehouseLocationStore } from '@/stores/warehouseLocation'

const sbStore = useSupabaseStore()
const syncEngine = useSyncEngine()
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

const syncing = ref(false)
const copySuccess = ref(false)

const syncTables = computed(() => [
  { name: 'customers', label: '客户管理', localCount: customerStore.customers.length, dataKey: 'customers', storeRef: customerStore },
  { name: 'quotations', label: '报价管理', localCount: quotationStore.quotations.length, dataKey: 'quotations', storeRef: quotationStore },
  { name: 'contracts', label: '合同管理', localCount: contractStore.contracts.length, dataKey: 'contracts', storeRef: contractStore },
  { name: 'inventory', label: '库存数据', localCount: inventoryStore.enrichedInventory.length, dataKey: 'enrichedInventory', storeRef: inventoryStore },
  { name: 'inbound_orders', label: '入库单', localCount: inventoryStore.inboundOrders.length, dataKey: 'inboundOrders', storeRef: inventoryStore },
  { name: 'outbound_orders', label: '出库单', localCount: inventoryStore.outboundOrders.length, dataKey: 'outboundOrders', storeRef: inventoryStore },
  { name: 'deliveries', label: '送货单', localCount: deliveryStore.deliveries.length, dataKey: 'deliveries', storeRef: deliveryStore },
  { name: 'collections', label: '回款记录', localCount: collectionStore.collections.length, dataKey: 'collections', storeRef: collectionStore },
  { name: 'statements', label: '对账单', localCount: statementStore.statements.length, dataKey: 'statements', storeRef: statementStore },
  { name: 'todos', label: '待办事项', localCount: todoStore.todos.length, dataKey: 'todos', storeRef: todoStore },
  { name: 'cost_records', label: '成本核算', localCount: costStore.records.length, dataKey: 'records', storeRef: costStore },
  { name: 'warehouse_locations', label: '仓位管理', localCount: warehouseLocationStore.locations.length, dataKey: 'locations', storeRef: warehouseLocationStore }
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
  await sbStore.testConnection()
}

async function handleConnect() {
  const result = await sbStore.connect()
  if (result.success) {
    // 连接成功后订阅实时变更
    subscribeAllTables()
  }
}

function handleDisconnect() {
  if (confirm('断开连接后，数据将仅保存在本地浏览器中。确定断开？')) {
    sbStore.disconnect()
  }
}

function subscribeAllTables() {
  const tables = ['customers', 'quotations', 'contracts', 'inventory', 'deliveries', 'collections', 'statements', 'todos']
  for (const t of tables) {
    sbStore.subscribeRealtime(t, {
      onInsert: (row) => { console.info(`[Realtime] ${t} 新增:`, row.id) },
      onUpdate: (row) => { console.info(`[Realtime] ${t} 更新:`, row.id) },
      onDelete: (old) => { console.info(`[Realtime] ${t} 删除:`, old.id) }
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
  if (!confirm('从云端拉取数据将覆盖本地数据，确定继续？')) return
  syncing.value = true
  try {
    const data = await sbStore.pullAll()
    // 将拉取的数据写入各 Store
    if (data.customers?.length >= 0) customerStore.replaceData(data.customers)
    if (data.quotations?.length >= 0) quotationStore.replaceData(data.quotations)
    if (data.contracts?.length >= 0) contractStore.replaceData(data.contracts)
    if (data.inventory?.length >= 0) inventoryStore.replaceData(data.inventory)
    if (data.inbound_orders?.length >= 0) inventoryStore.replaceInbound(data.inbound_orders)
    if (data.outbound_orders?.length >= 0) inventoryStore.replaceOutbound(data.outbound_orders)
    if (data.deliveries?.length >= 0) deliveryStore.replaceData(data.deliveries)
    if (data.collections?.length >= 0) collectionStore.replaceData(data.collections)
    if (data.statements?.length >= 0) statementStore.replaceData(data.statements)
    if (data.todos?.length >= 0) todoStore.replaceData(data.todos)
    if (data.cost_records?.length >= 0) costStore.replaceData(data.cost_records)
    if (data.warehouse_locations?.length >= 0) warehouseLocationStore.replaceData(data.warehouse_locations)
  } finally {
    syncing.value = false
  }
}

async function handleBidirectionalSync() {
  syncing.value = true
  try {
    // 先拉取远端数据
    const remoteData = await sbStore.pullAll()
    // 再推送本地数据（简单策略：以本地为准覆盖远端）
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

/* 启动自动双向增量同步 */
function handleAutoSync() {
  const result = syncEngine.initAutoSync()
  if (result) {
    console.info('[数据库连接] 自动同步已启动')
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
  "customerNo" TEXT, "fullName" TEXT, name TEXT,
  contact TEXT, "contactName" TEXT, phone TEXT,
  department TEXT, position TEXT, level TEXT DEFAULT 'B',
  "decisionPower" TEXT, concerns TEXT, region TEXT,
  balance NUMERIC DEFAULT 0, "creditLimit" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', tags JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now(), "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quotations (
  id TEXT PRIMARY KEY, "quoteNo" TEXT, "customerName" TEXT,
  date TEXT, status TEXT DEFAULT 'draft', total NUMERIC DEFAULT 0,
  "profitMargin" NUMERIC, notes TEXT, items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contracts (
  id TEXT PRIMARY KEY, "contractNo" TEXT, "customerName" TEXT,
  type TEXT, status TEXT DEFAULT 'draft', "totalAmount" NUMERIC DEFAULT 0,
  "settlementMethod" TEXT, "startDate" TEXT, "endDate" TEXT,
  items JSONB DEFAULT '[]', "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory (
  id TEXT PRIMARY KEY, code TEXT, name TEXT, grade TEXT,
  category TEXT, quantity NUMERIC DEFAULT 0,
  "safetyStock" NUMERIC DEFAULT 0, "maxStock" NUMERIC DEFAULT 0,
  unit TEXT, warehouse TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inbound_orders (
  id TEXT PRIMARY KEY, "orderNo" TEXT, type TEXT, date TEXT,
  supplier TEXT, status TEXT DEFAULT 'pending',
  items JSONB DEFAULT '[]', "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outbound_orders (
  id TEXT PRIMARY KEY, "outboundNo" TEXT, "outType" TEXT, date TEXT,
  customer TEXT, status TEXT DEFAULT 'pending',
  items JSONB DEFAULT '[]', "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deliveries (
  id TEXT PRIMARY KEY, "deliveryNo" TEXT, "customerName" TEXT,
  date TEXT, status TEXT DEFAULT 'created',
  "totalAmount" NUMERIC DEFAULT 0, items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY, "collectionNo" TEXT, "customerName" TEXT,
  amount NUMERIC DEFAULT 0, method TEXT, status TEXT DEFAULT 'pending',
  date TEXT, "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE statements (
  id TEXT PRIMARY KEY, "statementNo" TEXT, "reconDate" TEXT,
  "buyerName" TEXT, "sellerName" TEXT, "totalAmount" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', items JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE todos (
  id TEXT PRIMARY KEY, title TEXT, status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium', "dueDate" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cost_records (
  id TEXT PRIMARY KEY, "poNo" TEXT, "supplierName" TEXT,
  date TEXT, "materialName" TEXT, quantity NUMERIC DEFAULT 0,
  "actualCost" NUMERIC DEFAULT 0, "standardCost" NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0, "varianceRate" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE warehouse_locations (
  id TEXT PRIMARY KEY, code TEXT, name TEXT, zone TEXT,
  status TEXT DEFAULT 'active', "createdAt" TIMESTAMPTZ DEFAULT now()
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
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE statements;`

async function copySQL() {
  try {
    await navigator.clipboard.writeText(INIT_SQL)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch (e) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = INIT_SQL
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  }
}

onMounted(async () => {
  // 自动恢复连接
  await sbStore.autoConnect()
  if (sbStore.isConnected) {
    subscribeAllTables()
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
  .form-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
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
  margin-top: 2px;
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
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.status-badge.success { background: var(--color-success-subtle); color: var(--color-success); }
.status-badge.warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.status-badge.danger { background: var(--color-danger-subtle); color: var(--color-danger); }
.status-badge.neutral { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.error-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.error-resource { font-weight: 600; min-width: 100px; }
.error-action { color: var(--color-accent); min-width: 40px; }
.error-msg { flex: 1; color: var(--color-danger); }
.error-time { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
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
  z-index: 9999;
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
