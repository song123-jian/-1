<template>
  <div class="statement-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">对账管理</h2>
        <p class="page-header-subtitle">苏州冠久标准化对账单 · 客户对账单生成、审核与确认</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button
            v-for="v in viewOptions"
            :key="v.key"
            class="btn btn-outline"
            :class="{ active: currentView === v.key }"
            @click="currentView = v.key"
            :title="v.icon + ' ' + v.label"
          ><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <div v-if="canExport" class="export-dropdown-wrapper">
          <button class="btn btn-outline" @click="showExportMenu = !showExportMenu">导出 <Icon name="chevronDown" :size="14" /></button>
          <div v-if="showExportMenu" class="export-dropdown-menu">
            <div class="export-dropdown-item" @click="exportCSV(); showExportMenu = false">导出 CSV</div>
            <div class="export-dropdown-item" @click="exportXLSX(); showExportMenu = false">导出 Excel (.xlsx)</div>
            <div class="export-dropdown-item" @click="exportPDF(); showExportMenu = false">导出 PDF</div>
          </div>
          <div v-if="exportError" class="inline-error" style="position:absolute;top:calc(100% + 28px);left:0;white-space:nowrap;z-index:101">{{ exportError }}</div>
        </div>
        <button class="btn btn-outline" @click="resetFilters">重置</button>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
        <button class="btn btn-outline" @click="handleBatchPrint" :disabled="selectedIds.length === 0">批量打印</button>
        <button v-if="canDelete" class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button v-if="canCreate" class="btn btn-primary" @click="openEditor()">+ 新增对账单</button>
      </div>
    </div>

    <div v-if="alerts.length > 0" class="panel-card" style="margin-bottom:var(--space-4);border-left:3px solid var(--color-warning)">
      <div class="panel-card-header">
        <span class="panel-card-title">预警提醒</span>
      </div>
      <div class="panel-card-body">
        <div v-for="a in alerts" :key="a.id + a.type" class="alert-item" :class="'alert-' + a.priority">
          <span class="alert-message">{{ a.message }}</span>
          <button class="btn btn-sm btn-outline" @click="viewDetail(a.id)">查看</button>
        </div>
      </div>
    </div>

    <div class="stats-row stats-grid-5">
      <div class="stat-card">
        <div class="stat-card-value" style="font-size:var(--font-size-xl)">{{ statementStore.totalStatements }}</div>
        <div class="stat-card-label">对账单总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-warning);font-size:var(--font-size-xl)">{{ statementStore.pendingCount }}</div>
        <div class="stat-card-label">待审核</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-success);font-size:var(--font-size-xl)">{{ statementStore.confirmedCount }}</div>
        <div class="stat-card-label">已确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-info);font-size:var(--font-size-xl)">{{ statementStore.paidCount }}</div>
        <div class="stat-card-label">已付款</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value" style="color:var(--color-danger);font-size:var(--font-size-xl)">¥{{ formatMoney(statementStore.totalBalance) }}</div>
        <div class="stat-card-label">未结余额</div>
      </div>
    </div>

    <div class="filter-bar">
      <input
        type="text"
        class="form-input"
        v-model="filters.search"
        placeholder="搜索对账单号..."
        style="min-width:160px"
      >
      <input
        type="month"
        class="form-input"
        v-model="filters.period"
        title="账单期间"
        style="width:160px"
      >
      <select class="form-select" v-model="filters.status">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending">待审核</option>
        <option value="confirmed">已确认</option>
        <option value="paid">已付款</option>
        <option value="voided">已作废</option>
      </select>
    </div>

    <div class="panel-card">
      <div class="panel-card-body no-padding">
        <div class="table-container" v-if="currentView === 'table'">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="columnVisible.statementNo" style="min-width:120px">对账单号</th>
                <th v-if="columnVisible.date" style="min-width:100px">日期</th>
                <th v-if="columnVisible.buyer" style="min-width:140px">采购方</th>
                <th v-if="columnVisible.supplier" style="min-width:140px">供应商</th>
                <th v-if="columnVisible.unitPrice" style="min-width:90px">单价</th>
                <th v-if="columnVisible.quantity" style="min-width:70px">数量</th>
                <th v-if="columnVisible.totalAmount" style="min-width:100px">总金额</th>
                <th v-if="columnVisible.status" style="min-width:80px">状态</th>
                <th v-if="columnVisible.createdAt" style="min-width:100px">创建日期</th>
                <th style="min-width:180px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredStatements.length === 0">
                <td colspan="10" class="empty-state">
                  暂无对账单
                </td>
              </tr>
              <tr v-for="s in filteredStatements" :key="s.id">
                <td v-if="columnVisible.statementNo" class="cell-mono" style="cursor:pointer;color:var(--color-accent)" @click="viewDetail(s.id)">{{ s.statementNo }}</td>
                <td v-if="columnVisible.date">{{ s.reconDate || '-' }}</td>
                <td v-if="columnVisible.buyer">{{ s.buyerName || '-' }}</td>
                <td v-if="columnVisible.supplier">{{ s.sellerName || '-' }}</td>
                <td v-if="columnVisible.unitPrice" class="cell-mono">¥{{ formatMoney(getFirstItemPrice(s)) }}</td>
                <td v-if="columnVisible.quantity" class="cell-mono">{{ getFirstItemQty(s) }}</td>
                <td v-if="columnVisible.totalAmount" class="cell-mono">¥{{ formatMoney(s.totalAmount) }}</td>
                <td v-if="columnVisible.status">
                  <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                    {{ statementStore.statusLabels[s.status] || s.status }}
                  </span>
                </td>
                <td v-if="columnVisible.createdAt" style="font-size:var(--font-size-xs)">{{ s.createdAt || '-' }}</td>
                <td class="cell-actions">
                  <button class="btn btn-sm btn-outline" @click="viewDetail(s.id)" title="查看">查看</button>
                  <button
                    v-if="s.status === 'pending' || s.status === 'draft'"
                    class="btn btn-sm btn-outline"
                    @click="openEditor(s)"
                    title="编辑"
                  >编辑</button>
                  <button
                    v-if="canConfirm && s.status === 'pending'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-success)"
                    @click="handleConfirm(s.id)"
                    title="确认"
                  >确认</button>
                  <button
                    v-if="canConfirm && s.status === 'pending'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-danger)"
                    @click="handleVoid(s.id)"
                    title="作废"
                  >作废</button>
                  <button
                    v-if="s.status === 'confirmed'"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-info)"
                    @click="handleMarkPaid(s)"
                    title="记录付款"
                  >记录付款</button>
                  <button
                    v-if="s.status === 'confirmed' || s.status === 'voided'"
                    class="btn btn-sm btn-outline"
                    @click="handleReopen(s.id)"
                    title="重新打开"
                  >重新打开</button>
                  <button class="btn btn-sm btn-outline" @click="handlePrint(s.id)" title="打印">打印</button>
                  <button
                    v-if="canDelete && (s.status === 'pending' || s.status === 'draft')"
                    class="btn btn-sm btn-outline"
                    style="color:var(--color-danger)"
                    @click="handleDelete(s.id)"
                    title="删除"
                  >删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="currentView === 'list'" class="list-view">
          <div
            v-for="s in filteredStatements"
            :key="s.id"
            class="list-item"
            @click="viewDetail(s.id)"
          >
            <div class="list-item-header">
              <span class="list-item-title">{{ s.statementNo }}</span>
              <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                {{ statementStore.statusLabels[s.status] || s.status }}
              </span>
            </div>
            <div class="list-item-meta">
              <span>{{ s.reconDate || '-' }}</span>
              <span>{{ s.buyerName }}</span>
              <span>{{ s.sellerName }}</span>
              <span>¥{{ formatMoney(s.totalAmount) }}</span>
            </div>
          </div>
          <div v-if="filteredStatements.length === 0" class="empty-state">
            暂无对账单
          </div>
        </div>

        <div v-else-if="currentView === 'card'" class="card-view">
          <div
            v-for="s in filteredStatements"
            :key="s.id"
            class="statement-card"
            @click="viewDetail(s.id)"
          >
            <div class="card-header">
              <span class="card-title">{{ s.statementNo }}</span>
              <span class="status-badge" :class="statementStore.statusBadgeMap[s.status] || 'neutral'">
                {{ statementStore.statusLabels[s.status] || s.status }}
              </span>
            </div>
            <div class="card-body">
              <div class="card-field"><span class="card-label">日期</span><span>{{ s.reconDate || '-' }}</span></div>
              <div class="card-field"><span class="card-label">采购方</span><span>{{ s.buyerName }}</span></div>
              <div class="card-field"><span class="card-label">供应商</span><span>{{ s.sellerName }}</span></div>
              <div class="card-field"><span class="card-label">金额</span><span class="cell-mono">¥{{ formatMoney(s.totalAmount) }}</span></div>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-outline" @click.stop="viewDetail(s.id)">查看</button>
              <button v-if="canConfirm && s.status === 'pending'" class="btn btn-sm btn-outline" style="color:var(--color-success)" @click.stop="handleConfirm(s.id)">确认</button>
            </div>
          </div>
          <div v-if="filteredStatements.length === 0" class="empty-state">
            暂无对账单
          </div>
        </div>

        <!-- 周视图 -->
        <div v-else-if="currentView === 'week'" class="week-view">
          <div class="week-nav">
            <button class="btn btn-ghost btn-sm" @click="weekPrev"><Icon name="chevronLeft" :size="14" /></button>
            <span class="week-range-label">{{ weekRangeLabel }}</span>
            <button class="btn btn-ghost btn-sm" @click="weekNext"><Icon name="chevronRight" :size="14" /></button>
            <button class="btn btn-ghost btn-sm" @click="weekToday" style="margin-left:var(--space-2)">本周</button>
          </div>
          <div class="week-grid">
            <div class="week-header" v-for="(d, i) in weekDays" :key="d">
              <span>{{ d }}</span>
              <span class="week-header-date">{{ weekDates[i] }}</span>
            </div>
            <div v-for="(day, idx) in weekDaysData" :key="idx" class="week-col" :class="{ 'week-col-today': day.isToday }">
              <div v-if="day.statements.length === 0" class="week-empty">无对账单</div>
              <div v-for="s in day.statements" :key="s.id" class="week-event" :class="'stmt-' + s.status" @click="viewDetail(s.id)">
                <div class="week-event-title">{{ s.statementNo }}</div>
                <div class="week-event-meta">¥{{ formatMoney(s.totalAmount) }} · {{ s.buyerName }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑对账单弹窗 -->
    <StatementFormModal
      v-if="showFormModal"
      :showModal="showFormModal"
      :editingStatement="editingStatement"
      @close="showFormModal = false; editingStatement = null"
      @saved="onFormSaved"
    />

    <!-- 对账单详情预览 -->
    <StatementPreview
      v-if="showDetail"
      :showModal="showDetail"
      :statementId="previewStatementId"
      @close="closeDetail"
      @edit="onPreviewEdit"
      @confirm="handleConfirm"
      @markPaid="handleMarkPaid"
      @print="handlePrint"
    />

    <!-- 记录付款弹窗 -->
    <div v-if="showPaidDialog" class="modal-overlay" @click.self="showPaidDialog = false">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>记录付款</h3>
          <button class="btn btn-sm btn-outline" @click="showPaidDialog = false">关闭</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:var(--space-3);padding:var(--space-3);background:var(--color-bg-primary);border-radius:var(--radius-md)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
              <span>应付总额</span>
              <span class="cell-mono">¥{{ formatMoney(paidTarget.totalAmount) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
              <span>已付金额</span>
              <span class="cell-mono">¥{{ formatMoney(paidTarget.paidAmount) }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:600">
              <span>剩余金额</span>
              <span class="cell-mono" style="color:var(--color-danger)">¥{{ formatMoney((paidTarget.totalAmount || 0) - (paidTarget.paidAmount || 0)) }}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">本次付款金额</label>
            <input type="number" class="form-input" v-model.number="paidAmount" min="0.01" step="0.01">
            <div v-if="paidError" class="inline-error">{{ paidError }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showPaidDialog = false">取消</button>
          <button class="btn btn-primary" @click="confirmPaid">确认付款</button>
        </div>
      </div>
    </div>

    <!-- 自定义确认弹窗 -->
    <div v-if="confirmDialog.show" class="modal-overlay" @click.self="onConfirmDialogCancel">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h3>{{ confirmDialog.title }}</h3>
          <button class="btn btn-sm btn-outline" @click="onConfirmDialogCancel">关闭</button>
        </div>
        <div class="modal-body">
          <p>{{ confirmDialog.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="onConfirmDialogCancel">取消</button>
          <button class="btn btn-primary" @click="onConfirmDialogOk">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useStatementStore } from '@/stores/statement'
import { useCustomerStore } from '@/stores/customer'
import { useDataStore } from '@/stores/data'
import { usePermission } from '@/utils/permissionGuard'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import StatementFormModal from '@/components/statements/StatementFormModal.vue'
import StatementPreview from '@/components/statements/StatementPreview.vue'

const statementStore = useStatementStore()
const customerStore = useCustomerStore()
const dataStore = useDataStore()
const perm = usePermission()

const canCreate = perm.isAllowed('statement', 'statementCreate')
const canEdit = perm.isAllowed('statement', 'statementUpdate')
const canDelete = perm.isAllowed('statement', 'statementDelete')
const canConfirm = perm.isAllowed('statement', 'statementConfirm')
const canExport = perm.isAllowed('statement', 'statementExport')

const currentView = ref('table')
const showFormModal = ref(false)
const editingStatement = ref(null)
const showDetail = ref(false)
const previewStatementId = ref(null)
const showPaidDialog = ref(false)
const paidTarget = ref({})
const paidAmount = ref(0)
const selectedIds = ref([])
const showExportMenu = ref(false)
const confirmDialog = ref({ show: false, title: '', message: '', onConfirm: null })
const exportError = ref('')
const paidError = ref('')

const columnDefs = [
  { key: 'statementNo', label: '对账单号' },
  { key: 'date', label: '日期' },
  { key: 'buyer', label: '采购方' },
  { key: 'supplier', label: '供应商' },
  { key: 'unitPrice', label: '单价' },
  { key: 'quantity', label: '数量' },
  { key: 'totalAmount', label: '总金额' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建日期' },
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

const viewOptions = [
  { key: 'table', icon: 'chart', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'archive', label: '卡片' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const filters = reactive({
  search: '',
  period: '',
  status: ''
})

const alerts = computed(() => statementStore.checkAlerts())

const filteredStatements = computed(() => {
  return statementStore.statements.filter(s => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!(s.statementNo || '').toLowerCase().includes(q)) return false
    }
    if (filters.period && s.period !== filters.period) return false
    if (filters.status && s.status !== filters.status) return false
    return true
  })
})

function formatMoney(num) {
  if (num === undefined || num === null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getFirstItemPrice(s) {
  const items = s.items || []
  if (items.length === 0) return 0
  return items[0].price || 0
}

function getFirstItemQty(s) {
  const items = s.items || []
  if (items.length === 0) return 0
  return items[0].qty || 0
}

function formatPeriod(period) {
  if (!period) return '-'
  const parts = period.split('-')
  if (parts.length === 2) return parts[0] + ' 年 ' + parts[1] + ' 月'
  return period
}

/* ========== 周视图 ========== */
const weekDayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const weekAnchor = ref(new Date())

const weekRangeLabel = computed(() => {
  const start = new Date(weekAnchor.value)
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`
  return `${start.getFullYear()}年 ${fmt(start)} - ${fmt(end)}`
})

const weekDays = computed(() => weekDayNames)

const weekDates = computed(() => {
  const start = new Date(weekAnchor.value)
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return dates
})

const weekDaysData = computed(() => {
  const start = new Date(weekAnchor.value)
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)
  const todayStr = new Date().toISOString().split('T')[0]
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      isToday: dateStr === todayStr,
      statements: filteredStatements.value.filter(s => s.reconDate === dateStr)
    })
  }
  return days
})

function weekPrev() {
  const d = new Date(weekAnchor.value)
  d.setDate(d.getDate() - 7)
  weekAnchor.value = d
}
function weekNext() {
  const d = new Date(weekAnchor.value)
  d.setDate(d.getDate() + 7)
  weekAnchor.value = d
}
function weekToday() {
  weekAnchor.value = new Date()
}

function showConfirmDialog(title, message, callback) {
  confirmDialog.value = { show: true, title, message, onConfirm: callback }
}

function onConfirmDialogOk() {
  if (confirmDialog.value.onConfirm) {
    confirmDialog.value.onConfirm()
  }
  confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
}

function onConfirmDialogCancel() {
  confirmDialog.value = { show: false, title: '', message: '', onConfirm: null }
}

function showExportError(msg) {
  exportError.value = msg
  setTimeout(() => { exportError.value = '' }, 3000)
}

function resetFilters() {
  filters.search = ''
  filters.period = ''
  filters.status = ''
}

function openEditor(data) {
  if (data && data.id) {
    editingStatement.value = data
  } else {
    editingStatement.value = null
  }
  showFormModal.value = true
}

function onFormSaved() {
  // 表单保存后的回调，无需额外操作，store 已更新
}

function viewDetail(id) {
  previewStatementId.value = id
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  previewStatementId.value = null
}

function onPreviewEdit(statement) {
  showDetail.value = false
  previewStatementId.value = null
  editingStatement.value = statement
  showFormModal.value = true
}

function handleConfirm(id) {
  showConfirmDialog('确认操作', '确认此对账单？', () => {
    statementStore.confirmStatement(id)
  })
}

function handleVoid(id) {
  showConfirmDialog('确认操作', '确认作废此对账单？', () => {
    statementStore.voidStatement(id)
  })
}

function handleMarkPaid(stmt) {
  paidTarget.value = stmt
  paidAmount.value = (stmt.totalAmount || 0) - (stmt.paidAmount || 0)
  showPaidDialog.value = true
}

function confirmPaid() {
  paidError.value = ''
  if (!paidAmount.value || paidAmount.value <= 0) {
    paidError.value = '请输入有效的付款金额'
    setTimeout(() => { paidError.value = '' }, 3000)
    return
  }
  const ok = statementStore.markAsPaid(paidTarget.value.id, paidAmount.value)
  if (!ok) {
    paidError.value = '付款金额超出应付总额'
    setTimeout(() => { paidError.value = '' }, 3000)
    return
  }
  showPaidDialog.value = false
}

function handleReopen(id) {
  showConfirmDialog('确认操作', '确认重新打开此对账单？', () => {
    statementStore.reopenStatement(id)
  })
}

function handleDelete(id) {
  showConfirmDialog('确认删除', '确认删除此对账单？删除后不可恢复。', () => {
    statementStore.deleteStatement(id)
  })
}

function handlePrint(id) {
  const stmt = statementStore.getById(id)
  if (!stmt) return
  const items = stmt.items || []
  let itemsHtml = items.map((it, idx) =>
    `<tr><td>${idx + 1}</td><td>${it.date || ''}</td><td>${it.name || ''}</td><td>${it.code || ''}</td><td>${it.spec || ''}</td><td>${it.unit || ''}</td><td style="text-align:right">${(it.qty || 0).toFixed(2)}</td><td style="text-align:right">${(it.price || 0).toFixed(2)}</td><td style="text-align:right;font-weight:600">${(it.amount || 0).toFixed(2)}</td></tr>`
  ).join('')
  const printWin = window.open('', '_blank')
  printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>对账单打印</title><style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px;color:#333;font-size:12px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #999;padding:4px 6px;text-align:left;font-size:11px}th{background:#f0f0f0;font-weight:600}.section{margin-bottom:16px}.section-title{font-size:14px;font-weight:700;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px}.amounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}@media print{body{padding:0}}</style></head><body>
    <h2 style="text-align:center">对账单</h2>
    <div class="section"><div class="section-title">账单信息</div>
    <table><tr><td><strong>编号：</strong>${stmt.statementNo}</td><td><strong>期间：</strong>${formatPeriod(stmt.period)}</td></tr>
    <tr><td><strong>采购方：</strong>${stmt.buyerName || '-'}</td><td><strong>供应商：</strong>${stmt.sellerName || '-'}</td></tr></table></div>
    <div class="section"><div class="section-title">交易明细</div>
    <table><thead><tr><th>#</th><th>日期</th><th>名称</th><th>料号</th><th>规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>${itemsHtml}</tbody></table></div>
    <div class="section"><div class="section-title">金额合计</div>
    <div class="amounts"><div><strong>小计：</strong>¥${(stmt.subtotal || 0).toFixed(2)}</div><div><strong>税率：</strong>${stmt.taxRate || 0}%</div>
    <div><strong>税额：</strong>¥${(stmt.taxAmount || 0).toFixed(2)}</div><div><strong style="color:red">合计：¥${(stmt.totalAmount || 0).toFixed(2)}</strong></div></div></div>
    <div style="text-align:center;margin-top:20px;font-size:10px;color:#999">苏州冠久标准化对账单 · 打印时间：${new Date().toLocaleString()}</div>
  </body></html>`)
  printWin.document.close()
  setTimeout(() => printWin.print(), 500)
}

function exportCSV() {
  const data = filteredStatements.value
  if (data.length === 0) { showExportError('暂无数据可导出'); return }
  let csv = '对账单号,日期,采购方,供应商,单价,数量,总金额,状态,创建日期\n'
  for (const s of data) {
    csv += `"${s.statementNo}","${s.reconDate || ''}","${s.buyerName || ''}","${s.sellerName || ''}",${getFirstItemPrice(s)},${getFirstItemQty(s)},${s.totalAmount || 0},"${statementStore.statusLabels[s.status] || s.status}","${s.createdAt || ''}"\n`
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '对账单_' + new Date().toISOString().split('T')[0] + '.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportXLSX() {
  const data = filteredStatements.value
  if (data.length === 0) { showExportError('暂无数据可导出'); return }
  const rows = data.map(s => ({
    '对账单号': s.statementNo,
    '日期': s.reconDate || '-',
    '采购方': s.buyerName || '-',
    '供应商': s.sellerName || '-',
    '单价': getFirstItemPrice(s),
    '数量': getFirstItemQty(s),
    '总金额': s.totalAmount || 0,
    '状态': statementStore.statusLabels[s.status] || s.status,
    '创建日期': s.createdAt || '-'
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '对账单')
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
  ]
  XLSX.writeFile(wb, '对账单_' + new Date().toISOString().split('T')[0] + '.xlsx')
}

function exportPDF() {
  const data = filteredStatements.value
  if (data.length === 0) { showExportError('暂无数据可导出'); return }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.text('对账单列表', 14, 15)
  doc.setFontSize(10)
  doc.text('导出时间: ' + new Date().toLocaleString('zh-CN'), 14, 22)
  const body = data.map(s => [
    s.statementNo,
    s.reconDate || '-',
    s.buyerName || '-',
    s.sellerName || '-',
    '¥' + formatMoney(getFirstItemPrice(s)),
    getFirstItemQty(s),
    '¥' + formatMoney(s.totalAmount),
    statementStore.statusLabels[s.status] || s.status,
    s.createdAt || '-'
  ])
  doc.autoTable({
    head: [['对账单号', '日期', '采购方', '供应商', '单价', '数量', '总金额', '状态', '创建日期']],
    body: body,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid'
  })
  doc.save('对账单_' + new Date().toISOString().split('T')[0] + '.pdf')
}

function handleBatchDelete() {
  if (selectedIds.value.length === 0) return
  showConfirmDialog('批量删除', `确定删除选中的 ${selectedIds.value.length} 条对账单？`, () => {
    for (const id of selectedIds.value) {
      statementStore.deleteStatement(id)
    }
    selectedIds.value = []
  })
}

function handleBatchPrint() {
  if (selectedIds.value.length === 0) return
  const items = statementStore.statements.filter(s => selectedIds.value.includes(s.id))
  const printContent = items.map(s => `
    <div style="page-break-after:always;margin-bottom:20px;padding:20px;border:1px solid #ccc">
      <h2 style="text-align:center">对账单 - ${s.statementNo}</h2>
      <p>期间: ${formatPeriod(s.period)}</p>
      <p>采购方: ${s.buyerName || '-'}</p>
      <p>供应商: ${s.sellerName || '-'}</p>
      <p>总金额: ¥${s.totalAmount || 0}</p>
      <p>已付金额: ¥${s.paidAmount || 0}</p>
      <p>状态: ${statementStore.statusLabels[s.status] || s.status}</p>
    </div>
  `).join('')
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>批量打印对账单</title></head><body>${printContent}</body></html>`)
  win.document.close()
  win.print()
}

function closeExportMenu(e) {
  if (!e.target.closest('.export-dropdown-wrapper')) {
    showExportMenu.value = false
  }
}

function closeColumnConfig(e) {
  if (!e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
}

onMounted(() => {
  customerStore.initSeedData()
  dataStore.initSeedData()
  statementStore.initSeedData()
  document.addEventListener('click', closeExportMenu)
  document.addEventListener('click', closeColumnConfig)
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportMenu)
  document.removeEventListener('click', closeColumnConfig)
})
</script>

<style scoped>
.statement-page {
  width: 100%;
}
.stats-grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
.page-header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.view-toggle {
  display: flex;
  gap: 2px;
}
.view-toggle .btn.active {
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
}
.alert-item.alert-high {
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  border-left: 3px solid var(--color-danger);
}
.alert-item.alert-medium {
  background: var(--color-warning-subtle, rgba(245,158,11,0.1));
  border-left: 3px solid var(--color-warning);
}
.alert-icon { font-size: var(--font-size-lg); }
.alert-message { flex: 1; font-size: var(--font-size-sm); }
.list-view {
  padding: var(--space-3);
}
.list-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.list-item:hover { background: var(--color-surface-hover); }
.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}
.list-item-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.list-item-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-3);
}
.statement-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.statement-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.card-title {
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.card-field {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.card-label {
  color: var(--color-text-tertiary);
}
.card-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.export-dropdown-wrapper {
  position: relative;
}
.export-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}
.export-dropdown-item {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.export-dropdown-item:hover {
  background: var(--color-surface-hover);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.data-table th {
  font-weight: 600;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.data-table td {
  font-size: var(--font-size-sm);
}
.data-table tbody tr:hover {
  background: var(--color-surface-hover);
}
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }

/* 内联错误提示 */
.inline-error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-top: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-danger-subtle, rgba(239,68,68,0.1));
  border-radius: var(--radius-sm);
}

/* 周视图 */
.week-view { padding: var(--space-3); }
.week-nav { display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-bottom: var(--space-3); }
.week-range-label { font-weight: 600; font-size: var(--font-size-lg); color: var(--color-text-primary); min-width: 180px; text-align: center; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.week-header { background: var(--color-surface-elevated); padding: var(--space-2); text-align: center; font-weight: 600; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); border-right: 1px solid var(--color-border); }
.week-header:last-child { border-right: none; }
.week-header-date { display: block; font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: 400; margin-top: 2px; }
.week-col { min-height: 120px; padding: var(--space-2); background: var(--color-surface); border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
.week-col:nth-child(7n) { border-right: none; }
.week-col-today { background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
.week-empty { color: var(--color-text-tertiary); font-size: var(--font-size-sm); text-align: center; padding-top: var(--space-4); }
.week-event { padding: var(--space-1) var(--space-2); margin-bottom: var(--space-1); border-radius: var(--radius-sm); font-size: var(--font-size-xs); cursor: pointer; transition: transform 0.15s; border-left: 3px solid transparent; }
.week-event:hover { transform: translateX(2px); }
.week-event-title { font-weight: 600; margin-bottom: 2px; }
.week-event-meta { color: var(--color-text-secondary); font-size: 11px; }
.stmt-pending { background: var(--color-warning-subtle); border-left-color: var(--color-warning); }
.stmt-confirmed { background: var(--color-success-subtle); border-left-color: var(--color-success); }
.stmt-paid { background: var(--color-info-subtle); border-left-color: var(--color-info); }
.stmt-voided { background: var(--color-danger-subtle); border-left-color: var(--color-danger); }
@media (max-width: 1024px) {
  .stats-grid-5 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .week-grid { grid-template-columns: 1fr; }
  .week-header { border-right: none; }
  .week-col { border-right: none; }
}
@media (max-width: 640px) {
  .stats-grid-5 { grid-template-columns: repeat(2, 1fr); }
}
</style>
