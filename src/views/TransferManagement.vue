<template>
  <div class="transfer-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title"><Icon name="shuffle" :size="14" /> 调拨管理</h2>
        <p class="page-header-subtitle">管理仓库间物料调拨</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="showFormModal = true">
          <Icon name="plus" :size="14" /> 新增调拨单
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid stats-grid-4">
      <div class="stat-card" style="animation-delay:0ms">
        <div class="stat-card-header">
          <span class="stat-card-label">调拨单总数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)"><Icon name="shuffle" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ transferStore.totalOrders }}</div>
      </div>
      <div class="stat-card" style="animation-delay:60ms">
        <div class="stat-card-header">
          <span class="stat-card-label">待审批</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)"><Icon name="clock" :size="14" /></div>
        </div>
        <div class="stat-card-value"><span class="stat-dot-halo" style="background:var(--color-warning)"></span>{{ transferStore.pendingCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:120ms">
        <div class="stat-card-header">
          <span class="stat-card-label">在途</span>
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)"><Icon name="truck" :size="14" /></div>
        </div>
        <div class="stat-card-value"><span class="stat-dot-halo" style="background:var(--color-info)"></span>{{ transferStore.inTransitCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:180ms">
        <div class="stat-card-header">
          <span class="stat-card-label">本月调拨金额</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)"><Icon name="dollar" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ formatMoney(transferStore.monthlyAmount) }}</div>
      </div>
    </div>

    <!-- 概览面板：调拨完成率 + 调拨类型分布 + 近7日趋势 -->
    <div class="transfer-overview-row">
      <div class="overview-card overview-ring-card">
        <div class="overview-card-title">调拨完成率</div>
        <div class="overview-ring-body">
          <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
            <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
            <circle cx="36" cy="36" r="26" fill="none" :stroke="completionRateColor" stroke-width="5" stroke-linecap="round"
              :stroke-dasharray="completionRateDash" stroke-dashoffset="0" transform="rotate(-90 36 36)" class="overview-ring-progress" />
          </svg>
          <div class="overview-ring-text">
            <span class="overview-ring-percent" :style="{ color: completionRateColor }">{{ completionRate }}%</span>
            <span class="overview-ring-sub">已完成/总数</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-type-card">
        <div class="overview-card-title">调拨类型分布</div>
        <div class="type-bars">
          <div v-for="t in transferTypeStats" :key="t.type" class="type-bar-item">
            <span class="type-bar-label">{{ t.label }}</span>
            <div class="type-bar-track">
              <div class="type-bar-fill" :style="{ width: t.percent + '%', background: t.color }"></div>
            </div>
            <span class="type-bar-count">{{ t.count }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-trend-card">
        <div class="overview-card-title">近7日调拨趋势</div>
        <div class="trend-bars">
          <div v-for="(d, idx) in recent7Days" :key="idx" class="trend-bar-col">
            <div class="trend-bar-track-v">
              <div class="trend-bar-fill-v" :style="{ height: d.percent + '%', background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)' }"></div>
            </div>
            <span class="trend-bar-day">{{ d.dayLabel }}</span>
            <span class="trend-bar-num">{{ d.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 待处理预警 -->
    <div v-if="pendingAlerts.length > 0" class="panel-card transfer-alert-panel">
      <div class="panel-card-header">
        <span class="panel-card-title" style="color:var(--color-warning)"><span class="alert-dot-pulse"></span> 待处理预警</span>
      </div>
      <div class="panel-card-body">
        <div v-for="(a, idx) in pendingAlerts" :key="a.id" class="transfer-alert-item" :style="{ animationDelay: idx * 60 + 'ms' }">
          <span class="transfer-alert-badge" :class="'alert-' + a.status">{{ STATUS_LABELS[a.status] }}</span>
          <span class="transfer-alert-no">{{ a.orderNo }}</span>
          <span class="transfer-alert-route">{{ a.fromWarehouseName }} <Icon name="chevronRight" :size="10" /> {{ a.toWarehouseName }}</span>
          <span class="transfer-alert-amount">{{ formatMoney(a.totalAmount) }}</span>
          <span class="transfer-alert-date">{{ a.expectedDate || '-' }}</span>
          <button class="btn btn-ghost btn-sm" @click="handleAlertAction(a)">{{ a.status === 'pending' ? '审批' : '收货' }}</button>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-4)">
      <input v-model="searchText" type="text" class="form-input" placeholder="搜索单号/备注..." style="width: 200px" />
      <select v-model="statusFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部状态</option>
        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="typeFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部类型</option>
        <option v-for="(label, key) in TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <!-- 调拨单列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">调拨单列表</span>
        <span class="panel-card-count">共 {{ filteredOrders.length }} 条</span>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>单号</th>
              <th>调拨类型</th>
              <th>调出仓库</th>
              <th>调入仓库</th>
              <th>状态</th>
              <th>物料数</th>
              <th>总金额</th>
              <th>申请人</th>
              <th>计划到货</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedOrders.length === 0">
              <td colspan="10" class="empty-state"><div class="empty-state-icon"><Icon name="shuffle" :size="24" /></div>暂无调拨单</td>
            </tr>
            <tr v-for="(order, idx) in pagedOrders" :key="order.id" :style="{ animationDelay: idx * 20 + 'ms' }">
              <td class="cell-mono">{{ order.orderNo }}</td>
              <td>
                <span class="status-badge" :class="order.type === 'same_price' ? 'info' : 'warning'">
                  {{ TYPE_LABELS[order.type] }}
                </span>
              </td>
              <td>{{ order.fromWarehouseName }}</td>
              <td>{{ order.toWarehouseName }}</td>
              <td>
                <span class="status-badge" :class="STATUS_COLORS[order.status]">{{ STATUS_LABELS[order.status] }}</span>
              </td>
              <td>{{ order.items.length }}</td>
              <td class="cell-mono">{{ formatMoney(order.totalAmount) }}</td>
              <td>{{ order.requester || '-' }}</td>
              <td>{{ order.expectedDate || '-' }}</td>
              <td>
                <div style="display: flex; gap: var(--space-1); flex-wrap: nowrap">
                  <button v-if="order.status === 'draft'" class="action-btn" @click="handleSubmit(order)">
                    <Icon name="send" :size="12" /> 提交
                  </button>
                  <button v-if="order.status === 'pending'" class="action-btn" @click="handleApprove(order)">
                    <Icon name="check" :size="12" /> 审批
                  </button>
                  <button v-if="order.status === 'pending'" class="action-btn danger" @click="handleReject(order)">
                    <Icon name="x" :size="12" /> 拒绝
                  </button>
                  <button v-if="order.status === 'approved'" class="action-btn" @click="handleShip(order)">
                    <Icon name="truck" :size="12" /> 发货
                  </button>
                  <button v-if="order.status === 'in_transit'" class="action-btn" @click="handleReceive(order)">
                    <Icon name="package" :size="12" /> 收货
                  </button>
                  <button v-if="['draft', 'pending'].includes(order.status)" class="action-btn danger" @click="handleCancel(order)">
                    <Icon name="x" :size="12" /> 取消
                  </button>
                  <button class="action-btn" @click="handlePreview(order)">
                    <Icon name="eye" :size="12" /> 预览
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3)">
      <span style="font-size: var(--font-size-xs); color: var(--color-text-tertiary)">
        共 {{ filteredOrders.length }} 条，第 {{ currentPage }}/{{ totalPages }} 页
      </span>
      <div style="display: flex; gap: var(--space-1)">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <TransferFormModal
      v-if="showFormModal"
      @close="showFormModal = false"
      @created="handleCreated"
    />

    <!-- 预览弹窗 -->
    <TransferPreview
      v-if="previewOrder"
      :order="previewOrder"
      @close="previewOrder = null"
    />

    <!-- 确认弹窗 -->
    <div v-if="confirmVisible" class="modal-overlay" style="z-index: var(--z-toast)">
      <div class="modal-dialog" style="max-width: 400px">
        <div class="modal-header">
          <span class="modal-title">{{ confirmTitle }}</span>
        </div>
        <div class="modal-body" style="text-align:center">
          <div class="confirm-icon-circle"><Icon name="warning" :size="24" /></div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">{{ confirmMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="confirmVisible = false">取消</button>
          <button class="btn btn-primary" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTransferStore } from '@/stores/transfer'
import TransferFormModal from '@/components/inventory/TransferFormModal.vue'
import TransferPreview from '@/components/inventory/TransferPreview.vue'

const transferStore = useTransferStore()
const { TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } = transferStore

const searchText = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const currentPage = ref(1)
const pageSize = 15

const showFormModal = ref(false)
const previewOrder = ref(null)

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmCallback = null

onMounted(() => {
  transferStore.initSeedData()
})

const filteredOrders = computed(() => {
  let list = transferStore.transferOrders || []
  if (statusFilter.value) list = list.filter(o => o.status === statusFilter.value)
  if (typeFilter.value) list = list.filter(o => o.type === typeFilter.value)
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(o =>
      (o.orderNo || '').toLowerCase().includes(kw) ||
      (o.notes || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))
const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrders.value.slice(start, start + pageSize)
})

/* ====== 概览面板计算 ====== */

/* 调拨完成率 */
const completionRate = computed(() => {
  const total = transferStore.totalOrders
  if (total === 0) return 0
  return Math.round((transferStore.completedCount / total) * 100)
})
const RING_C = 2 * Math.PI * 26
const completionRateColor = computed(() => {
  const r = completionRate.value
  if (r >= 70) return 'var(--color-success)'
  if (r >= 40) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const completionRateDash = computed(() => {
  const p = completionRate.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 调拨类型分布 */
const TYPE_COLORS = { same_price: '#3b82f6', diff_price: '#f59e0b' }
const transferTypeStats = computed(() => {
  const map = {}
  for (const o of (transferStore.transferOrders || [])) {
    const t = o.type || 'same_price'
    if (!map[t]) map[t] = 0
    map[t]++
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 1
  return entries.map(([type, count]) => ({
    type,
    label: TYPE_LABELS[type],
    count,
    percent: Math.round((count / max) * 100),
    color: TYPE_COLORS[type] || '#64748b'
  }))
})

/* 近7日调拨趋势 */
const recent7Days = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const count = (transferStore.transferOrders || []).filter(o => o.createDate && o.createDate.startsWith(ds)).length
    days.push({
      date: ds,
      dayLabel: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      count,
      percent: 0
    })
  }
  const max = Math.max(...days.map(d => d.count), 1)
  days.forEach(d => { d.percent = Math.round((d.count / max) * 100) })
  return days
})

/* 待处理预警 */
const pendingAlerts = computed(() => {
  return (transferStore.transferOrders || [])
    .filter(o => o.status === 'pending' || o.status === 'in_transit')
    .sort((a, b) => new Date(a.expectedDate || '9999-12-31') - new Date(b.expectedDate || '9999-12-31'))
    .slice(0, 5)
})

function handleAlertAction(order) {
  if (order.status === 'pending') {
    handleApprove(order)
  } else if (order.status === 'in_transit') {
    handleReceive(order)
  }
}

function showConfirm(title, message, callback) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmCallback = callback
  confirmVisible.value = true
}

function confirmAction() {
  confirmVisible.value = false
  if (confirmCallback) confirmCallback()
}

function handleSubmit(order) {
  showConfirm('提交确认', '确认提交该调拨单进行审批？', () => {
    transferStore.submitTransferOrder(order.id)
  })
}

function handleApprove(order) {
  showConfirm('审批确认', '确认审批通过该调拨单？', () => {
    transferStore.approveTransferOrder(order.id, '仓库主管')
  })
}

function handleReject(order) {
  showConfirm('拒绝确认', '确认拒绝该调拨单？', () => {
    transferStore.rejectTransferOrder(order.id)
  })
}

function handleShip(order) {
  showConfirm('发货确认', '确认该调拨单已发货？', () => {
    transferStore.shipTransferOrder(order.id)
  })
}

function handleReceive(order) {
  showConfirm('收货确认', '确认收货？收货后将更新两个仓库的库存。', () => {
    transferStore.receiveTransferOrder(order.id)
  })
}

function handleCancel(order) {
  showConfirm('取消确认', '确认取消该调拨单？', () => {
    transferStore.cancelTransferOrder(order.id)
  })
}

function handlePreview(order) {
  previewOrder.value = order
}

function handleCreated() {
  showFormModal.value = false
}

function formatMoney(val) {
  if (!val && val !== 0) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.transfer-page {
  padding: var(--space-6);
  height: 100%;
  overflow-y: auto;
}

/* ====== 统计卡片动画 ====== */
.stats-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stats-grid-4 { grid-template-columns: repeat(4, 1fr); }
.stat-card {
  animation: statCardIn 0.4s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
@keyframes statCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.stat-card-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 700;
  font-size: var(--font-size-2xl);
  display: flex;
  align-items: center;
  gap: 6px;
}
.stat-dot-halo {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 1.5s ease-in-out infinite;
}
@keyframes alertDotPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(245,158,11,0.3); }
  50% { box-shadow: 0 0 10px rgba(245,158,11,0.7); }
}

/* ====== 概览面板 ====== */
.transfer-overview-row {
  display: grid;
  grid-template-columns: 200px 1fr 220px;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.overview-card {
  background: var(--color-bg-primary, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  animation: statCardIn 0.4s ease-out both;
}
.overview-card:nth-child(1) { animation-delay: 0ms; }
.overview-card:nth-child(2) { animation-delay: 80ms; }
.overview-card:nth-child(3) { animation-delay: 160ms; }
.overview-card-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
  font-weight: 500;
}

/* 进度环 */
.overview-ring-body {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.overview-ring-svg { flex-shrink: 0; }
.overview-ring-progress { transition: stroke-dasharray 0.6s ease; }
.overview-ring-text { display: flex; flex-direction: column; }
.overview-ring-percent {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
}
.overview-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* 调拨类型分布条形图 */
.type-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.type-bar-item {
  display: grid;
  grid-template-columns: 80px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.type-bar-label {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.type-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.type-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.type-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* 近7日趋势柱状图 */
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 80px;
  padding-top: 4px;
}
.trend-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.trend-bar-track-v {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.trend-bar-fill-v {
  width: 100%;
  border-radius: 3px 3px 0 0;
  transition: height 0.5s ease;
  min-height: 2px;
}
.trend-bar-day {
  font-size: 10px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
.trend-bar-num {
  font-size: 10px;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* ====== 待处理预警 ====== */
.transfer-alert-panel {
  margin-bottom: var(--space-3);
  border-left: 3px solid var(--color-warning);
}
.alert-dot-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
  animation: alertDotPulse 1.5s ease-in-out infinite;
  margin-right: 4px;
}
.transfer-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.transfer-alert-item:last-child { border-bottom: none; }
@keyframes alertSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
.transfer-alert-badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.transfer-alert-badge.alert-pending {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.transfer-alert-badge.alert-in_transit {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.transfer-alert-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.transfer-alert-route {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  gap: 2px;
}
.transfer-alert-amount {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-primary);
  margin-left: auto;
}
.transfer-alert-date {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

/* ====== 表格行入场动画 ====== */
.data-table tbody tr {
  animation: rowSlideIn 0.3s ease-out both;
}
@keyframes rowSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ====== 空状态圆形图标 ====== */
.empty-state {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-tertiary);
}
.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-bg-secondary, var(--color-surface-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-2);
  color: var(--color-text-tertiary);
}

/* ====== 确认弹窗圆形图标 ====== */
.confirm-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-warning-subtle, rgba(245,158,11,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
  color: var(--color-warning);
}

.panel-card-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .transfer-overview-row { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
}
</style>
