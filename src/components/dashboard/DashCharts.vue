<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="trendUp" :size="14" />
          销售/回款趋势（近12月）
        </span>
        <select v-model="chartMode" class="form-select" style="width: auto; min-width: 100px">
          <option value="monthly">按月</option>
          <option value="quarterly">按季</option>
          <option value="yearly">按年</option>
        </select>
      </div>
      <div class="panel-card-body">
        <div class="chart-container">
          <canvas ref="salesChartRef"></canvas>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="table" :size="14" />
          库存分布
        </span>
      </div>
      <div class="panel-card-body">
        <div class="chart-container">
          <canvas ref="inventoryChartRef"></canvas>
        </div>
      </div>
    </div>
  </div>

  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="dollar" :size="14" />
          回款趋势（近6月）
        </span>
      </div>
      <div class="panel-card-body">
        <div class="chart-container">
          <canvas ref="collectionTrendChartRef"></canvas>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">
          <Icon name="trophy" :size="14" />
          客户贡献 TOP5
        </span>
      </div>
      <div class="panel-card-body">
        <div class="top-customers">
          <div
            v-for="(customer, idx) in topCustomers"
            :key="customer.id"
            class="top-customer-item"
            :style="{ animationDelay: idx * 100 + 'ms' }"
          >
            <div class="top-rank" :class="'rank-' + (idx + 1)">
              <span v-if="idx < 3" class="top-rank-star">&#9733;</span>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="top-info">
              <div class="top-name">{{ customer.name }}</div>
              <div class="top-bar-container">
                <div class="top-bar" :style="{ width: customer.percentage + '%', background: barGradient(idx) }">
                  <div class="top-bar-shine"></div>
                </div>
              </div>
            </div>
            <div class="top-amount">¥{{ formatNumber(customer.balance) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DashCharts' }
</script>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useCustomerStore } from '@/modules/customer/stores/customer'
let Chart = null
import { ensureChartJs } from '@/utils/chartjsHelper'

const contractStore = useContractStore()
const inventoryStore = useInventoryStore()
const collectionStore = useCollectionStore()
const customerStore = useCustomerStore()

const chartMode = ref('monthly')
const salesChartRef = ref(null)
const inventoryChartRef = ref(null)
const collectionTrendChartRef = ref(null)
let salesChart = null
let inventoryChart = null
let collectionTrendChart = null
let isMounted = false

// 保留本地版本：未指定小数位数（由浏览器自动决定），与全局 formatNumber 固定2位小数不同
function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

const topCustomers = computed(() => {
  const sorted = [...customerStore.customers]
    .filter((c) => c.status === 'active')
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxBalance = sorted.length > 0 ? sorted[0].balance : 1
  return sorted.map((c) => ({
    ...c,
    percentage: Math.round((c.balance / maxBalance) * 100)
  }))
})

function barGradient(idx) {
  const gradients = [
    'linear-gradient(90deg, #fbbf24, #f59e0b)',
    'linear-gradient(90deg, #94a3b8, #64748b)',
    'linear-gradient(90deg, #d97706, #b45309)',
    'linear-gradient(90deg, #3b82f6, #2563eb)',
    'linear-gradient(90deg, #3b82f6, #2563eb)'
  ]
  return gradients[idx] || gradients[3]
}

/** 统一深色主题配置 */
const darkScales = {
  x: {
    ticks: { color: '#64748b', font: { size: 10 } },
    grid: { color: 'rgba(51, 65, 85, 0.2)', drawBorder: false },
    border: { display: false }
  },
  y: {
    ticks: { color: '#64748b', font: { size: 10 } },
    grid: { color: 'rgba(51, 65, 85, 0.2)', drawBorder: false },
    border: { display: false }
  }
}

const darkTooltip = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  titleColor: 'rgba(255, 255, 255, 0.95)',
  bodyColor: 'rgba(255, 255, 255, 0.85)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: 1,
  cornerRadius: 8,
  padding: 12,
  displayColors: true,
  boxWidth: 8,
  boxHeight: 8
}

function initSalesChart() {
  if (!salesChartRef.value || !Chart) return
  if (salesChart) salesChart.destroy()

  const ma = contractStore.monthlyAmounts
  const monthlyMap = {}
  ma.forEach((m) => {
    monthlyMap[m.month] = m.amount
  })

  let labels, salesData, collectionData

  if (chartMode.value === 'quarterly') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const now = new Date()
    const year = now.getFullYear()
    salesData = quarters.map((_, i) => {
      let sum = 0
      for (let m = i * 3 + 1; m <= i * 3 + 3; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        sum += monthlyMap[key] || 0
      }
      return Math.round(sum / 10000)
    })
    collectionData = quarters.map((_, i) => {
      let sum = 0
      for (let m = i * 3 + 1; m <= i * 3 + 3; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`
        sum += (monthlyMap[key] || 0) * 0.85
      }
      return Math.round(sum / 10000)
    })
    labels = quarters
  } else if (chartMode.value === 'yearly') {
    const yearSet = new Set(ma.map((m) => m.month.slice(0, 4)))
    const years = [...yearSet].sort()
    salesData = years.map((y) => {
      let sum = 0
      ma.forEach((m) => {
        if (m.month.startsWith(y)) sum += m.amount
      })
      return Math.round(sum / 10000)
    })
    collectionData = years.map((y) => {
      let sum = 0
      ma.forEach((m) => {
        if (m.month.startsWith(y)) sum += m.amount * 0.85
      })
      return Math.round(sum / 10000)
    })
    labels = years
  } else {
    labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const now = new Date()
    const year = now.getFullYear()
    salesData = labels.map((_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      return Math.round((monthlyMap[key] || 0) / 10000)
    })
    collectionData = labels.map((_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      return Math.round(((monthlyMap[key] || 0) * 0.85) / 10000)
    })
  }

  const ctx = salesChartRef.value.getContext('2d')
  const salesGradient = ctx.createLinearGradient(0, 0, 0, 300)
  salesGradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)')
  salesGradient.addColorStop(1, 'rgba(59, 130, 246, 0.3)')

  const collectionGradient = ctx.createLinearGradient(0, 0, 0, 300)
  collectionGradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)')
  collectionGradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)')

  salesChart = new Chart(salesChartRef.value, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          backgroundColor: salesGradient,
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: '回款额(万)',
          data: collectionData,
          backgroundColor: collectionGradient,
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, pointStyle: 'rectRounded' } },
        tooltip: darkTooltip
      },
      scales: darkScales
    }
  })
}

function initInventoryChart() {
  if (!inventoryChartRef.value || !Chart) return
  if (inventoryChart) inventoryChart.destroy()

  const categories = {}
  inventoryStore.enrichedInventory.forEach((item) => {
    if (!categories[item.category]) categories[item.category] = 0
    categories[item.category] += item.stock
  })

  const labels = Object.keys(categories)
  const data = Object.values(categories)
  const colors = [
    'rgba(59, 130, 246, 0.85)',
    'rgba(34, 197, 94, 0.85)',
    'rgba(245, 158, 11, 0.85)',
    'rgba(168, 85, 247, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(6, 182, 212, 0.85)'
  ]
  const hoverColors = [
    'rgba(59, 130, 246, 1)',
    'rgba(34, 197, 94, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(6, 182, 212, 1)'
  ]

  inventoryChart = new Chart(inventoryChartRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          hoverBackgroundColor: hoverColors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 12,
          spacing: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1200 },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' }
        },
        tooltip: darkTooltip
      }
    }
  })
}

function initCollectionTrendChart() {
  if (!collectionTrendChartRef.value || !Chart) return
  if (collectionTrendChart) collectionTrendChart.destroy()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const labels = []
  const data = []
  for (let i = 5; i >= 0; i--) {
    const m = month - i
    const d = new Date(year, m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    labels.push(`${d.getMonth() + 1}月`)
    let sum = 0
    collectionStore.collections
      .filter(
        (c) =>
          c.status !== 'voided' &&
          (c.status === 'confirmed' || c.status === 'completed') &&
          c.date &&
          c.date.startsWith(key)
      )
      .forEach((c) => {
        sum += parseFloat(c.amount) || 0
      })
    data.push(Math.round(sum / 10000))
  }

  const ctx = collectionTrendChartRef.value.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 250)
  gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)')
  gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')

  collectionTrendChart = new Chart(collectionTrendChartRef.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '回款额(万)',
          data,
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: darkTooltip
      },
      scales: darkScales,
      interaction: { intersect: false, mode: 'index' }
    }
  })
}

function refreshCharts() {
  if (!isMounted) return
  nextTick(() => {
    initSalesChart()
    initInventoryChart()
    initCollectionTrendChart()
  })
}

onMounted(async () => {
  isMounted = true
  Chart = await ensureChartJs()
  if (!isMounted) return
  await nextTick()
  if (!isMounted) return
  if (!Chart) return
  initSalesChart()
  initInventoryChart()
  initCollectionTrendChart()
})

watch(chartMode, () => {
  if (!Chart) return
  nextTick(() => initSalesChart())
})

onBeforeUnmount(() => {
  isMounted = false
  try {
    if (salesChart) salesChart.destroy()
  } catch (e) {
    /* ignore */
  }
  try {
    if (inventoryChart) inventoryChart.destroy()
  } catch (e) {
    /* ignore */
  }
  try {
    if (collectionTrendChart) collectionTrendChart.destroy()
  } catch (e) {
    /* ignore */
  }
  salesChart = null
  inventoryChart = null
  collectionTrendChart = null
})

defineExpose({ refreshCharts })
</script>

<style scoped>
.top-customers {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@keyframes topSlideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.top-customer-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background 0.2s;
  animation: topSlideIn 0.5s ease-out both;
}

.top-customer-item:hover {
  background: var(--color-bg-tertiary);
}

.top-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.top-rank.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1a1f36;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.3);
}

.top-rank.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: #1a1f36;
  box-shadow: 0 0 8px rgba(148, 163, 184, 0.2);
}

.top-rank.rank-3 {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #1a1f36;
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.2);
}

.top-rank-star {
  font-size: 14px;
}

.top-info {
  flex: 1;
  min-width: 0;
}

.top-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.top-bar-container {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.top-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

.top-bar-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  animation: barShine 3s ease-in-out infinite;
}

@keyframes barShine {
  0% {
    left: -100%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: 100%;
  }
}

.top-amount {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
  flex-shrink: 0;
}
</style>
