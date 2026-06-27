<template>
  <div class="stocktaking-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">
          <Icon name="clipboardCheck" :size="14" />
          盘点管理
        </h2>
        <p class="page-header-subtitle">管理库存盘点、差异审核与库存调整</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" @click="showFormModal = true">
          <Icon name="plus" :size="14" />
          新增盘点单
        </button>
      </div>
    </div>

    <!-- 流程看板 -->
    <div class="flow-board">
      <div
        class="flow-board-node"
        :class="{ active: stocktakingStatusFilter === 'planned' }"
        @click="stocktakingStatusFilter = stocktakingStatusFilter === 'planned' ? '' : 'planned'"
      >
        <span class="flow-board-dot pending"></span>
        <div>
          <div class="flow-board-count">{{ store.plannedCount || 0 }}</div>
          <div class="flow-board-label">待盘点</div>
        </div>
      </div>
      <span class="flow-board-arrow">→</span>
      <div
        class="flow-board-node"
        :class="{ active: stocktakingStatusFilter === 'executing' }"
        @click="stocktakingStatusFilter = stocktakingStatusFilter === 'executing' ? '' : 'executing'"
      >
        <span class="flow-board-dot progress"></span>
        <div>
          <div class="flow-board-count">{{ store.executingCount }}</div>
          <div class="flow-board-label">盘点中</div>
        </div>
      </div>
      <span class="flow-board-arrow">→</span>
      <div
        class="flow-board-node"
        :class="{ active: stocktakingStatusFilter === 'diff_review' }"
        @click="stocktakingStatusFilter = stocktakingStatusFilter === 'diff_review' ? '' : 'diff_review'"
      >
        <span class="flow-board-dot pending"></span>
        <div>
          <div class="flow-board-count">{{ store.diffReviewCount }}</div>
          <div class="flow-board-label">差异审核</div>
        </div>
      </div>
      <span class="flow-board-arrow">→</span>
      <div
        class="flow-board-node"
        :class="{ active: stocktakingStatusFilter === 'completed' }"
        @click="stocktakingStatusFilter = stocktakingStatusFilter === 'completed' ? '' : 'completed'"
      >
        <span class="flow-board-dot completed"></span>
        <div>
          <div class="flow-board-count">{{ store.completedCount }}</div>
          <div class="flow-board-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 折叠统计区 -->
    <div class="collapsible-stats">
      <div class="collapsible-stats-header" @click="showStocktakingStatsExpanded = !showStocktakingStatsExpanded">
        <span class="collapsible-stats-title">
          <Icon name="chart" :size="14" />
          统计与概览
        </span>
        <span class="collapsible-stats-toggle" :class="{ expanded: showStocktakingStatsExpanded }">▼</span>
      </div>
      <div v-show="showStocktakingStatsExpanded" class="collapsible-stats-body">
        <!-- 统计卡片 -->
        <div class="stats-grid stats-grid-4">
          <div class="stat-card" style="animation-delay: 0ms">
            <div class="stat-card-header">
              <span class="stat-card-label">盘点单总数</span>
              <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)">
                <Icon name="clipboardCheck" :size="14" />
              </div>
            </div>
            <div class="stat-card-value">{{ store.totalOrders }}</div>
          </div>
          <div class="stat-card" style="animation-delay: 60ms">
            <div class="stat-card-header">
              <span class="stat-card-label">盘点中</span>
              <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)">
                <Icon name="edit" :size="14" />
              </div>
            </div>
            <div class="stat-card-value">{{ store.executingCount }}</div>
          </div>
          <div class="stat-card" style="animation-delay: 120ms">
            <div class="stat-card-header">
              <span class="stat-card-label">待审核</span>
              <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)">
                <Icon name="clock" :size="14" />
              </div>
            </div>
            <div class="stat-card-value">
              <span class="stat-dot-halo" style="background: var(--color-warning)"></span>
              {{ store.diffReviewCount }}
            </div>
          </div>
          <div class="stat-card" style="animation-delay: 180ms">
            <div class="stat-card-header">
              <span class="stat-card-label">已完成</span>
              <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)">
                <Icon name="checkCircle" :size="14" />
              </div>
            </div>
            <div class="stat-card-value">{{ store.completedCount }}</div>
          </div>
        </div>

        <!-- 概览面板：盘点完成率 + 差异分布 + 近7日趋势 -->
        <div class="stocktaking-overview-row">
          <div class="overview-card overview-ring-card">
            <div class="overview-card-title">盘点完成率</div>
            <div class="overview-ring-body">
              <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
                <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
                <circle
                  cx="36"
                  cy="36"
                  r="26"
                  fill="none"
                  :stroke="completionRateColor"
                  stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="completionRateDash"
                  stroke-dashoffset="0"
                  transform="rotate(-90 36 36)"
                  class="overview-ring-progress"
                />
              </svg>
              <div class="overview-ring-text">
                <span class="overview-ring-percent" :style="{ color: completionRateColor }">{{ completionRate }}%</span>
                <span class="overview-ring-sub">已完成/总数</span>
              </div>
            </div>
          </div>
          <div class="overview-card overview-diff-card">
            <div class="overview-card-title">盘点差异分布</div>
            <div class="diff-bars">
              <div class="diff-bar-item">
                <span class="diff-bar-label" style="color: var(--color-success)">盘盈</span>
                <div class="diff-bar-track">
                  <div
                    class="diff-bar-fill"
                    style="background: var(--color-success)"
                    :style="{ width: diffPercent.profit + '%' }"
                  ></div>
                </div>
                <span class="diff-bar-count">{{ diffStats.profitCount }}</span>
              </div>
              <div class="diff-bar-item">
                <span class="diff-bar-label" style="color: var(--color-danger)">盘亏</span>
                <div class="diff-bar-track">
                  <div
                    class="diff-bar-fill"
                    style="background: var(--color-danger)"
                    :style="{ width: diffPercent.loss + '%' }"
                  ></div>
                </div>
                <span class="diff-bar-count">{{ diffStats.lossCount }}</span>
              </div>
              <div class="diff-bar-item">
                <span class="diff-bar-label" style="color: var(--color-info)">一致</span>
                <div class="diff-bar-track">
                  <div
                    class="diff-bar-fill"
                    style="background: var(--color-info)"
                    :style="{ width: diffPercent.match + '%' }"
                  ></div>
                </div>
                <span class="diff-bar-count">{{ diffStats.matchCount }}</span>
              </div>
            </div>
            <div class="diff-amount-row">
              <span class="diff-amount-item">
                <span class="diff-amount-label">盘盈金额</span>
                <span class="diff-amount-val" style="color: var(--color-success)">
                  {{ formatAmount(diffStats.profitAmount) }}
                </span>
              </span>
              <span class="diff-amount-item">
                <span class="diff-amount-label">盘亏金额</span>
                <span class="diff-amount-val" style="color: var(--color-danger)">
                  {{ formatAmount(diffStats.lossAmount) }}
                </span>
              </span>
            </div>
          </div>
          <div class="overview-card overview-trend-card">
            <div class="overview-card-title">近7日盘点趋势</div>
            <div class="trend-bars">
              <div v-for="(d, idx) in recent7Days" :key="idx" class="trend-bar-col">
                <div class="trend-bar-track-v">
                  <div
                    class="trend-bar-fill-v"
                    :style="{
                      height: d.percent + '%',
                      background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)'
                    }"
                  ></div>
                </div>
                <span class="trend-bar-day">{{ d.dayLabel }}</span>
                <span class="trend-bar-num">{{ d.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar" style="margin-bottom: var(--space-3)">
      <select v-model="stocktakingStatusFilter" class="form-select" style="width: auto; min-width: 120px">
        <option value="">全部状态</option>
        <option value="planned">计划中</option>
        <option value="executing">盘点中</option>
        <option value="diff_review">差异审核</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
    </div>

    <!-- 待处理预警 -->
    <div v-if="pendingAlerts.length > 0" class="panel-card stocktaking-alert-panel">
      <div class="panel-card-header">
        <span class="panel-card-title" style="color: var(--color-warning)">
          <span class="alert-dot-pulse"></span>
          待处理预警
        </span>
      </div>
      <div class="panel-card-body">
        <div
          v-for="(a, idx) in pendingAlerts"
          :key="a.id"
          class="stocktaking-alert-item"
          :style="{ animationDelay: idx * 60 + 'ms' }"
        >
          <span class="stocktaking-alert-badge" :class="'alert-' + a.status">{{ STATUS_LABELS[a.status] }}</span>
          <span class="stocktaking-alert-no">{{ a.orderNo }}</span>
          <span class="stocktaking-alert-type">{{ TYPE_LABELS[a.type] }}</span>
          <span class="stocktaking-alert-warehouse">{{ a.warehouseName }}</span>
          <span class="stocktaking-alert-date">{{ a.plannedDate }}</span>
          <button class="btn btn-ghost btn-sm" @click="handleAlertAction(a)">
            {{ a.status === 'executing' ? '录入' : '审批' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 盘点单列表 -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">盘点单列表</span>
      </div>
      <div class="panel-card-body no-padding">
        <StocktakingList
          :external-status-filter="stocktakingStatusFilter"
          @start="handleStart"
          @execute="handleExecute"
          @complete="handleComplete"
          @diff="handleDiff"
          @adjust="handleAdjust"
        />
      </div>
    </div>

    <!-- 新增盘点单弹窗 -->
    <StocktakingFormModal v-if="showFormModal" @close="showFormModal = false" @created="handleCreated" />

    <!-- 盘点执行弹窗 -->
    <StocktakingExecute
      v-if="executingOrder"
      :order="executingOrder"
      @close="executingOrder = null"
      @completed="handleExecCompleted"
    />

    <!-- 差异处理弹窗 -->
    <StocktakingDiff
      v-if="diffOrder"
      :order="diffOrder"
      @close="diffOrder = null"
      @reviewed="handleReviewed"
      @adjusted="handleAdjusted"
    />

    <!-- 确认弹窗 -->
    <div v-if="confirmVisible" class="modal-overlay" style="z-index: var(--z-toast)">
      <div class="modal-dialog" style="max-width: 400px">
        <div class="modal-header">
          <span class="modal-title">{{ confirmTitle }}</span>
        </div>
        <div class="modal-body" style="text-align: center">
          <div class="confirm-icon-circle"><Icon name="warning" :size="24" /></div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary)">{{ confirmMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="confirmVisible = false">取消</button>
          <button class="btn btn-primary" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>

    <!-- Toast提示 -->
    <div v-if="toastMessage" class="toast-container">
      <div class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'StocktakingManagement' }
</script>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStocktakingStore } from '@/modules/warehouse/stores/stocktaking'
import StocktakingList from '@/modules/warehouse/components/inventory/StocktakingList.vue'
import StocktakingFormModal from '@/modules/warehouse/components/inventory/StocktakingFormModal.vue'
import StocktakingExecute from '@/modules/warehouse/components/inventory/StocktakingExecute.vue'
import StocktakingDiff from '@/modules/warehouse/components/inventory/StocktakingDiff.vue'

const store = useStocktakingStore()

const TYPE_LABELS = { full: '全盘', partial: '抽盘', cycle: '循环盘点' }
const STATUS_LABELS = {
  planned: '计划中',
  executing: '盘点中',
  diff_review: '差异审核',
  completed: '已完成',
  cancelled: '已取消'
}

const showFormModal = ref(false)
const executingOrder = ref(null)
const diffOrder = ref(null)
const showStocktakingStatsExpanded = ref(false)
const stocktakingStatusFilter = ref('')

const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmCallback = null

const toastMessage = ref('')
const toastType = ref('toast-success')
let _toastTimer = null

function showToast(msg, type = 'toast-success') {
  toastMessage.value = msg
  toastType.value = type
  if (_toastTimer) clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
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

/* ====== 概览面板计算 ====== */

/* 盘点完成率 */
const completionRate = computed(() => {
  const total = store.totalOrders
  if (total === 0) return 0
  return Math.round((store.completedCount / total) * 100)
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

/* 差异分布 */
const diffStats = computed(() => {
  let profitCount = 0,
    matchCount = 0
  let profitAmount = 0,
    lossAmount = 0
  for (const order of store.stocktakingOrders || []) {
    if (order.summary) {
      const diffItems = order.summary.diffItems || 0
      const countedItems = order.summary.countedItems || 0
      /* 差异项中：盘盈项和盘亏项按实际差异数据计算 */
      profitCount += diffItems
      matchCount += Math.max(0, countedItems - diffItems)
      profitAmount += order.summary.profitAmount || 0
      lossAmount += order.summary.lossAmount || 0
    }
  }
  /* 盘亏项数量 = 总差异项中盘亏的比例，通过金额比例推算 */
  const totalDiffAmount = profitAmount + lossAmount
  if (totalDiffAmount > 0 && profitCount > 0) {
    const adjustedLossCount = Math.round(profitCount * (lossAmount / totalDiffAmount))
    const adjustedProfitCount = profitCount - adjustedLossCount
    return {
      profitCount: adjustedProfitCount,
      lossCount: adjustedLossCount,
      matchCount,
      profitAmount,
      lossAmount
    }
  }

  return { profitCount, lossCount: 0, matchCount, profitAmount, lossAmount }
})
const diffPercent = computed(() => {
  const total = diffStats.value.profitCount + diffStats.value.lossCount + diffStats.value.matchCount
  if (total === 0) return { profit: 0, loss: 0, match: 100 }
  return {
    profit: Math.round((diffStats.value.profitCount / total) * 100),
    loss: Math.round((diffStats.value.lossCount / total) * 100),
    match: Math.round((diffStats.value.matchCount / total) * 100)
  }
})

/* 近7日盘点趋势 */
const recent7Days = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const count = (store.stocktakingOrders || []).filter(
      (o) => o.plannedDate === ds || (o.createDate && o.createDate.startsWith(ds))
    ).length
    days.push({
      date: ds,
      dayLabel: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      count,
      percent: 0
    })
  }
  const max = Math.max(...days.map((d) => d.count), 1)
  days.forEach((d) => {
    d.percent = Math.round((d.count / max) * 100)
  })
  return days
})

/* 待处理预警 */
const pendingAlerts = computed(() => {
  return (store.stocktakingOrders || [])
    .filter((o) => o.status === 'executing' || o.status === 'diff_review')
    .sort((a, b) => {
      const dateA = a.plannedDate ? new Date(a.plannedDate) : new Date('9999-12-31')
      const dateB = b.plannedDate ? new Date(b.plannedDate) : new Date('9999-12-31')
      return dateA - dateB
    })
    .slice(0, 5)
})

function handleAlertAction(order) {
  if (order.status === 'executing') {
    executingOrder.value = order
  } else if (order.status === 'diff_review') {
    diffOrder.value = order
  }
}

function formatAmount(val) {
  const n = parseFloat(val) || 0
  return n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}

function handleStart(order) {
  showConfirm('开始盘点', '确认开始盘点？开始后将进入盘点执行阶段。', () => {
    store.startStocktaking(order.id)
    showToast('盘点已开始')
  })
}

function handleExecute(order) {
  executingOrder.value = order
}

function handleComplete(order) {
  showConfirm('完成盘点', '确认完成盘点？请确保所有物料已录入实盘数量。', () => {
    const result = store.completeStocktaking(order.id)
    if (result) {
      showToast('盘点已完成，进入差异审核')
    } else {
      showToast('请先录入所有物料的实盘数量', 'toast-warning')
    }
  })
}

function handleDiff(order) {
  diffOrder.value = order
}

function handleAdjust(order) {
  diffOrder.value = order
}

function handleCreated() {
  showFormModal.value = false
  showToast('盘点单已创建')
}

function handleExecCompleted() {
  executingOrder.value = null
  showToast('盘点已完成，进入差异审核')
}

function handleReviewed() {
  diffOrder.value = null
  showToast('差异审批完成')
}

function handleAdjusted(result) {
  diffOrder.value = null
  showToast(`库存调整完成，调整了 ${result.adjustedCount} 项物料`)
}

onUnmounted(() => {
  if (_toastTimer) clearTimeout(_toastTimer)
})
</script>

<style scoped>
.stocktaking-page {
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
.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
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
@keyframes statCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.stat-card-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 700;
  font-size: var(--font-size-2xl);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.stat-dot-halo {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: alertDotPulse 1.5s ease-in-out infinite;
}
@keyframes alertDotPulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
  }
}

/* ====== 概览面板 ====== */
.stocktaking-overview-row {
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
.overview-card:nth-child(1) {
  animation-delay: 0ms;
}
.overview-card:nth-child(2) {
  animation-delay: 80ms;
}
.overview-card:nth-child(3) {
  animation-delay: 160ms;
}
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
.overview-ring-svg {
  flex-shrink: 0;
}
.overview-ring-progress {
  transition: stroke-dasharray 0.6s ease;
}
.overview-ring-text {
  display: flex;
  flex-direction: column;
}
.overview-ring-percent {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
}
.overview-ring-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
}

/* 差异分布条形图 */
.diff-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.diff-bar-item {
  display: grid;
  grid-template-columns: 36px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.diff-bar-label {
  font-weight: 500;
}
.diff-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.diff-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.diff-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}
.diff-amount-row {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
.diff-amount-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.diff-amount-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
}
.diff-amount-val {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

/* 近7日趋势柱状图 */
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
  height: 80px;
  padding-top: var(--space-1);
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
  margin-top: var(--space-1);
}
.trend-bar-num {
  font-size: 10px;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* ====== 待处理预警 ====== */
.stocktaking-alert-panel {
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
  margin-right: var(--space-1);
}
.stocktaking-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.stocktaking-alert-item:last-child {
  border-bottom: none;
}
@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.stocktaking-alert-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.stocktaking-alert-badge.alert-executing {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.stocktaking-alert-badge.alert-diff_review {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.stocktaking-alert-no {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.stocktaking-alert-type {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.stocktaking-alert-warehouse {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.stocktaking-alert-date {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  margin-left: auto;
}

/* ====== 确认弹窗圆形图标 ====== */
.confirm-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-warning-subtle, rgba(245, 158, 11, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
  color: var(--color-warning);
}

@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .stocktaking-overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .stats-grid-4 {
    grid-template-columns: 1fr;
  }
}
</style>
