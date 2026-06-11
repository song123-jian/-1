<template>
  <div class="dash-highlight-grid stats-grid-4">
    <div
      v-for="(card, idx) in highlightCards"
      :key="idx"
      class="dash-stat-card"
      :style="{ '--card-color': card.color }"
    >
      <div class="dash-stat-card__glow"></div>
      <div class="dash-stat-card__icon" :style="{ background: card.color + '18', color: card.color }">
        <Icon :name="card.icon" :size="18" />
      </div>
      <div class="dash-stat-card__content">
        <div class="dash-stat-label">{{ card.label }}</div>
        <div class="dash-stat-value" :style="{ color: card.color }">
          <span v-if="card.prefix" class="dash-stat-prefix">{{ card.prefix }}</span>
          <span class="dash-stat-number">{{ card.displayValue }}</span>
          <span v-if="card.suffix" class="dash-stat-suffix">{{ card.suffix }}</span>
        </div>
        <div class="dash-stat-sub">
          <span v-if="card.change !== undefined" class="dash-stat-change" :class="card.change >= 0 ? 'up' : 'down'">
            <Icon :name="card.change >= 0 ? 'chevronUp' : 'chevronDown'" :size="12" />
            {{ Math.abs(card.change) }}%
          </span>
          <span class="dash-stat-sub-text">{{ card.subText }}</span>
        </div>
      </div>
      <div class="dash-stat-card__ring" v-if="card.ringPercent !== undefined">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" :stroke="card.color + '20'" stroke-width="4" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            :stroke="card.color"
            stroke-width="4"
            stroke-linecap="round"
            :stroke-dasharray="ringDash(card.ringPercent)"
            stroke-dashoffset="0"
            transform="rotate(-90 24 24)"
            class="dash-stat-ring-progress"
          />
        </svg>
        <span class="dash-stat-ring-label" :style="{ color: card.color }">{{ card.ringPercent }}%</span>
      </div>
    </div>
  </div>

  <div class="stats-row stats-grid-7">
    <div
      v-for="(stat, idx) in statCards"
      :key="stat.label"
      class="stat-card"
      :style="{ animationDelay: idx * 60 + 'ms' }"
    >
      <div class="stat-card-header">
        <div class="stat-card-icon" :style="{ background: stat.bgColor, color: stat.color }">
          <Icon :name="stat.icon" :size="14" />
        </div>
      </div>
      <div class="stat-card-value">{{ stat.value }}</div>
      <div class="stat-card-label">{{ stat.label }}</div>
      <div class="stat-card-change" :style="{ color: stat.changeColor || 'var(--color-text-tertiary)' }">{{ stat.change }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  totalRevenue: { type: Number, default: 0 },
  revenueGrowth: { type: Number, default: 0 },
  collectionRate: { type: Number, default: 0 },
  monthCollected: { type: Number, default: 0 },
  quotationStore: { type: Object, required: true },
  contractStore: { type: Object, required: true },
  inventoryStore: { type: Object, required: true },
  todoStore: { type: Object, required: true },
  statCards: { type: Array, default: () => [] },
  formatNumber: { type: Function, required: true }
})

const CIRCUMFERENCE = 2 * Math.PI * 20

function ringDash(percent) {
  const p = Math.min(Math.max(percent, 0), 100)
  return `${(p / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`
}

/** 高亮卡片数据 */
const highlightCards = computed(() => [
  {
    label: '本月营收',
    value: props.totalRevenue,
    displayValue: refValues.revenue.value,
    prefix: '¥',
    icon: 'trendUp',
    color: '#3b82f6',
    change: props.revenueGrowth,
    subText: '较上月',
    ringPercent: undefined
  },
  {
    label: '回款率',
    value: props.collectionRate,
    displayValue: refValues.rate.value,
    suffix: '%',
    icon: 'dollar',
    color: '#22c55e',
    subText: '本月回款: ¥' + props.formatNumber(props.monthCollected),
    ringPercent: props.collectionRate
  },
  {
    label: '待处理',
    value: props.quotationStore.pendingCount + props.contractStore.pendingApprovalCount,
    displayValue: refValues.pending.value,
    icon: 'clock',
    color: '#f59e0b',
    subText: props.quotationStore.pendingCount + ' 报价 / ' + props.contractStore.pendingApprovalCount + ' 合同',
    ringPercent: undefined
  },
  {
    label: '预警',
    value: props.inventoryStore.lowStockCount + props.inventoryStore.exhaustedCount + props.todoStore.stats.overdue,
    displayValue: refValues.alert.value,
    icon: 'alertCircle',
    color: '#ef4444',
    subText: (props.inventoryStore.lowStockCount + props.inventoryStore.exhaustedCount) + ' 低库存 / ' + props.todoStore.stats.overdue + ' 逾期',
    ringPercent: undefined
  }
])

/** 数字滚动动画 */
const refValues = {
  revenue: ref('0'),
  rate: ref('0'),
  pending: ref('0'),
  alert: ref('0')
}

let animFrames = {}

function animateNum(key, from, to, duration, formatter) {
  if (animFrames[key]) cancelAnimationFrame(animFrames[key])
  const startTime = performance.now()
  const diff = to - from

  function step(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
    const current = from + diff * eased
    refValues[key].value = formatter(current)
    if (progress < 1) {
      animFrames[key] = requestAnimationFrame(step)
    }
  }

  animFrames[key] = requestAnimationFrame(step)
}

function formatRevenue(v) {
  return Math.round(v).toLocaleString('zh-CN')
}

function formatRate(v) {
  return Math.round(v).toString()
}

function formatInt(v) {
  return Math.round(v).toString()
}

watch(() => props.totalRevenue, (newVal) => {
  const from = parseInt(String(refValues.revenue.value).replace(/,/g, '')) || 0
  animateNum('revenue', from, newVal, 1000, formatRevenue)
}, { immediate: false })

watch(() => props.collectionRate, (newVal) => {
  const from = parseInt(refValues.rate.value) || 0
  animateNum('rate', from, newVal, 800, formatRate)
}, { immediate: false })

watch(() => props.quotationStore.pendingCount + props.contractStore.pendingApprovalCount, (newVal) => {
  const from = parseInt(refValues.pending.value) || 0
  animateNum('pending', from, newVal, 600, formatInt)
}, { immediate: false })

watch(() => props.inventoryStore.lowStockCount + props.inventoryStore.exhaustedCount + props.todoStore.stats.overdue, (newVal) => {
  const from = parseInt(refValues.alert.value) || 0
  animateNum('alert', from, newVal, 600, formatInt)
}, { immediate: false })

onMounted(() => {
  animateNum('revenue', 0, props.totalRevenue, 1200, formatRevenue)
  animateNum('rate', 0, props.collectionRate, 1000, formatRate)
  animateNum('pending', 0, props.quotationStore.pendingCount + props.contractStore.pendingApprovalCount, 800, formatInt)
  animateNum('alert', 0, props.inventoryStore.lowStockCount + props.inventoryStore.exhaustedCount + props.todoStore.stats.overdue, 800, formatInt)
})

onUnmounted(() => {
  Object.values(animFrames).forEach(id => cancelAnimationFrame(id))
})
</script>

<style scoped>
.dash-highlight-grid {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.stats-grid-7 {
  grid-template-columns: repeat(7, 1fr);
}

/* 高亮卡片 */
.dash-stat-card {
  background: var(--color-surface-elevated);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--card-color, var(--color-accent));
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.dash-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.dash-stat-card__glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--card-color), transparent);
  opacity: 0.6;
}

.dash-stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dash-stat-card__content {
  flex: 1;
  min-width: 0;
}

.dash-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.dash-stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
  margin-bottom: var(--space-1);
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.dash-stat-prefix {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.dash-stat-suffix {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.dash-stat-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dash-stat-change {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: 600;
}

.dash-stat-change.up {
  color: var(--color-success);
}

.dash-stat-change.down {
  color: var(--color-danger);
}

/* 迷你进度环 */
.dash-stat-card__ring {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes ringDraw {
  from { stroke-dashoffset: 125.66; }
}

.dash-stat-ring-progress {
  animation: ringDraw 1.2s ease-out;
}

.dash-stat-ring-label {
  position: absolute;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
}

/* 7列小卡片 */
.stats-row {
  display: grid;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.stat-card {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: statCardIn 0.5s ease-out both;
}

@keyframes statCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.stat-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  margin-bottom: var(--space-1);
}

.stat-card-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}

.stat-card-change {
  font-size: var(--font-size-xs);
}

@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .stats-grid-7 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .stats-grid-7 { grid-template-columns: repeat(2, 1fr); }
}
</style>
