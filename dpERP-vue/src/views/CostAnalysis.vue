<template>
  <div class="cost-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">成本核算</h2>
        <p class="page-header-subtitle">实际成本 vs 标准成本对比分析，颜色编码差异指示</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-ghost btn-sm" @click="exportCSV">📥 导出CSV</button>
        <button class="btn btn-primary" @click="openEditor()">+ 新增成本记录</button>
      </div>
    </div>

    <div class="stats-row stats-grid-4">
      <div class="stat-card">
        <div class="stat-card-label">实际总成本</div>
        <div class="stat-card-value">¥{{ formatMoney(costStore.totalActual) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">标准总成本</div>
        <div class="stat-card-value">¥{{ formatMoney(costStore.totalStandard) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">成本差异金额</div>
        <div class="stat-card-value" :style="{ color: costStore.totalVariance > 0 ? 'var(--color-danger)' : costStore.totalVariance < 0 ? 'var(--color-success)' : '' }">
          {{ costStore.totalVariance >= 0 ? '+¥' : '-¥' }}{{ formatMoney(Math.abs(costStore.totalVariance)) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">差异率</div>
        <div class="stat-card-value" :style="{ color: costStore.varianceRate > 0 ? 'var(--color-danger)' : costStore.varianceRate < 0 ? 'var(--color-success)' : '' }">
          {{ costStore.varianceRate >= 0 ? '+' : '' }}{{ costStore.varianceRate.toFixed(2) }}%
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
      <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>采购单号</th>
                <th>供应商</th>
                <th>日期</th>
                <th>物料</th>
                <th>数量</th>
                <th>实际成本</th>
                <th>标准成本</th>
                <th>差异金额</th>
                <th>差异率</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRecords.length === 0">
                <td colspan="11" class="empty-state">
                  <div class="empty-state-icon">📊</div>暂无成本数据
                </td>
              </tr>
              <tr v-for="r in filteredRecords" :key="r.id"
                :class="{ 'row-over-budget': r.variance > 0, 'row-under-budget': r.variance < 0 }">
                <td>{{ r.poNo || '-' }}</td>
                <td>{{ r.supplierName || '-' }}</td>
                <td>{{ r.date || '-' }}</td>
                <td>{{ r.materialName || '-' }}</td>
                <td>{{ r.quantity || 0 }}</td>
                <td class="cell-mono">¥{{ formatMoney(r.actualCost) }}</td>
                <td class="cell-mono">¥{{ formatMoney(r.standardCost) }}</td>
                <td>
                  <span :class="r.variance > 0 ? 'variance-positive' : r.variance < 0 ? 'variance-negative' : ''">
                    {{ r.variance >= 0 ? '+¥' : '-¥' }}{{ formatMoney(Math.abs(r.variance)) }}
                  </span>
                </td>
                <td>
                  <span :class="r.variance > 0 ? 'variance-positive' : r.variance < 0 ? 'variance-negative' : ''">
                    {{ r.varianceRate >= 0 ? '+' : '' }}{{ (r.varianceRate || 0).toFixed(1) }}%
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="costStore.statusBadgeMap[r.status] || 'neutral'">
                    {{ costStore.statusLabels[r.status] || r.status }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-ghost btn-sm" @click="openEditor(r)" title="编辑">✏️</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDelete(r.id)" title="删除">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-top:var(--space-4)">
      <div class="panel-card">
        <div class="panel-card-header"><span class="panel-card-title">📈 成本趋势</span></div>
        <div class="panel-card-body">
          <div v-if="monthlyTrend.length === 0" style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-4)">暂无数据</div>
          <div v-else class="trend-list">
            <div v-for="m in monthlyTrend" :key="m.period" class="trend-item">
              <div class="trend-period">{{ m.period }}</div>
              <div class="trend-bar-container">
                <div class="trend-bar actual" :style="{ width: barWidth(m.actualCost) }">
                  <span class="trend-label">实际 ¥{{ formatMoney(m.actualCost) }}</span>
                </div>
                <div class="trend-bar standard" :style="{ width: barWidth(m.standardCost) }">
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
        <div class="panel-card-header"><span class="panel-card-title">🏢 供应商成本分布</span></div>
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
                <div class="supplier-bar" :style="{ width: supplierBarWidth(s.actualCost), background: s.variance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
      <div class="modal-panel" style="max-width:600px">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑成本记录' : '新增成本记录' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeEditor">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">采购单号</label>
              <input class="form-input" v-model="editorData.poNo">
            </div>
            <div class="form-group">
              <label class="form-label">日期</label>
              <input class="form-input" type="date" v-model="editorData.date">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">供应商</label>
              <select class="form-select" v-model="editorData.supplierId" @change="onSupplierChange">
                <option value="">请选择供应商</option>
                <option v-for="s in supplierOptions" :key="s.id" :value="s.id">{{ s.shortName || s.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">物料名称</label>
              <input class="form-input" v-model="editorData.materialName">
            </div>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">数量</label>
              <input class="form-input" type="number" min="0" step="1" v-model.number="editorData.quantity">
            </div>
            <div class="form-group">
              <label class="form-label">实际成本</label>
              <input class="form-input" type="number" min="0" step="0.01" v-model.number="editorData.actualCost">
            </div>
            <div class="form-group">
              <label class="form-label">标准成本</label>
              <input class="form-input" type="number" min="0" step="0.01" v-model.number="editorData.standardCost">
            </div>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select class="form-select" v-model="editorData.status">
                <option value="pending">待处理</option>
                <option value="approved">已审批</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">差异预览</label>
              <div style="padding:var(--space-2) 0;font-size:var(--font-size-sm)">
                <span :style="{ color: editorVariance > 0 ? 'var(--color-danger)' : editorVariance < 0 ? 'var(--color-success)' : '' }">
                  {{ editorVariance >= 0 ? '+' : '' }}¥{{ formatMoney(editorVariance) }}
                  ({{ editorVarianceRate >= 0 ? '+' : '' }}{{ editorVarianceRate.toFixed(1) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeEditor">取消</button>
          <button class="btn btn-primary" @click="saveRecord">{{ editingId ? '更新' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useCostStore } from '@/stores/cost'
import { useDataStore } from '@/stores/data'

const costStore = useCostStore()
const dataStore = useDataStore()

const periodFilter = ref('month')
const supplierFilter = ref('all')
const showEditor = ref(false)
const editingId = ref(null)

const editorData = reactive({
  poNo: '',
  supplierId: '',
  supplierName: '',
  date: '',
  materialName: '',
  quantity: 0,
  actualCost: 0,
  standardCost: 0,
  status: 'pending'
})

const supplierOptions = computed(() => dataStore.suppliers || [])

const filteredRecords = computed(() => costStore.getFilteredRecords(periodFilter.value, supplierFilter.value))
const monthlyTrend = computed(() => costStore.getMonthlyTrend())
const supplierBreakdown = computed(() => costStore.getSupplierBreakdown())

const editorVariance = computed(() => (parseFloat(editorData.actualCost) || 0) - (parseFloat(editorData.standardCost) || 0))
const editorVarianceRate = computed(() => {
  const std = parseFloat(editorData.standardCost) || 0
  return std > 0 ? editorVariance.value / std * 100 : 0
})

const maxActual = computed(() => Math.max(...monthlyTrend.value.map(m => m.actualCost || 0), 1))

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

function onSupplierChange() {
  const s = supplierOptions.value.find(s => s.id === editorData.supplierId)
  if (s) editorData.supplierName = s.shortName || s.name
}

function openEditor(data) {
  editingId.value = data ? data.id : null
  if (data) {
    Object.assign(editorData, {
      poNo: data.poNo || '',
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      date: data.date || '',
      materialName: data.materialName || '',
      quantity: data.quantity || 0,
      actualCost: data.actualCost || 0,
      standardCost: data.standardCost || 0,
      status: data.status || 'pending'
    })
  } else {
    Object.assign(editorData, {
      poNo: '',
      supplierId: '',
      supplierName: '',
      date: new Date().toISOString().split('T')[0],
      materialName: '',
      quantity: 0,
      actualCost: 0,
      standardCost: 0,
      status: 'pending'
    })
  }
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingId.value = null
}

function saveRecord() {
  if (!editorData.materialName) { alert('物料名称为必填项'); return }
  if (!editorData.date) { alert('日期为必填项'); return }
  const data = { ...editorData }
  if (editingId.value) {
    costStore.updateRecord(editingId.value, data)
  } else {
    costStore.addRecord(data)
  }
  closeEditor()
}

function handleDelete(id) {
  if (confirm('确认删除该成本记录？')) {
    costStore.deleteRecord(id)
  }
}

function exportCSV() {
  const list = filteredRecords.value
  if (list.length === 0) { alert('无数据可导出'); return }
  let csv = '采购单号,供应商,日期,物料,数量,实际成本,标准成本,差异金额,差异率,状态\n'
  for (const r of list) {
    csv += [
      r.poNo || '', r.supplierName || '', r.date || '', r.materialName || '',
      r.quantity || 0, r.actualCost || 0, r.standardCost || 0,
      r.variance || 0, (r.varianceRate || 0).toFixed(1) + '%',
      costStore.statusLabels[r.status] || r.status || ''
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n'
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '成本核算_' + new Date().toISOString().split('T')[0] + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  dataStore.initSeedData()
  costStore.initSeedData()
})
</script>

<style scoped>
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
@media (max-width: 768px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
