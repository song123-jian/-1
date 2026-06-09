<template>
  <div class="cost-page">
    <div v-if="!canView" class="access-denied">
      <div class="access-denied-icon"><Icon name="lock" :size="48" /></div>
      <div class="access-denied-title">访问受限</div>
      <div class="access-denied-desc">您没有成本核算的查看权限，请联系管理员开通。</div>
    </div>
    <template v-else>
    <div class="page-header">
      <div>
        <h2 class="page-header-title">成本核算</h2>
        <p class="page-header-subtitle">实际成本 vs 标准成本对比分析，颜色编码差异指示</p>
      </div>
      <div class="page-header-actions">
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
        <button v-if="canExport" class="btn btn-primary btn-sm" @click="exportCSV"><Icon name="upload" :size="14" /> 导出CSV</button>
        <span v-if="exportError" class="export-error-msg">{{ exportError }}</span>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card" style="animation-delay:0ms">
        <div class="stat-card-header">
          <span class="stat-card-label">实际总成本</span>
          <Icon name="wallet" :size="16" class="stat-card-icon" />
        </div>
        <div class="stat-card-value">¥{{ formatMoney(costStore.totalActual) }}</div>
      </div>
      <div class="stat-card" style="animation-delay:80ms">
        <div class="stat-card-header">
          <span class="stat-card-label">标准总成本</span>
          <Icon name="target" :size="16" class="stat-card-icon" />
        </div>
        <div class="stat-card-value">¥{{ formatMoney(costStore.totalStandard) }}</div>
      </div>
      <div class="stat-card" style="animation-delay:160ms">
        <div class="stat-card-header">
          <span class="stat-card-label">成本差异金额</span>
          <span class="pulse-dot" :class="costStore.totalVariance > 0 ? 'pulse-danger' : costStore.totalVariance < 0 ? 'pulse-success' : 'pulse-neutral'"></span>
        </div>
        <div class="stat-card-value" :style="{ color: costStore.totalVariance > 0 ? 'var(--color-danger)' : costStore.totalVariance < 0 ? 'var(--color-success)' : '' }">
          {{ costStore.totalVariance >= 0 ? '+¥' : '-¥' }}{{ formatMoney(Math.abs(costStore.totalVariance)) }}
        </div>
      </div>
      <div class="stat-card" style="animation-delay:240ms">
        <div class="stat-card-header">
          <span class="stat-card-label">差异率</span>
          <span class="pulse-dot" :class="costStore.varianceRate > 0 ? 'pulse-danger' : costStore.varianceRate < 0 ? 'pulse-success' : 'pulse-neutral'"></span>
        </div>
        <div class="stat-card-value" :style="{ color: costStore.varianceRate > 0 ? 'var(--color-danger)' : costStore.varianceRate < 0 ? 'var(--color-success)' : '' }">
          {{ costStore.varianceRate >= 0 ? '+' : '' }}{{ costStore.varianceRate.toFixed(2) }}%
        </div>
      </div>
    </div>

    <div class="overview-row">
      <div class="overview-card">
        <div class="overview-title">成本健康度</div>
        <div class="overview-content">
          <svg class="health-ring" viewBox="0 0 60 60">
            <circle class="health-ring-bg" cx="30" cy="30" r="26" />
            <circle class="health-ring-fill" cx="30" cy="30" r="26" :stroke-dasharray="healthRingDash" :stroke="healthRingColor" />
          </svg>
          <div class="health-text">
            <div class="health-percent" :style="{ color: healthRingColor }">{{ healthPercent }}%</div>
            <div class="health-label">{{ healthLabel }}</div>
          </div>
        </div>
      </div>
      <div class="overview-card">
        <div class="overview-title">成本状态分布</div>
        <div class="overview-content">
          <div class="status-stack">
            <div class="status-stack-bar">
              <div class="status-seg status-over" :style="{ width: statusPct.over + '%' }"></div>
              <div class="status-seg status-under" :style="{ width: statusPct.under + '%' }"></div>
              <div class="status-seg status-normal" :style="{ width: statusPct.normal + '%' }"></div>
            </div>
            <div class="status-legend">
              <span><span class="legend-dot" style="background:var(--color-danger)"></span>超预算 {{ statusPct.over }}%</span>
              <span><span class="legend-dot" style="background:var(--color-success)"></span>低于预算 {{ statusPct.under }}%</span>
              <span><span class="legend-dot" style="background:var(--color-warning)"></span>正常 {{ statusPct.normal }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="overview-card">
        <div class="overview-title">供应商成本 TOP5</div>
        <div class="overview-content">
          <div class="top5-list">
            <div v-for="(s, idx) in top5Suppliers" :key="s.supplierName" class="top5-item">
              <span class="top5-rank">{{ idx + 1 }}</span>
              <span class="top5-name" :title="s.supplierName">{{ s.supplierName }}</span>
              <div class="top5-bar-wrap">
                <div class="top5-bar" :style="{ width: s.pct + '%' }"></div>
              </div>
              <span class="top5-value">¥{{ formatMoney(s.actualCost) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:var(--space-4)">
      <select class="form-select" v-model="periodFilter" style="width:auto;min-width:100px">
        <option value="all">全部</option>
        <option value="month">本月</option>
        <option value="quarter">本季</option>
        <option value="year">本年</option>
      </select>
      <select class="form-select" v-model="supplierFilter" style="width:auto;min-width:140px">
        <option value="all">全部供应商</option>
        <option v-for="s in supplierOptions" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</option>
      </select>
      <button class="btn btn-secondary btn-sm" @click="resetFilters"><Icon name="refresh" :size="14" /> 刷新</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="columnVisible.purchaseNo">采购单号</th>
                <th v-if="columnVisible.supplier">供应商</th>
                <th v-if="columnVisible.date">日期</th>
                <th v-if="columnVisible.material">物料</th>
                <th v-if="columnVisible.quantity">数量</th>
                <th v-if="columnVisible.actualCost">实际成本</th>
                <th v-if="columnVisible.standardCost">标准成本</th>
                <th v-if="columnVisible.variance">差异金额</th>
                <th v-if="columnVisible.varianceRate">差异率</th>
                <th v-if="columnVisible.status">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRecords.length === 0">
                <td colspan="10" class="empty-state">
                  <div class="empty-state-circle"><Icon name="empty" :size="32" /></div>
                  <div class="empty-state-text">暂无成本数据</div>
                </td>
              </tr>
              <tr v-for="(r, idx) in filteredRecords" :key="r.id"
                :class="{ 'row-over-budget': r.variance > 0, 'row-under-budget': r.variance < 0, 'row-slide-in': true }"
                :style="{ animationDelay: (idx * 20) + 'ms' }">
                <td v-if="columnVisible.purchaseNo">{{ r.poNo || '-' }}</td>
                <td v-if="columnVisible.supplier">{{ r.supplierName || '-' }}</td>
                <td v-if="columnVisible.date">{{ r.date || '-' }}</td>
                <td v-if="columnVisible.material">{{ r.materialName || '-' }}</td>
                <td v-if="columnVisible.quantity">{{ r.quantity || 0 }}</td>
                <td v-if="columnVisible.actualCost" class="cell-mono">¥{{ formatMoney(r.actualCost) }}</td>
                <td v-if="columnVisible.standardCost" class="cell-mono">¥{{ formatMoney(r.standardCost) }}</td>
                <td v-if="columnVisible.variance">
                  <span :class="r.variance > 0 ? 'variance-positive' : r.variance < 0 ? 'variance-negative' : ''">
                    {{ r.variance >= 0 ? '+¥' : '-¥' }}{{ formatMoney(Math.abs(r.variance)) }}
                  </span>
                </td>
                <td v-if="columnVisible.varianceRate">
                  <span :class="r.variance > 0 ? 'variance-positive' : r.variance < 0 ? 'variance-negative' : ''">
                    {{ r.varianceRate >= 0 ? '+' : '' }}{{ (r.varianceRate || 0).toFixed(1) }}%
                  </span>
                </td>
                <td v-if="columnVisible.status">
                  <span class="status-badge" :class="costStore.statusBadgeMap[r.status] || 'neutral'">
                    {{ costStore.statusLabels[r.status] || r.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-top:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="trendUp" :size="14" /> 成本趋势</span></div>
        <div class="panel-card-body">
          <div v-if="monthlyTrend.length === 0" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4)">暂无数据</div>
          <div v-else class="trend-list">
            <div v-for="m in monthlyTrend" :key="m.period" class="trend-item">
              <div class="trend-period">{{ m.period }}</div>
              <div class="trend-bar-container">
                <div class="trend-bar actual bar-shimmer" :style="{ width: barWidth(m.actualCost) }">
                  <span class="trend-label">实际 ¥{{ formatMoney(m.actualCost) }}</span>
                </div>
                <div class="trend-bar standard bar-shimmer" :style="{ width: barWidth(m.standardCost) }">
                  <span class="trend-label">标准 ¥{{ formatMoney(m.standardCost) }}</span>
                </div>
              </div>
              <div class="trend-variance" :style="{ color: m.variance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }">
                {{ m.variance >= 0 ? '+' : '' }}¥{{ formatMoney(m.variance) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title"><Icon name="users" :size="14" /> 供应商成本分布</span></div>
        <div class="panel-card-body">
          <div v-if="supplierBreakdown.length === 0" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4)">暂无数据</div>
          <div v-else class="supplier-list">
            <div v-for="s in supplierBreakdown" :key="s.supplierName" class="supplier-item">
              <div class="supplier-name">{{ s.supplierName }}</div>
              <div class="supplier-stats">
                <span>实际: ¥{{ formatMoney(s.actualCost) }}</span>
                <span>标准: ¥{{ formatMoney(s.standardCost) }}</span>
                <span :style="{ color: s.variance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }">
                  差异: {{ s.variance >= 0 ? '+' : '' }}¥{{ formatMoney(s.variance) }}
                </span>
              </div>
              <div class="supplier-bar-container">
                <div class="supplier-bar bar-shimmer" :style="{ width: supplierBarWidth(s.actualCost), background: s.variance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCostStore } from '@/stores/cost'
import { useDataStore } from '@/stores/data'
import { usePermission } from '@/utils/permissionGuard'

const costStore = useCostStore()
const dataStore = useDataStore()
const perm = usePermission()

const canView = computed(() => perm.isAllowed('cost', 'costView'))
const canEdit = computed(() => perm.isAllowed('cost', 'costEdit'))
const canExport = computed(() => perm.isAllowed('cost', 'costExport'))

const exportError = ref('')
let exportErrorTimer = null

const columnDefs = [
  { key: 'purchaseNo', label: '采购单号' },
  { key: 'supplier', label: '供应商' },
  { key: 'date', label: '日期' },
  { key: 'material', label: '物料' },
  { key: 'quantity', label: '数量' },
  { key: 'actualCost', label: '实际成本' },
  { key: 'standardCost', label: '标准成本' },
  { key: 'variance', label: '差异金额' },
  { key: 'varianceRate', label: '差异率' },
  { key: 'status', label: '状态' }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => c.hideable !== false).map(c => [c.key, true])))
const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 8 + 'px', left: rect.left + 'px' }
  }
}

const periodFilter = ref('month')
const supplierFilter = ref('all')

const supplierOptions = computed(() => dataStore.suppliers || [])

const filteredRecords = computed(() => costStore.getFilteredRecords(periodFilter.value, supplierFilter.value))
const monthlyTrend = computed(() => costStore.getMonthlyTrend())
const supplierBreakdown = computed(() => costStore.getSupplierBreakdown())

const maxActual = computed(() => Math.max(...monthlyTrend.value.map(m => m.actualCost || 0), 1))

const healthPercent = computed(() => {
  const rate = Math.abs(costStore.varianceRate.value || 0)
  return Math.max(0, Math.min(100, Math.round(100 - rate)))
})
const healthRingDash = computed(() => {
  const r = 26
  const c = 2 * Math.PI * r
  const pct = healthPercent.value / 100
  return `${pct * c} ${c}`
})
const healthRingColor = computed(() => {
  const rate = Math.abs(costStore.varianceRate.value || 0)
  if (rate <= 5) return 'var(--color-success)'
  if (rate <= 15) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const healthLabel = computed(() => {
  const rate = Math.abs(costStore.varianceRate.value || 0)
  if (rate <= 5) return '健康'
  if (rate <= 15) return '关注'
  return '预警'
})

const statusPct = computed(() => {
  const list = costStore.records || []
  const total = list.length || 1
  const over = list.filter(r => (r.variance || 0) > 0).length
  const under = list.filter(r => (r.variance || 0) < 0).length
  const normal = list.filter(r => (r.variance || 0) === 0).length
  return {
    over: Math.round((over / total) * 100),
    under: Math.round((under / total) * 100),
    normal: Math.round((normal / total) * 100)
  }
})

const top5Suppliers = computed(() => {
  const list = [...(costStore.getSupplierBreakdown() || [])]
  list.sort((a, b) => (b.actualCost || 0) - (a.actualCost || 0))
  const top = list.slice(0, 5)
  const max = Math.max(...top.map(s => s.actualCost || 0), 1)
  return top.map(s => ({ ...s, pct: Math.max(5, ((s.actualCost || 0) / max) * 100) }))
})

function formatMoney(num) {
  const n = parseFloat(num) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function barWidth(val) {
  return Math.max(5, (val / maxActual.value) * 100) + '%'
}

function supplierBarWidth(val) {
  const maxVal = Math.max(...supplierBreakdown.value.map(s => s.actualCost || 0), 1)
  return Math.max(5, (val / maxVal) * 100) + '%'
}

function resetFilters() {
  periodFilter.value = 'all'
  supplierFilter.value = 'all'
}

function exportCSV() {
  try {
  const list = filteredRecords.value
  if (list.length === 0) {
    exportError.value = '无数据可导出'
    if (exportErrorTimer) clearTimeout(exportErrorTimer)
    exportErrorTimer = setTimeout(() => { exportError.value = '' }, 3000)
    return
  }
  let csv = '采购单号,供应商,日期,物料,数量,实际成本,标准成本,差异金额,差异率,状态\n'
  for (const r of list) {
    csv += [
      r.poNo || '', r.supplierName || '', r.date || '', r.materialName || '',
      r.quantity || 0, r.actualCost || 0, r.standardCost || 0,
      r.variance || 0, (r.varianceRate || 0).toFixed(1) + '%',
      costStore.statusLabels[r.status] || r.status || ''
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n'
  }
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '成本核算_' + new Date().toISOString().split('T')[0] + '.csv'
  a.click()
  URL.revokeObjectURL(url)
  } catch (e) { console.error('导出失败:', e); alert('导出失败: ' + e.message) }
}

function handleClickOutside(e) {
  if (showColumnConfig.value && !e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
}

onMounted(() => {
  dataStore.initSeedData()
  costStore.initSeedData()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: var(--space-8);
}
.access-denied-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}
.access-denied-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.access-denied-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.row-over-budget {
  background: rgba(239, 68, 68, 0.05);
}
.row-under-budget {
  background: rgba(34, 197, 94, 0.05);
}
.variance-positive {
  color: var(--color-danger);
  font-weight: 600;
}
.variance-negative {
  color: var(--color-success);
  font-weight: 600;
}
.trend-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.trend-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.trend-period {
  flex: 0 0 70px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.trend-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.trend-bar {
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  padding-left: 4px;
  min-width: 20px;
  transition: width 0.3s ease;
}
.trend-bar.actual {
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
}
.trend-bar.standard {
  background: rgba(34, 197, 94, 0.3);
  border: 1px solid rgba(34, 197, 94, 0.5);
}
.trend-label {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.trend-variance {
  flex: 0 0 90px;
  text-align: right;
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.supplier-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.supplier-item {
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
.supplier-item:last-child {
  border-bottom: none;
}
.supplier-name {
  font-weight: 600;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-1);
}
.supplier-stats {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
}
.supplier-bar-container {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}
.supplier-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
@media (max-width: 1024px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
.export-error-msg { color: var(--color-danger); font-size: var(--font-size-sm); margin-left: var(--space-2); animation: fadeOut 3s forwards; }
@keyframes fadeOut { 0%,70% { opacity: 1; } 100% { opacity: 0; } }

/* 统计卡片优化 */
.stat-card {
  animation: statCardIn 0.4s ease both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.stat-card-icon {
  color: var(--color-text-tertiary);
}
.stat-card-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

/* 脉冲光点 */
.pulse-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulseDot 2s infinite;
}
.pulse-danger {
  background: var(--color-danger);
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
}
.pulse-success {
  background: var(--color-success);
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
}
.pulse-neutral {
  background: var(--color-text-tertiary);
  box-shadow: 0 0 0 0 rgba(156, 163, 175, 0.4);
  animation: none;
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
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.overview-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.overview-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

/* 健康度环 */
.health-ring {
  width: 60px;
  height: 60px;
  transform: rotate(-90deg);
}
.health-ring-bg {
  fill: none;
  stroke: var(--color-bg-tertiary);
  stroke-width: 5;
}
.health-ring-fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease, stroke 0.3s ease;
}
.health-text {
  display: flex;
  flex-direction: column;
}
.health-percent {
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.health-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* 状态分布 */
.status-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.status-stack-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
}
.status-seg {
  height: 100%;
  transition: width 0.4s ease;
}
.status-over { background: var(--color-danger); }
.status-under { background: var(--color-success); }
.status-normal { background: var(--color-warning); }
.status-legend {
  display: flex;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}
.status-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* TOP5 */
.top5-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}
.top5-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.top5-rank {
  width: 18px;
  text-align: center;
  font-weight: 700;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}
.top5-name {
  width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
}
.top5-bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}
.top5-bar {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(59,130,246,0.7), rgba(59,130,246,0.4));
  transition: width 0.4s ease;
}
.top5-value {
  width: 80px;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

/* 表格行动画 */
.row-slide-in {
  animation: rowSlideIn 0.35s ease both;
}

/* 空状态 */
.empty-state {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) var(--space-4);
}
.empty-state-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  color: var(--color-text-tertiary);
}
.empty-state-text {
  font-size: var(--font-size-sm);
}

/* 光泽扫过动画 */
.bar-shimmer {
  position: relative;
  overflow: hidden;
}
.bar-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  animation: barShimmer 2.5s infinite;
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
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}
.pulse-success {
  animation-name: pulseDotSuccess;
}
@keyframes pulseDotSuccess {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes barShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

@media (max-width: 1024px) {
  .overview-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .overview-row {
    grid-template-columns: 1fr;
  }
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
.table-container {
  overflow-x: auto;
}
</style>
