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
        <button class="btn btn-primary" @click="openAddModal">+ 新增库位</button>
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
                  <div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无库位数据
                </td>
              </tr>
              <tr v-for="loc in paginatedLocations" :key="loc.id">
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
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
      <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
      <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
      <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
      <select v-model="pageSize" class="form-select" style="width:auto;font-size:var(--font-size-xs);padding:2px 4px">
        <option :value="10">10条/页</option>
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
      </select>
    </div>

    <div class="panel-card" style="margin-top:var(--space-6)">
      <div class="panel-card-header">
        <span class="panel-card-title"><Icon name="table" :size="14" /> 库区分布统计</span>
      </div>
      <div class="panel-card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--space-3)">
          <div v-for="(count, area) in whLocStore.areaStats" :key="area" style="text-align:center;padding:var(--space-3);background:var(--color-bg-tertiary);border-radius:var(--radius-md)">
            <div style="font-size:24px;font-weight:700" :style="{ color: whLocStore.AREA_COLORS[area] || 'var(--color-text-tertiary)' }">{{ count }}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">{{ area }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-panel" style="max-width:400px">
        <div class="modal-header">
          <h3 :style="{ fontSize: '14px', fontWeight: 700, color: deleteConfirmData.type === 'hasStock' ? 'var(--color-warning)' : 'var(--color-danger)' }">{{ deleteConfirmData.type === 'hasStock' ? '无法删除' : '确认删除' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showDeleteConfirm = false"><Icon name="close" :size="14" /></button>
        </div>
        <div class="modal-body" style="text-align:center;padding:24px">
          <div style="font-size:15px;color:var(--color-text-secondary)">{{ deleteConfirmData.message }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDeleteConfirm = false">{{ deleteConfirmData.type === 'hasStock' ? '知道了' : '取消' }}</button>
          <button v-if="deleteConfirmData.type === 'confirm'" class="btn btn-primary" style="background:var(--color-danger)" @click="confirmDeleteLocation">确认删除</button>
        </div>
      </div>
    </div>

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
  const data = filteredLocations.value.map(l => ({
    库位编码: l.locationCode, 仓库名称: l.warehouseName, 库区名称: l.areaName,
    库管员: l.manager, 联系电话: l.managerPhone, 备注: l.notes || ''
  }))
  /* CSV导出（含UTF-8 BOM） */
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

/* 响应式适配 */
@media (max-width: 1024px) {
  .page-header-actions {
    flex-wrap: wrap;
  }
  .filter-bar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .page-header-actions {
    flex-wrap: wrap;
  }
  .filter-bar {
    flex-direction: column;
  }
  .form-row-2 {
    flex-direction: column;
    gap: 0;
  }
  table {
    font-size: 12px;
  }
}
</style>
