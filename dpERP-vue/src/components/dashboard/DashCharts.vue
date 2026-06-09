<template>
  <div class="content-grid content-grid-2">
    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="trendUp" :size="14" /> 销售/回款趋势（近12月）</span>
        <select class="form-select" style="width:auto;min-width:100px" v-model="chartMode">
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
        <span class="panel-card-title"><Icon name="table" :size="14" /> 库存分布</span>
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
        <span class="panel-card-title"><Icon name="dollar" :size="14" /> 回款趋势（近6月）</span>
      </div>
      <div class="panel-card-body">
        <div class="chart-container">
          <canvas ref="collectionTrendChartRef"></canvas>
        </div>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">[奖杯] 客户贡献 TOP5</span>
      </div>
      <div class="panel-card-body">
        <div class="top-customers">
          <div v-for="(customer, idx) in topCustomers" :key="customer.id" class="top-customer-item">
            <div class="top-rank" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</div>
            <div class="top-info">
              <div class="top-name">{{ customer.name }}</div>
              <div class="top-bar-container">
                <div class="top-bar" :style="{ width: customer.percentage + '%' }"></div>
              </div>
            </div>
            <div class="top-amount">¥{{ formatNumber(customer.balance) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useContractStore } from '@/stores/contract'
import { useInventoryStore } from '@/stores/inventory'
import { useCollectionStore } from '@/stores/collection'
import { useCustomerStore } from '@/stores/customer'
import Chart from 'chart.js/auto'

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

function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN')
}

const topCustomers = computed(() => {
  const sorted = [...customerStore.customers]
    .filter(c => c.status === 'active')
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxBalance = sorted.length > 0 ? sorted[0].balance : 1
  return sorted.map(c => ({
    ...c,
    percentage: Math.round((c.balance / maxBalance) * 100)
  }))
})

function initSalesChart() {
  if (!salesChartRef.value) return
  if (salesChart) salesChart.destroy()

  const ma = contractStore.monthlyAmounts
  const monthlyMap = {}
  ma.forEach(m => { monthlyMap[m.month] = m.amount })

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
    const yearSet = new Set(ma.map(m => m.month.slice(0, 4)))
    const years = [...yearSet].sort()
    salesData = years.map(y => {
      let sum = 0
      ma.forEach(m => { if (m.month.startsWith(y)) sum += m.amount })
      return Math.round(sum / 10000)
    })
    collectionData = years.map(y => {
      let sum = 0
      ma.forEach(m => { if (m.month.startsWith(y)) sum += m.amount * 0.85 })
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
      return Math.round((monthlyMap[key] || 0) * 0.85 / 10000)
    })
  }

  salesChart = new Chart(salesChartRef.value, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '销售额(万)',
          data: salesData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '回款额(万)',
          data: collectionData,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        y: {
          ticks: { color: '#64748b', font: { size: 10 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        }
      }
    }
  })
}

function initInventoryChart() {
  if (!inventoryChartRef.value) return
  if (inventoryChart) inventoryChart.destroy()

  const categories = {}
  inventoryStore.enrichedInventory.forEach(item => {
    if (!categories[item.category]) categories[item.category] = 0
    categories[item.category] += item.stock
  })

  const labels = Object.keys(categories)
  const data = Object.values(categories)
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(6, 182, 212, 0.8)'
  ]

  inventoryChart = new Chart(inventoryChartRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 }
        }
      }
    }
  })
}

function initCollectionTrendChart() {
  if (!collectionTrendChartRef.value) return
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
      .filter(c => c.status !== 'voided' && (c.status === 'confirmed' || c.status === 'completed') && c.date && c.date.startsWith(key))
      .forEach(c => { sum += parseFloat(c.amount) || 0 })
    data.push(Math.round(sum / 10000))
  }

  collectionTrendChart = new Chart(collectionTrendChartRef.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '回款额(万)',
        data,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
        y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
      }
    }
  })
}

function refreshCharts() {
  nextTick(() => {
    initSalesChart()
    initInventoryChart()
    initCollectionTrendChart()
  })
}

onMounted(() => {
  nextTick(() => {
    initSalesChart()
    initInventoryChart()
    initCollectionTrendChart()
  })
})

watch(chartMode, () => {
  nextTick(() => initSalesChart())
})

onBeforeUnmount(() => {
  try { if (salesChart) salesChart.destroy() } catch (e) { /* ignore */ }
  try { if (inventoryChart) inventoryChart.destroy() } catch (e) { /* ignore */ }
  try { if (collectionTrendChart) collectionTrendChart.destroy() } catch (e) { /* ignore */ }
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
.top-customer-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.top-rank {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.top-rank.rank-1 { background: #fbbf24; color: #1a1f36; }
.top-rank.rank-2 { background: #94a3b8; color: #1a1f36; }
.top-rank.rank-3 { background: #d97706; color: #1a1f36; }
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
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.top-bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 500ms ease;
}
.top-amount {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
  flex-shrink: 0;
}
</style>
