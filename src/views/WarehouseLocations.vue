<template>
  <div class="warehouse-location-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">仓库库位档案</h2>
        <p class="page-header-subtitle">精确到库位的精细化管理，库区划分与库管员分配</p>
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
        <button class="btn btn-secondary" @click="handleExport"><Icon name="upload" :size="14" /> 导出</button>
        <button class="btn btn-primary" @click="openAddModal">新增库位</button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid stats-grid-4">
      <div class="stat-card" style="animation-delay:0ms">
        <div class="stat-card-header">
          <span class="stat-card-label">总库位数</span>
          <div class="stat-card-icon" style="background: var(--color-accent-subtle); color: var(--color-accent)"><Icon name="mapPin" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ whLocStore.locations.length }}</div>
      </div>
      <div class="stat-card" style="animation-delay:60ms">
        <div class="stat-card-header">
          <span class="stat-card-label">已占用</span>
          <div class="stat-card-icon" style="background: var(--color-success-subtle); color: var(--color-success)"><Icon name="package" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ occupiedCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:120ms">
        <div class="stat-card-header">
          <span class="stat-card-label">空库位</span>
          <div class="stat-card-icon" style="background: var(--color-info-subtle); color: var(--color-info)"><Icon name="circle" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ emptyCount }}</div>
      </div>
      <div class="stat-card" style="animation-delay:180ms">
        <div class="stat-card-header">
          <span class="stat-card-label">库位利用率</span>
          <div class="stat-card-icon" style="background: var(--color-warning-subtle); color: var(--color-warning)"><Icon name="chart" :size="14" /></div>
        </div>
        <div class="stat-card-value">{{ occupancyRate }}%</div>
      </div>
    </div>

    <!-- 概览面板：库位利用率 + 库区分布 + 仓库统计 -->
    <div class="location-overview-row">
      <div class="overview-card overview-ring-card">
        <div class="overview-card-title">库位利用率</div>
        <div class="overview-ring-body">
          <svg width="72" height="72" viewBox="0 0 72 72" class="overview-ring-svg">
            <circle cx="36" cy="36" r="26" fill="none" stroke="var(--color-border)" stroke-width="5" />
            <circle cx="36" cy="36" r="26" fill="none" :stroke="occupancyRateColor" stroke-width="5" stroke-linecap="round"
              :stroke-dasharray="occupancyRateDash" stroke-dashoffset="0" transform="rotate(-90 36 36)" class="overview-ring-progress" />
          </svg>
          <div class="overview-ring-text">
            <span class="overview-ring-percent" :style="{ color: occupancyRateColor }">{{ occupancyRate }}%</span>
            <span class="overview-ring-sub">已占用/总数</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-area-card">
        <div class="overview-card-title">库区分布</div>
        <div class="area-bars">
          <div v-for="(count, area) in whLocStore.areaStats" :key="area" class="area-bar-item">
            <span class="area-bar-label" :style="{ color: whLocStore.AREA_COLORS[area] || 'var(--color-text-secondary)' }">{{ area }}</span>
            <div class="area-bar-track">
              <div class="area-bar-fill" :style="{ width: areaPercent(area) + '%', background: whLocStore.AREA_COLORS[area] || '#64748b' }"></div>
            </div>
            <span class="area-bar-count">{{ count }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card overview-warehouse-card">
        <div class="overview-card-title">仓库统计</div>
        <div class="warehouse-bars">
          <div v-for="w in warehouseStats" :key="w.name" class="warehouse-bar-item">
            <span class="warehouse-bar-label">{{ w.name }}</span>
            <div class="warehouse-bar-track">
              <div class="warehouse-bar-fill" :style="{ width: w.percent + '%', background: w.color }"></div>
            </div>
            <span class="warehouse-bar-count">{{ w.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空库位/高占用预警 -->
    <div v-if="locationAlerts.length > 0" class="panel-card location-alert-panel">
      <div class="panel-card-header">
        <span class="panel-card-title" style="color:var(--color-warning)"><span class="alert-dot-pulse"></span> 库位预警</span>
      </div>
      <div class="panel-card-body">
        <div v-for="(a, idx) in locationAlerts" :key="a.id" class="location-alert-item" :style="{ animationDelay: idx * 60 + 'ms' }">
          <span class="location-alert-badge" :class="'alert-' + a.alertType">{{ a.alertLabel }}</span>
          <span class="location-alert-code">{{ a.locationCode }}</span>
          <span class="location-alert-warehouse">{{ a.warehouseName }}</span>
          <span class="location-alert-area" :style="{ color: whLocStore.AREA_COLORS[a.areaName] || 'var(--color-text-secondary)' }">{{ a.areaName }}</span>
          <span class="location-alert-manager">{{ a.manager }}</span>
          <span class="location-alert-qty">{{ a.stockInfo.count }}种/{{ a.stockInfo.totalQty.toFixed(2) }}kg</span>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <input type="text" class="form-input" v-model="searchText" placeholder="搜索库位编码/仓库名称..." />
      <select class="form-select" v-model="areaFilter">
        <option value="">全部库区</option>
        <option v-for="area in whLocStore.AREA_OPTIONS" :key="area" :value="area">{{ area }}</option>
      </select>
    </div>

    <div class="panel-card">
      <div class="panel-card-header">
        <span class="panel-card-title">库位列表</span>
        <span class="panel-card-count">共 {{ filteredLocations.length }} 条</span>
      </div>
      <div class="panel-card-body no-padding">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="columnVisible.locationCode">库位编码</th>
                <th v-if="columnVisible.warehouseName">仓库名称</th>
                <th v-if="columnVisible.areaName">库区名称</th>
                <th v-if="columnVisible.manager">库管员</th>
                <th v-if="columnVisible.managerPhone">联系电话</th>
                <th>关联物料</th>
                <th>物料数量</th>
                <th v-if="columnVisible.notes">备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedLocations.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-state-icon"><Icon name="mapPin" :size="24" /></div>暂无库位数据
                </td>
              </tr>
              <tr v-for="(loc, idx) in paginatedLocations" :key="loc.id" :style="{ animationDelay: idx * 20 + 'ms' }">
                <td v-if="columnVisible.locationCode" class="cell-mono"><strong style="color:var(--color-accent)">{{ loc.locationCode }}</strong></td>
                <td v-if="columnVisible.warehouseName">{{ loc.warehouseName }}</td>
                <td v-if="columnVisible.areaName"><span :style="{ color: whLocStore.AREA_COLORS[loc.areaName] || 'var(--color-text-tertiary)', fontWeight: 600 }">{{ loc.areaName }}</span></td>
                <td v-if="columnVisible.manager">{{ loc.manager }}</td>
                <td v-if="columnVisible.managerPhone" class="cell-mono">{{ loc.managerPhone }}</td>
                <td style="text-align:center">{{ whLocStore.getLocationStockInfo[loc.id]?.count || 0 }}</td>
                <td class="cell-mono" style="text-align:right">{{ (whLocStore.getLocationStockInfo[loc.id]?.totalQty || 0).toFixed(2) }}</td>
                <td v-if="columnVisible.notes">{{ loc.notes || '-' }}</td>
                <td class="cell-actions">
                  <button class="btn btn-ghost btn-sm" @click="openEditModal(loc)"><Icon name="edit" :size="14" /></button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" @click="handleDelete(loc.id)"><Icon name="delete" :size="14" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="pagination-bar" v-if="totalPages > 1">
      <span class="page-info">共 {{ filteredLocations.length }} 条</span>
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">&laquo;</button>
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">&lsaquo;</button>
      <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">&rsaquo;</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">&raquo;</button>
      <select v-model="pageSize" class="form-select" style="width:auto;font-size:var(--font-size-xs);padding:2px 4px">
        <option :value="10">10条/页</option>
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
      </select>
    </div>

    <!-- 库区分布统计 -->
    <div class="panel-card" style="margin-top:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="table" :size="14" /> 库区分布统计</span>
      </div>
      <div class="panel-card-body">
        <div class="area-stats-grid">
          <div v-for="(count, area, idx) in whLocStore.areaStats" :key="area" class="area-stat-card" :style="{ animationDelay: idx * 60 + 'ms' }">
            <div class="area-stat-top-bar" :style="{ background: whLocStore.AREA_COLORS[area] || '#64748b' }"></div>
            <div class="area-stat-value" :style="{ color: whLocStore.AREA_COLORS[area] || 'var(--color-text-tertiary)' }">{{ count }}</div>
            <div class="area-stat-label">{{ area }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-panel" style="max-width:400px">
        <div class="modal-header">
          <h3 :style="{ fontSize: '14px', fontWeight: 700, color: deleteConfirmData.type === 'hasStock' ? 'var(--color-warning)' : 'var(--color-danger)' }">{{ deleteConfirmData.type === 'hasStock' ? '无法删除' : '确认删除' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showDeleteConfirm = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body" style="text-align:center;padding:24px">
          <div class="confirm-icon-circle" :class="deleteConfirmData.type === 'hasStock' ? 'warning' : 'danger'">
            <Icon :name="deleteConfirmData.type === 'hasStock' ? 'warning' : 'delete'" :size="24" />
          </div>
          <div style="font-size:15px;color:var(--color-text-secondary)">{{ deleteConfirmData.message }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDeleteConfirm = false">{{ deleteConfirmData.type === 'hasStock' ? '知道了' : '取消' }}</button>
          <button v-if="deleteConfirmData.type === 'confirm'" class="btn btn-primary" style="background:var(--color-danger)" @click="confirmDeleteLocation">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-panel" style="max-width:600px">
        <div class="modal-header">
          <h3 :style="{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent)', borderBottom: '2px solid var(--color-accent)', paddingBottom: '8px' }"><Icon name="mapPin" :size="14" /> 库位信息</h3>
          <button class="btn btn-ghost btn-sm" @click="closeModal"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body">
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">库位编码 <span class="required">*</span></label>
              <input class="form-input" v-model="formData.locationCode" placeholder="格式：仓库-库区-货架-层（如CK01-YL-A-01）" :readonly="!!editingId" :style="editingId ? 'opacity:0.7;cursor:not-allowed' : ''" />
            </div>
            <div class="form-group">
              <label class="form-label">仓库名称 <span class="required">*</span></label>
              <input class="form-input" v-model="formData.warehouseName" placeholder="如：原料一库" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">库区名称 <span class="required">*</span></label>
            <select class="form-select" v-model="formData.areaName">
              <option v-for="area in whLocStore.AREA_OPTIONS" :key="area" :value="area">{{ area }}</option>
            </select>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">库管员 <span class="required">*</span></label>
              <input class="form-input" v-model="formData.manager" placeholder="需关联人员档案" />
            </div>
            <div class="form-group">
              <label class="form-label">联系电话 <span class="required">*</span></label>
              <input class="form-input" v-model="formData.managerPhone" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea class="form-textarea" rows="2" v-model="formData.notes"></textarea>
          </div>
        </div>
        <div v-if="formErrors.length > 0" class="form-errors">
          <div v-for="(err, idx) in formErrors" :key="idx" class="form-error"><Icon name="warning" :size="14" /> {{ err }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSave">{{ editingId ? '更新' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWarehouseLocationStore } from '@/stores/warehouseLocation'

const whLocStore = useWarehouseLocationStore()

const columnDefs = [
  { key: 'locationCode', label: '库位编码' },
  { key: 'warehouseName', label: '仓库名称' },
  { key: 'areaName', label: '库区名称' },
  { key: 'manager', label: '库管员' },
  { key: 'managerPhone', label: '联系电话' },
  { key: 'notes', label: '备注' },
  { key: 'actions', label: '操作', hideable: false }
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

const searchText = ref('')
const areaFilter = ref('')
const showModal = ref(false)
const editingId = ref(null)
const formErrors = ref([])
const showDeleteConfirm = ref(false)
const deleteConfirmData = ref({ id: null, type: '', message: '' })
const formData = ref({
  locationCode: '', warehouseName: '', areaName: '合格品区',
  manager: '', managerPhone: '', notes: ''
})

const filteredLocations = computed(() => {
  let list = whLocStore.locations
  const search = searchText.value.toLowerCase()
  if (search) {
    list = list.filter(l => (l.locationCode || '').toLowerCase().includes(search) || (l.warehouseName || '').toLowerCase().includes(search))
  }
  if (areaFilter.value) {
    list = list.filter(l => l.areaName === areaFilter.value)
  }
  return list
})

const currentPage = ref(1)
const pageSize = ref(20)

const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLocations.value.slice(start, start + pageSize.value)
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredLocations.value.length / pageSize.value)))
const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

watch([searchText, areaFilter], () => { currentPage.value = 1 })

/* ====== 统计计算 ====== */
const occupiedCount = computed(() => {
  return whLocStore.locations.filter(l => {
    const info = whLocStore.getLocationStockInfo[l.id]
    return info && info.count > 0
  }).length
})

const emptyCount = computed(() => {
  return whLocStore.locations.filter(l => {
    const info = whLocStore.getLocationStockInfo[l.id]
    return !info || info.count === 0
  }).length
})

const occupancyRate = computed(() => {
  const total = whLocStore.locations.length
  return total > 0 ? Math.round((occupiedCount.value / total) * 100) : 0
})

const RING_C = 2 * Math.PI * 26
const occupancyRateColor = computed(() => {
  const r = occupancyRate.value
  if (r >= 80) return 'var(--color-success)'
  if (r >= 50) return 'var(--color-warning)'
  return 'var(--color-info)'
})
const occupancyRateDash = computed(() => {
  const p = occupancyRate.value / 100
  return `${p * RING_C} ${RING_C}`
})

/* 库区百分比 */
function areaPercent(area) {
  const total = whLocStore.locations.length
  const count = whLocStore.areaStats[area] || 0
  return total > 0 ? Math.round((count / total) * 100) : 0
}

/* 仓库统计 */
const WAREHOUSE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#64748b']
const warehouseStats = computed(() => {
  const map = {}
  for (const l of whLocStore.locations) {
    const w = l.warehouseName || '未分类'
    if (!map[w]) map[w] = 0
    map[w]++
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 1
  return entries.map(([name, count], i) => ({
    name,
    count,
    percent: Math.round((count / max) * 100),
    color: WAREHOUSE_COLORS[i % WAREHOUSE_COLORS.length]
  }))
})

/* 库位预警 */
const locationAlerts = computed(() => {
  const alerts = []
  for (const loc of whLocStore.locations) {
    const info = whLocStore.getLocationStockInfo[loc.id]
    const count = info ? info.count : 0
    const qty = info ? info.totalQty : 0
    if (count === 0) {
      alerts.push({ ...loc, alertType: 'empty', alertLabel: '空库位', stockInfo: { count: 0, totalQty: 0 } })
    } else if (count >= 5) {
      alerts.push({ ...loc, alertType: 'high', alertLabel: '高占用', stockInfo: info })
    }
  }
  return alerts.slice(0, 8)
})

function openAddModal() {
  editingId.value = null
  formData.value = { locationCode: '', warehouseName: '', areaName: '合格品区', manager: '', managerPhone: '', notes: '' }
  formErrors.value = []
  showModal.value = true
}

function openEditModal(loc) {
  editingId.value = loc.id
  formData.value = { ...loc }
  formErrors.value = []
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

function handleSave() {
  formErrors.value = []
  if (!formData.value.locationCode) formErrors.value.push('请输入库位编码')
  if (!formData.value.warehouseName) formErrors.value.push('请输入仓库名称')
  if (!formData.value.areaName) formErrors.value.push('请选择库区名称')
  if (!formData.value.manager) formErrors.value.push('请输入库管员')
  if (!formData.value.managerPhone) formErrors.value.push('请输入联系电话')
  if (formErrors.value.length > 0) return
  const dupLoc = whLocStore.locations.find(l => l.locationCode === formData.value.locationCode && l.id !== editingId.value)
  if (dupLoc) formErrors.value.push('库位编码 ' + formData.value.locationCode + ' 已存在')
  if (formErrors.value.length > 0) return
  if (editingId.value) {
    whLocStore.updateLocation(editingId.value, { ...formData.value })
  } else {
    whLocStore.addLocation({ ...formData.value })
  }
  closeModal()
}

function handleDelete(id) {
  const stockInfo = whLocStore.getLocationStockInfo[id]
  if (stockInfo && stockInfo.count > 0) {
    deleteConfirmData.value = { id, type: 'hasStock', message: `该库位关联了 ${stockInfo.count} 种物料（总数量 ${stockInfo.totalQty.toFixed(2)}），请先转移物料后再删除。` }
    showDeleteConfirm.value = true
    return
  }
  deleteConfirmData.value = { id, type: 'confirm', message: '确认删除该库位？此操作不可撤销。' }
  showDeleteConfirm.value = true
}

function confirmDeleteLocation() {
  if (deleteConfirmData.value.type === 'confirm') {
    whLocStore.deleteLocation(deleteConfirmData.value.id)
  }
  showDeleteConfirm.value = false
}

function handleExport() {
  try {
  const data = filteredLocations.value.map(l => ({
    库位编码: l.locationCode, 仓库名称: l.warehouseName, 库区名称: l.areaName,
    库管员: l.manager, 联系电话: l.managerPhone, 备注: l.notes || ''
  }))
  const headers = Object.keys(data[0] || {})
  const csvRows = [headers.join(',')]
  for (const row of data) {
    csvRows.push(headers.map(h => '"' + String(row[h] || '').replace(/"/g, '""') + '"').join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '库位数据_' + new Date().toISOString().split('T')[0] + '.csv'
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
  whLocStore.initSeedData()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.warehouse-location-page {
  padding: var(--space-4);
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
.location-overview-row {
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

/* 库区分布条形图 */
.area-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.area-bar-item {
  display: grid;
  grid-template-columns: 70px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.area-bar-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.area-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.area-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.area-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* 仓库统计条形图 */
.warehouse-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.warehouse-bar-item {
  display: grid;
  grid-template-columns: 80px 1fr 30px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
}
.warehouse-bar-label {
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.warehouse-bar-track {
  height: 6px;
  background: var(--color-bg-tertiary, var(--color-border));
  border-radius: 3px;
  overflow: hidden;
}
.warehouse-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.warehouse-bar-count {
  text-align: right;
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-secondary);
}

/* ====== 库位预警 ====== */
.location-alert-panel {
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
.location-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  animation: alertSlideIn 0.3s ease-out both;
  font-size: var(--font-size-sm);
}
.location-alert-item:last-child { border-bottom: none; }
@keyframes alertSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
.location-alert-badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.location-alert-badge.alert-empty {
  background: var(--color-info-subtle);
  color: var(--color-info);
}
.location-alert-badge.alert-high {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}
.location-alert-code {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-weight: 600;
  color: var(--color-text-primary);
}
.location-alert-warehouse {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.location-alert-area {
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.location-alert-manager {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}
.location-alert-qty {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  color: var(--color-text-primary);
  margin-left: auto;
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-3);
}
.confirm-icon-circle.warning {
  background: var(--color-warning-subtle, rgba(245,158,11,0.1));
  color: var(--color-warning);
}
.confirm-icon-circle.danger {
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  color: var(--color-danger);
}

/* ====== 库区分布统计卡片 ====== */
.area-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}
.area-stat-card {
  text-align: center;
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  animation: cardFadeIn 0.4s ease-out both;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.area-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.area-stat-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.area-stat-value {
  font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
}
.area-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.panel-card-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  margin-top: var(--space-3);
}
.page-info {
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
}
.pagination-btn {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.pagination-btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
}
.pagination-btn.active {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-textarea {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  resize: vertical;
  width: 100%;
}
.form-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}
.form-errors {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-danger-subtle);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.form-error {
  font-size: var(--font-size-base);
  color: var(--color-danger);
  padding: 2px 0;
}

@media (max-width: 1024px) {
  .stats-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .location-overview-row { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .stats-grid-4 { grid-template-columns: 1fr; }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .filter-bar {
    flex-wrap: wrap;
  }
}
.table-container {
  overflow-x: auto;
}
</style>
