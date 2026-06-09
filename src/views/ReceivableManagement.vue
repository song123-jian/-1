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
      <div class="stat-card" style="animation-delay:0ms">
        <div class="stat-card-header">
          <span class="stat-card-label">应收总额</span>
          <Icon name="chart" :size="16" />
        </div>
        <div class="stat-card-value" style="color:var(--color-accent)">¥{{ formatMoney(receivableStore.totalAmount) }}</div>
      </div>
      <div class="stat-card" style="animation-delay:60ms">
        <div class="stat-card-header">
          <span class="stat-card-label">已收金额</span>
          <Icon name="dollar" :size="16" />
        </div>
        <div class="stat-card-value" style="color:var(--color-success)">¥{{ formatMoney(receivableStore.totalReceived) }}</div>
      </div>
      <div class="stat-card" style="animation-delay:120ms">
        <div class="stat-card-header">
          <span class="stat-card-label">未收金额</span>
          <span class="stat-dot-halo"><span class="alert-dot-pulse"></span></span>
        </div>
        <div class="stat-card-value" style="color:var(--color-warning)">¥{{ formatMoney(receivableStore.totalRemaining) }}</div>
      </div>
      <div class="stat-card" style="animation-delay:180ms">
        <div class="stat-card-header">
          <span class="stat-card-label">逾期金额</span>
          <span class="stat-dot-halo"><span class="alert-dot-pulse"></span></span>
        </div>
        <div class="stat-card-value" style="color:var(--color-danger)">¥{{ formatMoney(receivableStore.totalOverdue) }}</div>
      </div>
    </div>

    <!-- 概览面板 -->
    <div class="overview-row">
      <div class="overview-card" style="animation-delay:0ms">
        <div class="overview-card-title">收款完成率</div>
        <div class="overview-card-body center">
          <div class="progress-ring-wrap">
            <svg class="progress-ring" width="120" height="120" viewBox="0 0 120 120">
              <circle class="progress-ring-bg" cx="60" cy="60" r="26" />
              <circle
                class="progress-ring-fill"
                cx="60" cy="60" r="26"
                :stroke="completionRateColor"
                :stroke-dasharray="completionRingDasharray"
                :stroke-dashoffset="completionRingDashoffset"
              />
            </svg>
            <div class="progress-ring-text">
              <div class="progress-ring-percent">{{ completionRate }}%</div>
              <div class="progress-ring-sub">已收/应收总额</div>
            </div>
          </div>
        </div>
      </div>
      <div class="overview-card" style="animation-delay:60ms">
        <div class="overview-card-title">账龄分布</div>
        <div class="overview-card-body">
          <div class="aging-bars">
            <div class="aging-bar-item">
              <div class="aging-bar-label">未到期</div>
              <div class="aging-bar-track">
                <div class="aging-bar-fill aging-bar-current" :style="{ width: agingPercent.current + '%' }"></div>
              </div>
              <div class="aging-bar-value">¥{{ formatMoney(agingData.current) }}</div>
            </div>
            <div class="aging-bar-item">
              <div class="aging-bar-label">1-30天</div>
              <div class="aging-bar-track">
                <div class="aging-bar-fill aging-bar-30" :style="{ width: agingPercent.days30 + '%' }"></div>
              </div>
              <div class="aging-bar-value">¥{{ formatMoney(agingData.days30) }}</div>
            </div>
            <div class="aging-bar-item">
              <div class="aging-bar-label">31-60天</div>
              <div class="aging-bar-track">
                <div class="aging-bar-fill aging-bar-60" :style="{ width: agingPercent.days60 + '%' }"></div>
              </div>
              <div class="aging-bar-value">¥{{ formatMoney(agingData.days60) }}</div>
            </div>
            <div class="aging-bar-item">
              <div class="aging-bar-label">60天+</div>
              <div class="aging-bar-track">
                <div class="aging-bar-fill aging-bar-60plus" :style="{ width: agingPercent.days60plus + '%' }"></div>
              </div>
              <div class="aging-bar-value">¥{{ formatMoney(agingData.days60 + agingData.days90 + agingData.days180 + agingData.over180) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="overview-card" style="animation-delay:120ms">
        <div class="overview-card-title">客户应收 TOP5</div>
        <div class="overview-card-body">
          <div class="top5-list">
            <div v-for="(item, idx) in customerTop5" :key="idx" class="top5-item">
              <div class="top5-info">
                <span class="top5-rank">{{ idx + 1 }}</span>
                <span class="top5-name" :title="item.name">{{ item.name }}</span>
              </div>
              <div class="top5-bar-track">
                <div class="top5-bar-fill" :style="{ width: item.percent + '%' }"></div>
              </div>
              <div class="top5-value">¥{{ formatMoney(item.amount) }}</div>
            </div>
            <div v-if="customerTop5.length === 0" class="top5-empty">暂无数据</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 逾期预警 -->
    <div v-if="overdueList.length > 0" class="overdue-alert-panel">
      <div class="overdue-alert-header">
        <span class="overdue-alert-dot"><span class="alert-dot-pulse"></span></span>
        <span class="overdue-alert-title">逾期预警</span>
        <span class="overdue-alert-count">{{ overdueList.length }} 笔</span>
      </div>
      <div class="overdue-alert-body">
        <div
          v-for="(item, idx) in overdueList"
          :key="item.id"
          class="overdue-alert-item"
          :style="{ animationDelay: (idx * 80) + 'ms' }"
        >
          <div class="overdue-alert-no">{{ item.receivableNo }}</div>
          <div class="overdue-alert-customer">{{ item.customerName }}</div>
          <div class="overdue-alert-amount">¥{{ formatMoney(item.remainingAmount) }}</div>
          <div class="overdue-alert-days">逾期 {{ item.overdueDays }} 天</div>
        </div>
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
      <DataSelect module="customer" variant="active" v-model="filters.customerId" value-field="id" label-field="name" placeholder="全部客户" clearable style="min-width:160px" />
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
                  <div class="empty-state-icon-circle"><Icon name="empty" :size="32" /></div>
                  <div class="empty-state-text">暂无应收记录</div>
                </td>
              </tr>
              <tr
                v-for="(rv, idx) in paginatedReceivables"
                :key="rv.id"
                :style="[{ animationDelay: (idx * 20) + 'ms' }, getRowStyle(rv)]"
                class="row-slide-in"
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedReceipts.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-icon-circle"><Icon name="empty" :size="32" /></div>
                  <div class="empty-state-text">暂无收款记录</div>
                </td>
              </tr>
              <tr
                v-for="(rc, idx) in paginatedReceipts"
                :key="rc.id"
                :style="{ animationDelay: (idx * 20) + 'ms' }"
                class="row-slide-in"
              >
                <td class="cell-mono" style="color:var(--color-accent)">{{ rc.receiptNo }}</td>
                <td>{{ rc.customerName }}</td>
                <td class="cell-mono" style="color:var(--color-success)">¥{{ formatMoney(rc.amount) }}</td>
                <td>{{ receivableStore.methodLabels[rc.method] || rc.method }}</td>
                <td>{{ rc.bankName || '-' }}</td>
                <td class="cell-mono">{{ rc.referenceNo || '-' }}</td>
                <td>{{ rc.receiptDate }}</td>
                <td>{{ rc.operator }}</td>
                <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="rc.notes">{{ rc.notes || '-' }}</td>
                <td><button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleRevokeReceipt(rc)">撤销</button></td>
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
import { onMounted, computed } from 'vue'
import { useReceivableStore } from '@/stores/receivable'
import { useCustomerStore } from '@/stores/customer'
import DataSelect from '@/components/DataSelect.vue'
import { formatMoney } from '@/utils/format'
import ReceiptFormModal from '@/components/finance/ReceiptFormModal.vue'
import AgingAnalysis from '@/components/finance/AgingAnalysis.vue'
import { useFinancePage } from '@/composables/useFinancePage'

const receivableStore = useReceivableStore()
const customerStore = useCustomerStore()

const {
  currentTab, tabs, filters, agingData, getRowStyle, resetFilters,
  /* 重命名为模板中使用的变量名 */
  showForm: showReceiptForm,
  selectedItem: selectedReceivable,
  primaryPage: receivablePage,
  secondaryPage: receiptPage,
  paginatedPrimaryList: paginatedReceivables,
  totalPrimaryPages: totalReceivablePages,
  paginatedSecondaryList: paginatedReceipts,
  totalSecondaryPages: totalReceiptPages,
  openForm: openReceiptForm,
  onFormSaved: onReceiptSaved,
  handleRevoke: handleRevokeReceipt,
} = useFinancePage({
  financeStore: receivableStore,
  secondaryStore: customerStore,
  type: 'receivable'
})

/* 收款完成率 */
const completionRate = computed(() => {
  const total = receivableStore.totalAmount
  if (!total || total <= 0) return 0
  return Math.round((receivableStore.totalReceived / total) * 100)
})
const completionRateColor = computed(() => {
  const r = completionRate.value
  if (r >= 80) return 'var(--color-success)'
  if (r >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const completionRingDasharray = computed(() => {
  const r = 26
  const c = 2 * Math.PI * r
  return `${c} ${c}`
})
const completionRingDashoffset = computed(() => {
  const r = 26
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, completionRate.value)) / 100
  return c * (1 - pct)
})

/* 账龄分布百分比 */
const agingPercent = computed(() => {
  const data = agingData.value || {}
  const total = (data.current || 0) + (data.days30 || 0) + (data.days60 || 0) + (data.days90 || 0) + (data.days180 || 0) + (data.over180 || 0)
  if (!total) return { current: 0, days30: 0, days60: 0, days60plus: 0 }
  const p = v => Math.max(0, Math.min(100, Math.round(((v || 0) / total) * 100)))
  return {
    current: p(data.current),
    days30: p(data.days30),
    days60: p(data.days60),
    days60plus: p((data.days90 || 0) + (data.days180 || 0) + (data.over180 || 0))
  }
})

/* 客户应收 TOP5 */
const customerTop5 = computed(() => {
  const map = new Map()
  for (const rv of receivableStore.receivables) {
    if (rv.status === 'completed') continue
    const remaining = (parseFloat(rv.amount) || 0) - (parseFloat(rv.receivedAmount) || 0)
    if (remaining <= 0) continue
    const prev = map.get(rv.customerId) || { name: rv.customerName || '未知客户', amount: 0 }
    map.set(rv.customerId, { name: prev.name, amount: prev.amount + remaining })
  }
  const arr = Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
  const max = arr.length ? arr[0].amount : 1
  return arr.map(item => ({ ...item, percent: max ? Math.round((item.amount / max) * 100) : 0 }))
})

/* 逾期预警列表 */
const overdueList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const list = receivableStore.receivables.filter(r => {
    if (r.status === 'completed') return false
    if (r.status === 'overdue') return true
    if (!r.dueDate) return false
    const d = new Date(r.dueDate)
    d.setHours(0, 0, 0, 0)
    return d < today
  })
  return list.map(r => {
    const due = r.dueDate ? new Date(r.dueDate) : today
    due.setHours(0, 0, 0, 0)
    const days = Math.max(0, Math.floor((today - due) / 86400000))
    return { ...r, remainingAmount: (parseFloat(r.amount) || 0) - (parseFloat(r.receivedAmount) || 0), overdueDays: days }
  }).filter(r => r.remainingAmount > 0).sort((a, b) => b.overdueDays - a.overdueDays)
})

onMounted(() => {
  receivableStore.initSeedData()
  customerStore.initSeedData()
  receivableStore.refreshOverdueStatus()
})
</script>

<style scoped>
.receivable-page {
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
  animation: statCardIn 0.4s ease-out both;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.stat-card-value {
  font-family: var(--font-mono);
  font-size: var(--font-size-xl);
  font-weight: 600;
}
.stat-dot-halo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}
.alert-dot-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  position: relative;
}
.alert-dot-pulse::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  margin-left: -4px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: alertPulse 1.6s ease-out infinite;
  opacity: 0.6;
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
  animation: statCardIn 0.4s ease-out both;
}
.overview-card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}
.overview-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.overview-card-body.center {
  align-items: center;
  justify-content: center;
}

/* 进度环 */
.progress-ring-wrap {
  position: relative;
  width: 120px;
  height: 120px;
}
.progress-ring {
  transform: rotate(-90deg);
}
.progress-ring-bg {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 5;
}
.progress-ring-fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease;
}
.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.progress-ring-percent {
  font-family: var(--font-mono);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}
.progress-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* 账龄条形图 */
.aging-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.aging-bar-item {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  gap: var(--space-2);
}
.aging-bar-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.aging-bar-track {
  height: 8px;
  background: var(--color-surface-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.aging-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}
.aging-bar-current { background: var(--color-success); }
.aging-bar-30 { background: var(--color-accent); }
.aging-bar-60 { background: var(--color-warning); }
.aging-bar-60plus { background: var(--color-danger); }
.aging-bar-value {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* TOP5 */
.top5-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.top5-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: var(--space-1) var(--space-2);
  align-items: center;
}
.top5-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}
.top5-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-hover);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.top5-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.top5-bar-track {
  grid-column: 1 / 2;
  height: 6px;
  background: var(--color-surface-hover);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.top5-bar-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  opacity: 0.85;
  transition: width 0.5s ease;
}
.top5-value {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  align-self: center;
}
.top5-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4) 0;
}

/* 逾期预警 */
.overdue-alert-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  overflow: hidden;
  animation: slideInUp 0.4s ease-out both;
}
.overdue-alert-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: rgba(239, 68, 68, 0.06);
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
}
.overdue-alert-dot {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.overdue-alert-dot .alert-dot-pulse {
  width: 10px;
  height: 10px;
}
.overdue-alert-dot .alert-dot-pulse::before {
  width: 10px;
  height: 10px;
  margin-top: -5px;
  margin-left: -5px;
}
.overdue-alert-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-danger);
}
.overdue-alert-count {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.overdue-alert-body {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.overdue-alert-item {
  display: grid;
  grid-template-columns: 140px 1fr 120px 100px;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
  animation: slideInRight 0.4s ease-out both;
}
.overdue-alert-no {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}
.overdue-alert-customer {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overdue-alert-amount {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  text-align: right;
}
.overdue-alert-days {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  text-align: right;
}

/* Tab */
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

/* 表格行动画 */
.row-slide-in {
  animation: rowSlideIn 0.35s ease-out both;
}

/* 空状态 */
.empty-state {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) var(--space-4);
}
.empty-state-icon-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-surface-hover);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-3);
}
.empty-state-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
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
@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes alertPulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  70% {
    transform: scale(2.4);
    opacity: 0;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .overview-row { grid-template-columns: 1fr; }
  .overdue-alert-item {
    grid-template-columns: 120px 1fr 100px;
  }
  .overdue-alert-days { display: none; }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .filter-bar { flex-direction: column; }
  .tab-bar { overflow-x: auto; }
  .overdue-alert-item {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .overdue-alert-amount { text-align: left; }
}
</style>
