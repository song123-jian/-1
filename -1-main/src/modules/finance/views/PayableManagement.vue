<template>
  <div class="payable-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">应付管理</h2>
        <p class="page-header-subtitle">应付账款跟踪，付款记录管理，账龄分析</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="openPaymentForm()">
          <Icon name="add" :size="14" />
          新增付款单
        </button>
      </div>
    </div>

    <!-- 资金流水线 -->
    <div class="fund-pipeline">
      <div class="pipeline-node">
        <div class="pipeline-node-amount">¥{{ formatMoney(payableStore.totalAmount) }}</div>
        <div class="pipeline-node-label">应付总额</div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-node">
        <div class="pipeline-node-amount" style="color: var(--color-success)">
          ¥{{ formatMoney(payableStore.totalPaid) }}
        </div>
        <div class="pipeline-node-label">已付金额</div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-node">
        <div class="pipeline-node-amount" style="color: var(--color-warning)">
          ¥{{ formatMoney(payableStore.totalRemaining) }}
        </div>
        <div class="pipeline-node-label">未付金额</div>
      </div>
      <span class="pipeline-arrow">→</span>
      <div class="pipeline-node" :class="{ 'pipeline-node--danger': (payableStore.totalOverdue || 0) > 0 }">
        <div class="pipeline-node-amount" style="color: var(--color-danger)">
          ¥{{ formatMoney(payableStore.totalOverdue) }}
        </div>
        <div class="pipeline-node-label">逾期金额</div>
      </div>
    </div>

    <!-- 折叠统计区 -->
    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showPayableStatsExpanded = !showPayableStatsExpanded">
        <span class="collapsible-stats-title">
          <Icon name="chart" :size="14" />
          详细统计与账龄分析
        </span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showPayableStatsExpanded }">▼</span>
      </div>
      <div v-show="showPayableStatsExpanded" class="collapsible-stats-body">
        <!-- 统计卡片 -->
        <div class="stats-row stats-grid-4">
          <div class="stat-card" style="animation-delay: 0ms">
            <div class="stat-card-header">
              <span class="stat-card-label">应付总额</span>
              <Icon name="wallet" :size="16" class="stat-card-icon" style="color: var(--color-accent)" />
            </div>
            <div class="stat-card-value" style="color: var(--color-accent)">
              ¥{{ formatMoney(payableStore.totalAmount) }}
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 60ms">
            <div class="stat-card-header">
              <span class="stat-card-label">已付金额</span>
              <Icon name="checkCircle" :size="16" class="stat-card-icon" style="color: var(--color-success)" />
            </div>
            <div class="stat-card-value" style="color: var(--color-success)">
              ¥{{ formatMoney(payableStore.totalPaid) }}
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 120ms">
            <div class="stat-card-header">
              <span class="stat-card-label">未付金额</span>
              <span class="pulse-dot" style="background: var(--color-warning)"></span>
            </div>
            <div class="stat-card-value" style="color: var(--color-warning)">
              ¥{{ formatMoney(payableStore.totalRemaining) }}
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 180ms">
            <div class="stat-card-header">
              <span class="stat-card-label">逾期金额</span>
              <span class="pulse-dot" style="background: var(--color-danger)"></span>
            </div>
            <div class="stat-card-value" style="color: var(--color-danger)">
              ¥{{ formatMoney(payableStore.totalOverdue) }}
            </div>
          </div>
        </div>

        <!-- 概览面板 -->
        <div class="overview-row">
          <div class="overview-card" style="animation-delay: 0ms">
            <div class="overview-title">付款完成率</div>
            <div class="overview-content center">
              <svg class="progress-ring" width="80" height="80" viewBox="0 0 80 80">
                <circle class="progress-ring-bg" cx="40" cy="40" r="26" />
                <circle
                  class="progress-ring-fill"
                  cx="40"
                  cy="40"
                  r="26"
                  :stroke="completionRateColor"
                  :stroke-dasharray="completionCircumference"
                  :stroke-dashoffset="completionOffset"
                />
                <text class="progress-ring-text" x="40" y="40" text-anchor="middle" dominant-baseline="central">
                  {{ completionRate }}%
                </text>
              </svg>
            </div>
          </div>
          <div class="overview-card" style="animation-delay: 80ms">
            <div class="overview-title">账龄分布</div>
            <div class="overview-content">
              <div class="mini-bar-item">
                <span class="mini-bar-label">未到期</span>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :style="{ width: agingPercent('current') + '%', background: 'var(--color-success)' }"
                  ></div>
                </div>
                <span class="mini-bar-value cell-mono">¥{{ formatMoney(agingData.current || 0) }}</span>
              </div>
              <div class="mini-bar-item">
                <span class="mini-bar-label">1-30天</span>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :style="{ width: agingPercent('days30') + '%', background: '#84cc16' }"
                  ></div>
                </div>
                <span class="mini-bar-value cell-mono">¥{{ formatMoney(agingData.days30 || 0) }}</span>
              </div>
              <div class="mini-bar-item">
                <span class="mini-bar-label">31-60天</span>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :style="{ width: agingPercent('days60') + '%', background: 'var(--color-warning)' }"
                  ></div>
                </div>
                <span class="mini-bar-value cell-mono">¥{{ formatMoney(agingData.days60 || 0) }}</span>
              </div>
              <div class="mini-bar-item">
                <span class="mini-bar-label">60天+</span>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :style="{ width: agingPercentOver60 + '%', background: 'var(--color-danger)' }"
                  ></div>
                </div>
                <span class="mini-bar-value cell-mono">
                  ¥{{ formatMoney((agingData.days90 || 0) + (agingData.days180 || 0) + (agingData.over180 || 0)) }}
                </span>
              </div>
            </div>
          </div>
          <div class="overview-card" style="animation-delay: 160ms">
            <div class="overview-title">供应商应付 TOP5</div>
            <div class="overview-content">
              <div v-for="(item, idx) in topSuppliers" :key="item.supplierId" class="mini-bar-item">
                <span class="mini-bar-label" :title="item.supplierName">
                  {{ idx + 1 }}. {{ truncate(item.supplierName, 8) }}
                </span>
                <div class="mini-bar-track">
                  <div
                    class="mini-bar-fill"
                    :style="{ width: item.percent + '%', background: supplierTopColors[idx] || '#94a3b8' }"
                  ></div>
                </div>
                <span class="mini-bar-value cell-mono">¥{{ formatMoney(item.amount) }}</span>
              </div>
              <div v-if="topSuppliers.length === 0" class="overview-empty">暂无数据</div>
            </div>
          </div>
        </div>

        <!-- 逾期预警 -->
        <div v-if="overdueList.length > 0" class="overdue-alert">
          <div class="overdue-alert-header">
            <span class="pulse-dot" style="background: var(--color-danger)"></span>
            <span class="overdue-alert-title">逾期预警</span>
            <span class="overdue-alert-count">共 {{ overdueList.length }} 笔</span>
          </div>
          <div class="overdue-alert-body">
            <div
              v-for="(item, idx) in overdueList.slice(0, 5)"
              :key="item.id"
              class="overdue-alert-item"
              :style="{ animationDelay: idx * 80 + 'ms' }"
            >
              <span class="overdue-alert-no">{{ item.payableNo }}</span>
              <span class="overdue-alert-supplier">{{ item.supplierName }}</span>
              <span class="overdue-alert-amount cell-mono">¥{{ formatMoney(item.remainingAmount) }}</span>
              <span class="overdue-alert-days">逾期 {{ overdueDays(item.dueDate) }} 天</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <input
        v-model="filters.search"
        type="text"
        class="form-input"
        placeholder="搜索单号/供应商..."
        style="min-width: 160px"
      />
      <select v-model="filters.status" class="form-select">
        <option value="">全部状态</option>
        <option value="pending">待付款</option>
        <option value="partial">部分付款</option>
        <option value="completed">已付完</option>
        <option value="overdue">已逾期</option>
      </select>
      <DataSelect
        v-model="filters.supplierId"
        module="supplier"
        variant="active"
        value-field="id"
        label-field="name"
        placeholder="选择供应商"
        @change="onSupplierChange"
      />
      <button class="btn btn-ghost btn-sm" @click="resetFilters">
        <Icon name="refresh" :size="14" />
        重置
      </button>
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
        <Icon :name="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: 应付列表 -->
    <div v-show="currentTab === 'payables'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center">序号</th>
                <th>应付编号</th>
                <th>供应商</th>
                <th>来源</th>
                <th>来源单号</th>
                <th>应付金额</th>
                <th>已付金额</th>
                <th>未付金额</th>
                <th>到期日</th>
                <th>状态</th>
                <th style="min-width: 100px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedPayables.length === 0">
                <td colspan="11" class="empty-state">
                  <div class="empty-state-circle"><Icon name="empty" :size="32" /></div>
                  <div class="empty-state-text">暂无应付记录</div>
                </td>
              </tr>
              <tr
                v-for="(py, idx) in paginatedPayables"
                :key="py.id"
                class="table-row-animated"
                :style="{ ...getRowStyle(py), animationDelay: idx * 20 + 'ms' }"
              >
                <td style="text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                  {{ (payablePage - 1) * pageSize + idx + 1 }}
                </td>
                <td class="cell-mono" style="color: var(--color-accent)">{{ py.payableNo }}</td>
                <td>{{ py.supplierName }}</td>
                <td>{{ payableStore.sourceTypeLabels[py.sourceType] || py.sourceType }}</td>
                <td class="cell-mono">{{ py.sourceNo || '-' }}</td>
                <td class="cell-mono">¥{{ formatMoney(py.amount) }}</td>
                <td class="cell-mono" style="color: var(--color-success)">¥{{ formatMoney(py.paidAmount) }}</td>
                <td class="cell-mono" style="color: var(--color-danger)">¥{{ formatMoney(py.remainingAmount) }}</td>
                <td>{{ py.dueDate || '-' }}</td>
                <td>
                  <span class="status-badge" :class="payableStore.statusBadgeMap[py.status] || 'neutral'">
                    {{ payableStore.statusLabels[py.status] || py.status }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button
                    v-if="py.status !== 'completed'"
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-success)"
                    title="付款"
                    @click="openPaymentForm(py)"
                  >
                    <Icon name="dollar" :size="14" />
                  </button>
                  <span v-else style="color: var(--color-text-tertiary); font-size: var(--font-size-xs)">已结清</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalPayablePages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="payablePage <= 1" @click="payablePage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ payablePage }} / {{ totalPayablePages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="payablePage >= totalPayablePages" @click="payablePage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 付款记录 -->
    <div v-show="currentTab === 'payments'" class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center">序号</th>
                <th>付款单号</th>
                <th>供应商</th>
                <th>付款金额</th>
                <th>付款方式</th>
                <th>银行</th>
                <th>参考号</th>
                <th>付款日期</th>
                <th>操作人</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedPayments.length === 0">
                <td colspan="11" class="empty-state">
                  <div class="empty-state-circle"><Icon name="empty" :size="32" /></div>
                  <div class="empty-state-text">暂无付款记录</div>
                </td>
              </tr>
              <tr
                v-for="(pm, idx) in paginatedPayments"
                :key="pm.id"
                class="table-row-animated"
                :style="{ animationDelay: idx * 20 + 'ms' }"
              >
                <td style="text-align: center; overflow-wrap: break-word; word-wrap: break-word">
                  {{ (paymentPage - 1) * pageSize + idx + 1 }}
                </td>
                <td class="cell-mono" style="color: var(--color-accent)">{{ pm.paymentNo }}</td>
                <td>{{ pm.supplierName }}</td>
                <td class="cell-mono" style="color: var(--color-danger)">¥{{ formatMoney(pm.amount) }}</td>
                <td>{{ payableStore.methodLabels[pm.method] || pm.method }}</td>
                <td>{{ pm.bankName || '-' }}</td>
                <td class="cell-mono">{{ pm.referenceNo || '-' }}</td>
                <td>{{ pm.paymentDate }}</td>
                <td>{{ pm.operator }}</td>
                <td style="overflow-wrap: break-word; word-wrap: break-word" :title="pm.notes">
                  {{ pm.notes || '-' }}
                </td>
                <td>
                  <button
                    class="btn btn-ghost btn-sm"
                    style="color: var(--color-danger)"
                    @click="handleRevokePayment(pm)"
                  >
                    撤销
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div v-if="totalPaymentPages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="paymentPage <= 1" @click="paymentPage--">
            <Icon name="chevronLeft" :size="14" />
          </button>
          <span class="pagination-info">{{ paymentPage }} / {{ totalPaymentPages }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="paymentPage >= totalPaymentPages" @click="paymentPage++">
            <Icon name="chevronRight" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: 账龄分析 -->
    <div v-show="currentTab === 'aging'" class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="chart" :size="14" />
          账龄分析
        </span>
      </div>
      <div class="panel-card-body">
        <AgingAnalysis :data="agingData" type="payable" />
        <!-- 账龄矩阵热力图 -->
        <div class="aging-matrix" style="margin-top: var(--space-4)">
          <div class="aging-matrix-header">账龄分析矩阵（按供应商）</div>
          <table class="aging-matrix-table">
            <thead>
              <tr>
                <th>供应商</th>
                <th>0-30天</th>
                <th>30-60天</th>
                <th>60-90天</th>
                <th>90天+</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in agingMatrixData" :key="row.supplier">
                <td>{{ row.supplier }}</td>
                <td>
                  <span class="matrix-cell" :class="agingCellClass(row.d30)">
                    {{ row.d30 > 0 ? formatAmountShort(row.d30) : '-' }}
                  </span>
                </td>
                <td>
                  <span class="matrix-cell" :class="agingCellClass(row.d60)">
                    {{ row.d60 > 0 ? formatAmountShort(row.d60) : '-' }}
                  </span>
                </td>
                <td>
                  <span class="matrix-cell" :class="agingCellClass(row.d90)">
                    {{ row.d90 > 0 ? formatAmountShort(row.d90) : '-' }}
                  </span>
                </td>
                <td>
                  <span class="matrix-cell" :class="agingCellClass(row.d90plus)">
                    {{ row.d90plus > 0 ? formatAmountShort(row.d90plus) : '-' }}
                  </span>
                </td>
              </tr>
              <tr v-if="agingMatrixData.length === 0">
                <td colspan="5" style="text-align: center; color: var(--color-text-tertiary); padding: var(--space-4)">
                  暂无账龄数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 付款弹窗 -->
    <PaymentFormModal v-model:visible="showPaymentForm" :payable="selectedPayable" @saved="onPaymentSaved" />
  </div>
</template>

<script>
export default { name: 'PayableManagement' }
</script>
<script setup>
import { onMounted, computed, ref } from 'vue'
import { usePayableStore } from '@/modules/finance/stores/payable'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import PaymentFormModal from '@/modules/finance/components/finance/PaymentFormModal.vue'
import AgingAnalysis from '@/modules/finance/components/finance/AgingAnalysis.vue'
import DataSelect from '@/components/DataSelect.vue'
import { formatMoney } from '@/utils/format'
import { useFinancePage } from '@/composables/useFinancePage'

const payableStore = usePayableStore()
const inventoryStore = useInventoryStore()

const {
  currentTab,
  tabs,
  filters,
  agingData,
  getRowStyle,
  resetFilters,
  onEntityChange,
  filteredPrimaryList,
  showForm: showPaymentForm,
  selectedItem: selectedPayable,
  primaryPage: payablePage,
  secondaryPage: paymentPage,
  paginatedPrimaryList: paginatedPayables,
  totalPrimaryPages: totalPayablePages,
  paginatedSecondaryList: paginatedPayments,
  totalSecondaryPages: totalPaymentPages,
  openForm: openPaymentForm,
  onFormSaved: onPaymentSaved,
  handleRevoke: handleRevokePayment
} = useFinancePage({
  financeStore: payableStore,
  secondaryStore: inventoryStore,
  type: 'payable'
})

/* 保留 onSupplierChange 作为 onEntityChange 的别名，兼容模板 */
const onSupplierChange = onEntityChange

/* 付款完成率 */
const completionRate = computed(() => {
  const total = payableStore.totalAmount
  if (!total || total <= 0) return 0
  return Math.min(100, Math.round((payableStore.totalPaid / total) * 100))
})

const completionRateColor = computed(() => {
  const r = completionRate.value
  if (r >= 80) return 'var(--color-success)'
  if (r >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const completionCircumference = CIRCUMFERENCE
const completionOffset = computed(() => CIRCUMFERENCE - (completionRate.value / 100) * CIRCUMFERENCE)

/* 账龄分布百分比 */
function agingPercent(key) {
  const total =
    (agingData.value.current || 0) +
    (agingData.value.days30 || 0) +
    (agingData.value.days60 || 0) +
    (agingData.value.days90 || 0) +
    (agingData.value.days180 || 0) +
    (agingData.value.over180 || 0)
  if (!total) return 0
  return Math.min(100, Math.max(2, ((agingData.value[key] || 0) / total) * 100))
}

const agingPercentOver60 = computed(() => {
  const total =
    (agingData.value.current || 0) +
    (agingData.value.days30 || 0) +
    (agingData.value.days60 || 0) +
    (agingData.value.days90 || 0) +
    (agingData.value.days180 || 0) +
    (agingData.value.over180 || 0)
  if (!total) return 0
  const v = (agingData.value.days90 || 0) + (agingData.value.days180 || 0) + (agingData.value.over180 || 0)
  return Math.min(100, Math.max(2, (v / total) * 100))
})

/* 供应商 TOP5 */
const supplierTopColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const topSuppliers = computed(() => {
  const map = new Map()
  for (const p of payableStore.payables) {
    if (p.status === 'completed') continue
    const remaining = (parseFloat(p.amount) || 0) - (parseFloat(p.paidAmount) || 0)
    if (remaining <= 0) continue
    const prev = map.get(p.supplierId) || { supplierId: p.supplierId, supplierName: p.supplierName, amount: 0 }
    prev.amount += remaining
    map.set(p.supplierId, prev)
  }
  const list = Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  const max = list[0]?.amount || 1
  return list.map((item) => ({ ...item, percent: Math.min(100, Math.max(4, (item.amount / max) * 100)) }))
})

/* 逾期预警列表 */
const overdueList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return payableStore.payables
    .filter((p) => p.status === 'overdue' || (p.dueDate && new Date(p.dueDate) < today && p.status !== 'completed'))
    .map((p) => ({
      ...p,
      remainingAmount: (parseFloat(p.amount) || 0) - (parseFloat(p.paidAmount) || 0)
    }))
    .filter((p) => p.remainingAmount > 0)
    .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
})

function overdueDays(dueDate) {
  if (!dueDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - d) / 86400000)
  return diff > 0 ? diff : 0
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

/* 折叠统计区控制（默认收起） */
const showPayableStatsExpanded = ref(false)

/* 账龄矩阵数据（按供应商维度） */
const agingMatrixData = computed(() => {
  const now = new Date()
  const items = payableStore.payables || []
  const supplierMap = {}
  for (const item of items) {
    if (item.status === 'completed') continue
    const supplier = item.supplierName || '未知供应商'
    if (!supplierMap[supplier]) {
      supplierMap[supplier] = { supplier, d30: 0, d60: 0, d90: 0, d90plus: 0 }
    }
    const dueDate = item.dueDate ? new Date(item.dueDate) : now
    const days = Math.floor((now - dueDate) / 86400000)
    const amount = parseFloat(item.remainingAmount || item.amount) || 0
    if (days <= 30) supplierMap[supplier].d30 += amount
    else if (days <= 60) supplierMap[supplier].d60 += amount
    else if (days <= 90) supplierMap[supplier].d90 += amount
    else supplierMap[supplier].d90plus += amount
  }
  return Object.values(supplierMap).slice(0, 10)
})

function agingCellClass(amount) {
  if (!amount || amount <= 0) return 'empty'
  if (amount >= 50000) return 'critical'
  if (amount >= 10000) return 'high'
  if (amount >= 5000) return 'medium'
  return 'low'
}

function formatAmountShort(val) {
  const n = parseFloat(val) || 0
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toFixed(0)
}

onMounted(() => {
  payableStore.refreshOverdueStatus()
})
</script>

<style scoped>
.payable-page {
}

/* 资金流水线逾期节点标红 */
.pipeline-node--danger {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.04);
}

/* 账龄矩阵热力图单元格 */
.matrix-cell {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.matrix-cell.empty {
  color: var(--color-text-tertiary);
  background: transparent;
}
.matrix-cell.low {
  color: #166534;
  background: #dcfce7;
}
.matrix-cell.medium {
  color: #92400e;
  background: #fef3c7;
}
.matrix-cell.high {
  color: #9a3412;
  background: #fed7aa;
}
.matrix-cell.critical {
  color: #991b1b;
  background: #fecaca;
}

/* 统计卡片 */
.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: statCardIn 0.4s ease both;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.stat-card-icon {
  opacity: 0.7;
}
.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  animation: pulseDot 2s ease-in-out infinite;
  flex-shrink: 0;
}

/* 概览面板 */
.overview-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.overview-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  animation: statCardIn 0.4s ease both;
}
.overview-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}
.overview-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.overview-content.center {
  align-items: center;
  justify-content: center;
  min-height: 80px;
}
.overview-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-3) 0;
}

/* 进度环 */
.progress-ring {
  transform: rotate(-90deg);
}
.progress-ring-bg {
  fill: none;
  stroke: var(--color-bg-primary);
  stroke-width: 5;
}
.progress-ring-fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 0.6s ease,
    stroke 0.3s ease;
}
.progress-ring-text {
  transform: rotate(90deg);
  font-size: 14px;
  font-weight: 700;
  fill: var(--color-text-primary);
  font-family: var(--font-mono);
}

/* 迷你条形图 */
.mini-bar-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.mini-bar-label {
  width: 64px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.mini-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.mini-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
  min-width: 2px;
}
.mini-bar-value {
  width: 72px;
  text-align: right;
  color: var(--color-text-primary);
  font-weight: 600;
  flex-shrink: 0;
}

/* 逾期预警 */
.overdue-alert {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  animation: slideInDown 0.4s ease both;
}
.overdue-alert-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.overdue-alert-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-danger);
}
.overdue-alert-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-left: auto;
}
.overdue-alert-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.overdue-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  padding: var(--space-1) 0;
  animation: slideInRight 0.4s ease both;
}
.overdue-alert-no {
  font-family: var(--font-mono);
  color: var(--color-accent);
  min-width: 110px;
}
.overdue-alert-supplier {
  flex: 1;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.overdue-alert-amount {
  color: var(--color-danger);
  font-weight: 600;
  min-width: 90px;
  text-align: right;
}
.overdue-alert-days {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  min-width: 70px;
  text-align: right;
}

/* Tab */
.tab-bar {
  display: flex;
  gap: var(--space-1);
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

/* 表格行动画 */
.table-row-animated {
  animation: rowSlideIn 0.3s ease both;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  color: var(--color-text-tertiary);
}
.empty-state-text {
  font-size: var(--font-size-sm);
}

/* 分页 */
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

/* Keyframes */
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

@keyframes pulseDot {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.15);
  }
  50% {
    opacity: 0.85;
    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .stats-grid-4 {
    grid-template-columns: 1fr;
  }
  .overview-row {
    grid-template-columns: 1fr;
  }
  .filter-bar {
    flex-direction: column;
  }
  .tab-bar {
    overflow-x: auto;
  }
  .overdue-alert-item {
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .overdue-alert-supplier {
    width: 100%;
  }
}
.table-container {
  overflow-x: auto;
}
</style>
