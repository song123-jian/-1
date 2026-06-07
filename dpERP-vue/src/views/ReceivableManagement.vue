<template>
  <div class="receivable-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">应收管理</h2>
        <p class="page-header-subtitle">应收账款跟踪，收款记录管理，账龄分析</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openReceiptForm()">
          <Icon name="add" :size="14" /> 新增收款单
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-accent);font-size:var(--font-size-xl)">¥{{ formatMoney(receivableStore.totalAmount) }}</div>
        <div class="stat-card-label">应收总额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">¥{{ formatMoney(receivableStore.totalReceived) }}</div>
        <div class="stat-card-label">已收金额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">¥{{ formatMoney(receivableStore.totalRemaining) }}</div>
        <div class="stat-card-label">未收金额</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(receivableStore.totalOverdue) }}</div>
        <div class="stat-card-label">逾期金额</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        <Icon :name="tab.icon" :size="14" /> {{ tab.label }}
      </button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        type="text"
        class="form-input"
        v-model="filters.search"
        placeholder="搜索单号/客户..."
        style="min-width:160px"
      >
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="pending">待收款</option>
        <option value="partial">部分收款</option>
        <option value="completed">已收完</option>
        <option value="overdue">已逾期</option>
      </select>
      <select class="form-select" v-model="filters.customerId">
        <option value="">全部客户</option>
        <option v-for="c in customerList" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btn-ghost btn-sm" @click="resetFilters">
        <Icon name="refresh" :size="14" /> 重置
      </button>
    </div>

    <!-- Tab: 应收列表 -->
    <div v-show="currentTab === 'receivables'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>应收编号</th>
                <th>客户</th>
                <th>来源</th>
                <th>来源单号</th>
                <th>应收金额</th>
                <th>已收金额</th>
                <th>未收金额</th>
                <th>到期日</th>
                <th>状态</th>
                <th style="min-width:100px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedReceivables.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无应收记录
                </td>
              </tr>
              <tr
                v-for="rv in paginatedReceivables"
                :key="rv.id"
                :style="getRowStyle(rv)"
              >
                <td class="cell-mono" style="color:var(--color-accent)">{{ rv.receivableNo }}</td>
                <td>{{ rv.customerName }}</td>
                <td>{{ receivableStore.sourceTypeLabels[rv.sourceType] || rv.sourceType }}</td>
                <td class="cell-mono">{{ rv.sourceNo || '-' }}</td>
                <td class="cell-mono">¥{{ formatMoney(rv.amount) }}</td>
                <td class="cell-mono" style="color:var(--color-success)">¥{{ formatMoney(rv.receivedAmount) }}</td>
                <td class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney(rv.remainingAmount) }}</td>
                <td>{{ rv.dueDate || '-' }}</td>
                <td>
                  <span class="status-badge" :class="receivableStore.statusBadgeMap[rv.status] || 'neutral'">
                    {{ receivableStore.statusLabels[rv.status] || rv.status }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button
                    v-if="rv.status !== 'completed'"
                    class="btn btn-ghost btn-sm"
                    style="color:var(--color-success)"
                    @click="openReceiptForm(rv)"
                    title="收款"
                  ><Icon name="dollar" :size="14" /></button>
                  <span v-else style="color:var(--color-text-tertiary);font-size:var(--font-size-xs)">已结清</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalReceivablePages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="receivablePage <= 1" @click="receivablePage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ receivablePage }} / {{ totalReceivablePages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="receivablePage >= totalReceivablePages" @click="receivablePage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 收款记录 -->
    <div v-show="currentTab === 'receipts'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>收款单号</th>
                <th>客户</th>
                <th>收款金额</th>
                <th>收款方式</th>
                <th>银行</th>
                <th>参考号</th>
                <th>收款日期</th>
                <th>操作人</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedReceipts.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无收款记录
                </td>
              </tr>
              <tr v-for="rc in paginatedReceipts" :key="rc.id">
                <td class="cell-mono" style="color:var(--color-accent)">{{ rc.receiptNo }}</td>
                <td>{{ rc.customerName }}</td>
                <td class="cell-mono" style="color:var(--color-success)">¥{{ formatMoney(rc.amount) }}</td>
                <td>{{ receivableStore.methodLabels[rc.method] || rc.method }}</td>
                <td>{{ rc.bankName || '-' }}</td>
                <td class="cell-mono">{{ rc.referenceNo || '-' }}</td>
                <td>{{ rc.receiptDate }}</td>
                <td>{{ rc.operator }}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="rc.notes">{{ rc.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalReceiptPages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="receiptPage <= 1" @click="receiptPage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ receiptPage }} / {{ totalReceiptPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="receiptPage >= totalReceiptPages" @click="receiptPage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 账龄分析 -->
    <div v-show="currentTab === 'aging'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="chart" :size="14" /> 账龄分析</span>
      </div>
      <div class="panel-card-body">
        <AgingAnalysis :data="agingData" type="receivable" />
      </div>
    </div>

    <!-- 收款弹窗 -->
    <ReceiptFormModal
      v-model:visible="showReceiptForm"
      :receivable="selectedReceivable"
      @saved="onReceiptSaved"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useReceivableStore } from '@/stores/receivable'
import { useCustomerStore } from '@/stores/customer'
import ReceiptFormModal from '@/components/finance/ReceiptFormModal.vue'
import AgingAnalysis from '@/components/finance/AgingAnalysis.vue'

const receivableStore = useReceivableStore()
const customerStore = useCustomerStore()

const currentTab = ref('receivables')
const showReceiptForm = ref(false)
const selectedReceivable = ref(null)
const receivablePage = ref(1)
const receiptPage = ref(1)
const pageSize = 10

const tabs = [
  { key: 'receivables', label: '应收列表', icon: 'list' },
  { key: 'receipts', label: '收款记录', icon: 'dollar' },
  { key: 'aging', label: '账龄分析', icon: 'chart' }
]

const filters = reactive({
  search: '',
  status: '',
  customerId: ''
})

/* 客户列表 */
const customerList = computed(() => {
  const customers = customerStore.customers || []
  const seen = new Set()
  const result = []
  /* 从应收单中提取客户 */
  for (const rv of receivableStore.receivables) {
    if (rv.customerId && !seen.has(rv.customerId)) {
      seen.add(rv.customerId)
      result.push({ id: rv.customerId, name: rv.customerName })
    }
  }
  /* 补充客户Store中的数据 */
  for (const c of customers) {
    const id = c.id
    if (!seen.has(id)) {
      seen.add(id)
      result.push({ id, name: c.name || c.fullName || c.companyName })
    }
  }
  return result
})

/* 筛选后的应收列表 */
const filteredReceivables = computed(() => {
  return receivableStore.receivables.filter(rv => {
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!(rv.receivableNo || '').toLowerCase().includes(s) &&
          !(rv.customerName || '').toLowerCase().includes(s) &&
          !(rv.sourceNo || '').toLowerCase().includes(s)) return false
    }
    if (filters.status && rv.status !== filters.status) return false
    if (filters.customerId && rv.customerId !== filters.customerId) return false
    return true
  })
})

/* 筛选后的收款列表 */
const filteredReceipts = computed(() => {
  let list = [...receivableStore.receipts]
  if (filters.search) {
    const s = filters.search.toLowerCase()
    list = list.filter(rc =>
      (rc.receiptNo || '').toLowerCase().includes(s) ||
      (rc.customerName || '').toLowerCase().includes(s)
    )
  }
  if (filters.customerId) {
    list = list.filter(rc => rc.customerId === filters.customerId)
  }
  return list.sort((a, b) => (b.receiptDate || '').localeCompare(a.receiptDate || ''))
})

/* 分页 */
const totalReceivablePages = computed(() => Math.max(1, Math.ceil(filteredReceivables.value.length / pageSize)))
const paginatedReceivables = computed(() => {
  const start = (receivablePage.value - 1) * pageSize
  return filteredReceivables.value.slice(start, start + pageSize)
})

const totalReceiptPages = computed(() => Math.max(1, Math.ceil(filteredReceipts.value.length / pageSize)))
const paginatedReceipts = computed(() => {
  const start = (receiptPage.value - 1) * pageSize
  return filteredReceipts.value.slice(start, start + pageSize)
})

/* 账龄分析数据 */
const agingData = computed(() => receivableStore.getAgingAnalysis())

function resetFilters() {
  filters.search = ''
  filters.status = ''
  filters.customerId = ''
  receivablePage.value = 1
  receiptPage.value = 1
}

function openReceiptForm(rv) {
  selectedReceivable.value = rv || null
  showReceiptForm.value = true
}

function onReceiptSaved() {
  selectedReceivable.value = null
}

function getRowStyle(rv) {
  if (rv.status === 'overdue') return { borderLeft: '3px solid var(--color-danger)' }
  if (rv.status === 'partial') return { borderLeft: '3px solid var(--color-warning)' }
  if (rv.status === 'completed') return { borderLeft: '3px solid var(--color-success)' }
  return {}
}

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

onMounted(() => {
  receivableStore.initSeedData()
  customerStore.initSeedData()
  receivableStore.refreshOverdueStatus()
})
</script>

<style scoped>
.receivable-page {
}
.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.tab-bar {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
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
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .filter-bar { flex-direction: column; }
  .tab-bar { overflow-x: auto; }
}
</style>
