<template>
  <div class="quotation-page">
    <div class="quotation-page-inner">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">报价管理</h2>
        <p class="page-header-subtitle">端到端报价生命周期：创建<Icon name="chevronRight" :size="14" />审批<Icon name="chevronRight" :size="14" />跟踪<Icon name="chevronRight" :size="14" />转换</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" :title="v.icon + ' ' + v.label" @click="currentView = v.key"><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <button class="btn btn-outline" @click="showAnalytics = !showAnalytics">{{ showAnalytics ? '列表' : '分析' }}</button>
        <button class="btn btn-outline" @click="handleExport">导出</button>
        <button v-if="canApprove" class="btn btn-outline" @click="handleBatchApprove" :disabled="selectedIds.length === 0">批量审批</button>
        <button class="btn btn-outline" @click="openComparisonModal">对比</button>
        <button v-if="canDelete" class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button class="btn btn-outline" @click="showTemplateModal = true">模板</button>
        <button v-if="canCreate" class="btn btn-primary" @click="openAddModal">+ 新建报价</button>
      </div>
    </div>

    <div class="quotation-toolbar">
      <div class="quotation-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索报价编号/客户名称..." />
      </div>
      <div class="quotation-filters">
        <select v-model="filterStatus" class="form-select filter-select">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending">待审批</option>
          <option value="approved">已审批</option>
          <option value="sent">已发送</option>
          <option value="accepted">已接受</option>
          <option value="rejected">已拒绝</option>
          <option value="expired">已过期</option>
        </select>
        <select v-model="sortField" class="form-select filter-select">
          <option value="date">按日期</option>
          <option value="total">按金额</option>
          <option value="profitMargin">按利润率</option>
          <option value="quoteNo">按编号</option>
          <option value="customerName">按客户</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"><Icon :name="sortDir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="14" /></button>
      </div>
    </div>

    <div class="quotation-stats-bar">
      <div class="stat-item"><span class="stat-dot total"></span><span class="stat-icon"><Icon name="table" :size="14" /></span> 总计 {{ quotationStore.quotations.length }}</div>
      <div class="column-config-wrapper">
        <button class="btn btn-outline btn-sm" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
        <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
          <label v-for="col in columnDefs.filter(c => !c.hidden)" :key="col.key" class="column-config-item">
            <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
          </label>
        </div>
      </div>
      <div class="stat-item"><span class="stat-dot draft"></span><span class="stat-icon"><Icon name="edit" :size="14" /></span> 草稿 {{ quotationStore.draftCount }}</div>
      <div class="stat-item"><span class="stat-dot pending"></span><span class="stat-icon"><Icon name="clock" :size="14" /></span> 待审 {{ quotationStore.pendingCount }}</div>
      <div class="stat-item"><span class="stat-dot approved"></span><span class="stat-icon"><Icon name="check" :size="14" /></span> 已审 {{ quotationStore.approvedCount }}</div>
      <div class="stat-item"><span class="stat-dot accepted"></span><span class="stat-icon">[合作]</span> 已接受 {{ quotationStore.acceptedCount }}</div>
      <div class="stat-item stat-money"><span class="stat-icon"><Icon name="dollar" :size="14" /></span> 总额 ¥{{ formatNumber(quotationStore.totalAmount) }}</div>
      <div class="stat-item stat-money"><span class="stat-icon"><Icon name="trendUp" :size="14" /></span> 转化率 {{ quotationStore.conversionRate }}%</div>
      <div class="stat-item stat-money"><span class="stat-icon"><Icon name="chevronDown" :size="14" /></span> 平均利润率 {{ quotationStore.avgProfitMargin }}%</div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <QuotationAnalytics v-if="showAnalytics" />

    <template v-else>
      <div v-if="currentView === 'table'" class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40px"><div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll"><Icon name="checkCircle" :size="14" /></div></th>
                  <th v-if="columnVisible.quoteNo"><span class="th-icon"><Icon name="checkCircle" :size="14" /></span> 报价编码</th>
                  <th v-if="columnVisible.date" class="sortable" @click="toggleSort('date')"><span class="th-icon"><Icon name="calendar" :size="14" /></span> 日期 <span class="sort-icon"><Icon :name="sortField === 'date' ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'filter'" :size="14" /></span></th>
                  <th v-if="columnVisible.customer"><span class="th-icon"><Icon name="building" :size="14" /></span> 客户</th>
                  <th v-if="columnVisible.grade"><span class="th-icon"><Icon name="package" :size="14" /></span> 牌号</th>
                  <th v-if="columnVisible.unitPrice"><span class="th-icon">[美元]</span> 单价含税</th>
                  <th v-if="columnVisible.status"><span class="th-icon"><Icon name="list" :size="14" /></span> 状态</th>
                  <th v-if="columnVisible.notes"><span class="th-icon">[评论]</span> 备注</th>
                  <th><span class="th-icon">[操作]</span> 操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedQuotations.length === 0"><td :colspan="2 + visibleColCount" class="empty-state"><div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无报价数据</td></tr>
                <tr v-for="q in pagedQuotations" :key="q.id">
                  <td><div class="checkbox" :class="{ checked: selectedIds.includes(q.id) }" @click="toggleSelect(q.id)"><Icon name="checkCircle" :size="14" /></div></td>
                  <td v-if="columnVisible.quoteNo" class="mono"><strong style="color:var(--color-accent)">{{ q.quoteNo }}</strong></td>
                  <td v-if="columnVisible.date">{{ q.date || '-' }}</td>
                  <td v-if="columnVisible.customer">{{ q.customerName }}</td>
                  <td v-if="columnVisible.grade">{{ getFirstGrade(q) }}</td>
                  <td v-if="columnVisible.unitPrice" class="mono">{{ getFirstPrice(q) }}</td>
                  <td v-if="columnVisible.status"><span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span></td>
                  <td v-if="columnVisible.notes">{{ q.notes || '-' }}</td>
                  <td class="cell-actions">
                    <button class="btn btn-sm btn-outline" @click="openEditModal(q)"><Icon name="edit" :size="14" /> 编辑</button>
                    <button class="btn btn-sm btn-outline" @click="handleDuplicate(q)"><Icon name="list" :size="14" /> 复制</button>
                    <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)"><Icon name="eye" :size="14" /> 预览</button>
                    <button class="btn btn-sm btn-outline" @click="sendQuoteByEmail(q)">[邮件] 邮件</button>
                    <button class="btn btn-sm btn-outline" @click="openFollowUpModal(q)">[电话] 电话</button>
                    <button v-if="canApprove && canApproveQ(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)"><Icon name="checkCircle" :size="14" /> 确认</button>
                    <button v-if="q.status === 'approved' || q.status === 'accepted'" class="btn btn-sm btn-outline" @click="convertToDelivery(q)"><Icon name="truck" :size="14" /> 送货</button>
                    <button v-if="q.status === 'approved' || q.status === 'accepted'" class="btn btn-sm btn-outline" @click="convertToContract(q)"><Icon name="file" :size="14" /> 合同</button>
                    <button class="btn btn-sm btn-outline" @click="openVersionModal(q)"><Icon name="refresh" :size="14" /> 版本</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="totalPages > 1" class="pagination-bar">
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage = 1">«</button>
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
            <button v-for="p in visiblePages" :key="p" class="pagination-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage = totalPages">»</button>
            <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredQuotations.length }} 条</span>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'list'" class="panel-card">
        <div class="panel-card-body">
          <div v-if="filteredQuotations.length === 0" class="empty-state"><div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无报价数据</div>
          <div v-for="q in filteredQuotations" :key="q.id" class="list-item" @click="openEditModal(q)">
            <div class="list-item-check" @click.stop><div class="checkbox" :class="{ checked: selectedIds.includes(q.id) }" @click="toggleSelect(q.id)"><Icon name="checkCircle" :size="14" /></div></div>
            <div class="list-item-avatar" :style="{ background: statusColors[q.status] || '#94a3b8' }">{{ (q.quoteNo || '?').slice(-3) }}</div>
            <div class="list-item-main">
              <div class="list-item-row1">
                <strong class="list-item-name"><Icon name="checkCircle" :size="14" /> {{ q.quoteNo }}</strong>
                <span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
                <span class="mono" :class="profitClass(q.profitMargin)"><Icon name="chevronDown" :size="14" /> {{ q.profitMargin || 0 }}%</span>
              </div>
              <div class="list-item-row2">
                <span><Icon name="building" :size="14" /> {{ q.customerName }}</span>
                <span><Icon name="calendar" :size="14" /> {{ q.date }}</span>
                <span v-if="q.expiryDate"><Icon name="bell" :size="14" /> 到期 {{ q.expiryDate }}</span>
              </div>
              <div class="list-item-row3">
                <span class="mono"><Icon name="dollar" :size="14" /> ¥{{ formatNumber(q.total) }}</span>
                <span v-if="q.notes" class="text-muted">[评论] {{ q.notes }}</span>
              </div>
            </div>
            <div class="list-item-actions" @click.stop>
              <button class="btn btn-sm btn-outline" @click="openEditModal(q)"><Icon name="edit" :size="14" /> 编辑</button>
              <button v-if="canApprove && canApproveQ(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)"><Icon name="checkCircle" :size="14" /> 确认</button>
              <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)"><Icon name="eye" :size="14" /> 预览</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentView === 'card'" class="card-grid">
        <div v-if="filteredQuotations.length === 0" class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><Icon name="empty" :size="32" /></div>暂无报价数据</div>
        <div v-for="q in filteredQuotations" :key="q.id" class="quote-card" :class="'card-status-' + q.status">
          <div class="quote-card-header">
            <strong class="mono"><Icon name="checkCircle" :size="14" /> {{ q.quoteNo }}</strong>
            <span class="status-badge" :class="'status-' + q.status">{{ statusLabels[q.status] || q.status }}</span>
          </div>
          <div class="quote-card-body">
            <div class="quote-card-field"><span class="field-label"><Icon name="building" :size="14" /> 客户</span><span>{{ q.customerName }}</span></div>
            <div class="quote-card-field"><span class="field-label"><Icon name="dollar" :size="14" /> 金额</span><span class="mono">¥{{ formatNumber(q.total) }}</span></div>
            <div class="quote-card-field"><span class="field-label"><Icon name="chevronDown" :size="14" /> 利润率</span><span class="mono" :class="profitClass(q.profitMargin)">{{ q.profitMargin || 0 }}%</span></div>
            <div class="quote-card-field"><span class="field-label"><Icon name="bell" :size="14" /> 到期日</span><span>{{ q.expiryDate || '-' }}</span></div>
          </div>
          <div class="quote-card-footer">
            <button class="btn btn-sm btn-outline" @click="openEditModal(q)"><Icon name="edit" :size="14" /> 编辑</button>
            <button v-if="canApprove && canApproveQ(q)" class="btn btn-sm btn-primary" @click="handleApprove(q)"><Icon name="checkCircle" :size="14" /> 确认</button>
            <button class="btn btn-sm btn-outline" @click="openQuoteLetter(q)"><Icon name="eye" :size="14" /> 预览</button>
          </div>
        </div>
      </div>
    </template>

    <QuotationCalendarView v-if="currentView === 'calendar' || currentView === 'week'" :currentView="currentView" :quotations="filteredQuotations" @edit="openEditModal" />

    </div>

    <QuotationFormModal
      :showModal="showEditModal"
      :editingQuotation="editingQuotation"
      @close="showEditModal = false"
      @save="handleFormSave"
    />
    <QuotationPreview
      :showModal="showQuoteLetterModal"
      :quotation="letterQuote"
      @close="showQuoteLetterModal = false"
    />
    <QuotationTemplateModal
      :showModal="showTemplateModal"
      @close="showTemplateModal = false"
      @apply="createQuoteFromTemplate"
    />
    <QuotationFollowUpModal :showModal="showFollowUpModal" :quote="followUpQuote" @close="showFollowUpModal = false" />
    <QuotationVersionModal :showModal="showVersionModal" :quote="versionQuote" @close="showVersionModal = false" />
    <QuotationComparisonModal :showModal="showComparisonModal" :selectedIds="selectedIds" @close="showComparisonModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuotationStore } from '@/stores/quotation'
import { useCustomerStore } from '@/stores/customer'
import { usePermission } from '@/utils/permissionGuard'
import QuotationFormModal from '@/components/quotations/QuotationFormModal.vue'
import QuotationPreview from '@/components/quotations/QuotationPreview.vue'
import QuotationTemplateModal from '@/components/quotations/QuotationTemplateModal.vue'
import QuotationFollowUpModal from '@/components/quotations/QuotationFollowUpModal.vue'
import QuotationVersionModal from '@/components/quotations/QuotationVersionModal.vue'
import QuotationComparisonModal from '@/components/quotations/QuotationComparisonModal.vue'
import QuotationAnalytics from '@/components/quotations/QuotationAnalytics.vue'
import QuotationCalendarView from '@/components/quotations/QuotationCalendarView.vue'

const quotationStore = useQuotationStore()
const customerStore = useCustomerStore()
const perm = usePermission()

const canCreate = computed(() => perm.isAllowed('quote_contract', 'canCreateQuote'))
const canDelete = computed(() => perm.isAllowed('quote_contract', 'canDeleteQuote'))
const canApprove = computed(() => perm.isAllowed('quote_contract', 'canApproveQuote'))

const currentView = ref('table')
const viewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const searchText = ref('')
const filterStatus = ref('')
const sortField = ref('date')
const sortDir = ref('desc')
const currentPage = ref(1)
const pageSize = 15
const selectedIds = ref([])
const showAnalytics = ref(false)
const showComparisonModal = ref(false)
const showQuoteLetterModal = ref(false)
const showTemplateModal = ref(false)
const letterQuote = ref(null)

const showColumnConfig = ref(false)
const colDropdownStyle = ref({})
const columnDefs = [
  { key: 'check', label: '选择', hidden: true },
  { key: 'quoteNo', label: '报价编码' },
  { key: 'date', label: '日期' },
  { key: 'customer', label: '客户' },
  { key: 'grade', label: '牌号' },
  { key: 'unitPrice', label: '单价含税' },
  { key: 'status', label: '状态' },
  { key: 'notes', label: '备注' },
  { key: 'actions', label: '操作', hidden: true }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => !c.hidden).map(c => [c.key, true])))
const visibleColCount = computed(() => columnDefs.filter(c => !c.hidden && columnVisible.value[c.key]).length)

function toggleColumnConfig(e) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = e.target.getBoundingClientRect()
    colDropdownStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
}
function closeColumnConfig() {
  showColumnConfig.value = false
}

function getFirstGrade(q) {
  try {
    const items = JSON.parse(q.items || '[]')
    if (items.length > 0 && items[0].grade) return items[0].grade
  } catch { /* ignore */ }
  return '-'
}

function getFirstPrice(q) {
  try {
    const items = JSON.parse(q.items || '[]')
    if (items.length > 0 && items[0].price) return '¥' + parseFloat(items[0].price).toFixed(2)
  } catch { /* ignore */ }
  return '-'
}

const statusLabels = {
  draft: '草稿', pending: '待审批', approved: '已审批',
  sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期'
}
const statusColors = {
  draft: '#64748b', pending: '#f59e0b', approved: '#3b82f6',
  sent: '#06b6d4', accepted: '#22c55e', rejected: '#ef4444', expired: '#94a3b8'
}

const filteredQuotations = computed(() => {
  let list = [...quotationStore.quotations]
  if (searchText.value) {
    const s = searchText.value.toLowerCase()
    list = list.filter(q =>
      (q.quoteNo || '').toLowerCase().includes(s) ||
      (q.customerName || '').toLowerCase().includes(s) ||
      (q.customerFullName || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) {
    list = list.filter(q => q.status === filterStatus.value)
  }
  list.sort((a, b) => {
    let va = a[sortField.value], vb = b[sortField.value]
    if (sortField.value === 'total' || sortField.value === 'profitMargin') {
      va = parseFloat(va) || 0
      vb = parseFloat(vb) || 0
    }
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredQuotations.value.length / pageSize)))
const pagedQuotations = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredQuotations.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const sp = Math.max(1, currentPage.value - 2)
  const ep = Math.min(totalPages.value, currentPage.value + 2)
  const pages = []
  for (let p = sp; p <= ep; p++) pages.push(p)
  return pages
})

const isAllSelected = computed(() =>
  pagedQuotations.value.length > 0 && pagedQuotations.value.every(q => selectedIds.value.includes(q.id))
)

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !pagedQuotations.value.some(q => q.id === id))
  } else {
    for (const q of pagedQuotations.value) {
      if (!selectedIds.value.includes(q.id)) selectedIds.value.push(q.id)
    }
  }
}


function profitClass(margin) {
  const m = parseFloat(margin) || 0
  if (m >= 20) return 'text-success'
  if (m >= 10) return 'text-warning'
  return 'text-danger'
}

function canApproveQ(q) {
  return q.status === 'pending' || q.status === 'draft'
}

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const showEditModal = ref(false)
const editingQuotation = ref(null)

function openAddModal() {
  editingQuotation.value = null
  showEditModal.value = true
}

function openEditModal(q) {
  editingQuotation.value = q
  showEditModal.value = true
}

function handleFormSave({ data, isEditing, editingId }) {
  if (isEditing) {
    quotationStore.saveVersion(editingId, '编辑保存')
    quotationStore.updateQuotation(editingId, data)
  } else {
    quotationStore.addQuotation(data)
  }
  showEditModal.value = false
}

function handleDuplicate(q) {
  const dup = quotationStore.duplicateQuotation(q.id)
  if (dup) {
    alert('已复制报价单 ' + q.quoteNo + ' 的内容，新单号：' + dup.quoteNo)
  }
}

function handleApprove(q) {
  if (confirm('确认审批报价单 ' + q.quoteNo + '？')) {
    quotationStore.changeStatus(q.id, 'approved')
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条报价？')) {
    quotationStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleBatchApprove() {
  if (confirm('确认审批选中的 ' + selectedIds.value.length + ' 条报价？')) {
    quotationStore.batchApprove(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  const data = JSON.stringify(quotationStore.quotations, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quotations_export.json'
  a.click()
  URL.revokeObjectURL(url)
}

function openQuoteLetter(q) {
  letterQuote.value = q
  showQuoteLetterModal.value = true
}

function sendQuoteByEmail(q) {
  const email = q.custEmail || ''
  const subject = encodeURIComponent('报价函 - ' + q.quoteNo + ' - 苏州冠久新材料科技有限公司')
  const body = encodeURIComponent(
    '尊敬的' + (q.custContact || q.customerName || '') + '：\n\n感谢贵司的信任与支持！\n\n现就贵司近期提出的材料采购需求，我司提供报价方案如下：\n报价单号：' + q.quoteNo + '\n报价日期：' + q.date + '\n有效期至：' + q.expiryDate + '\n含税合计：¥' + formatNumber(q.total) + '\n\n详细报价函请见附件。\n\n如有任何疑问，请随时联系我们。\n\n此致\n敬礼\n\n' + (q.senderCompany || '苏州冠久新材料科技有限公司') + '\n' + (q.senderContact || '') + '\n电话：' + (q.senderPhone || '') + '\n邮箱：' + (q.senderEmail || '')
  )
  const mailtoUrl = 'mailto:' + email + '?subject=' + subject + '&body=' + body
  window.open(mailtoUrl, '_blank')
}

function convertToDelivery(q) {
  const result = quotationStore.convertToDelivery(q.id)
  if (!result.success) {
    alert(result.error)
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转送货单，请前往送货管理查看。')
}

function convertToContract(q) {
  const result = quotationStore.convertToContract(q.id)
  if (!result.success) {
    alert(result.error)
    return
  }
  alert('报价单 ' + q.quoteNo + ' 已标记为转合同，请前往合同管理查看。')
}

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

const showFollowUpModal = ref(false)
const followUpQuote = ref(null)

function openFollowUpModal(q) {
  followUpQuote.value = q
  showFollowUpModal.value = true
}

const showVersionModal = ref(false)
const versionQuote = ref(null)

function openVersionModal(q) {
  versionQuote.value = q
  showVersionModal.value = true
}

function openComparisonModal() {
  if (selectedIds.value.length < 2) {
    alert('请至少勾选2条报价进行对比')
    return
  }
  if (selectedIds.value.length > 3) {
    alert('最多同时对比3条报价')
    return
  }
  showComparisonModal.value = true
}

function createQuoteFromTemplate(tpl) {
  showEditModal.value = true
  editingQuotation.value = { _fromTemplate: tpl }
}

watch([searchText, filterStatus], () => { currentPage.value = 1 })

function closeColumnConfigOnClick(e) {
  const wrapper = e.target.closest('.column-config-wrapper')
  if (!wrapper && showColumnConfig.value) closeColumnConfig()
}

onMounted(() => {
  quotationStore.initSeedData()
  document.addEventListener('click', closeColumnConfigOnClick)
  window.addEventListener('resize', closeColumnConfig)
  window.addEventListener('scroll', closeColumnConfig, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeColumnConfigOnClick)
  window.removeEventListener('resize', closeColumnConfig)
  window.removeEventListener('scroll', closeColumnConfig, true)
})
</script>

<style scoped>
.quotation-page { padding: 0; margin: calc(var(--space-6) * -1); min-height: calc(100vh - var(--topbar-height) - var(--space-6) * 2); display: flex; flex-direction: column; }
.quotation-page-inner { padding: var(--space-6); flex: 1; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 4px 0 0; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: 6px 14px; font-size: var(--font-size-sm); border: none; background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s; }
.view-btn + .view-btn { border-left: 1px solid var(--color-border); }
.view-btn.active { background: var(--color-accent); color: #fff; }
.quotation-toolbar { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.quotation-search { position: relative; flex: 1; min-width: 200px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }
.search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text-primary); }
.quotation-filters { display: flex; gap: var(--space-2); align-items: center; }
.filter-select { min-width: 120px; font-size: var(--font-size-sm); }
.quotation-stats-bar { display: flex; gap: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--color-bg-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: var(--font-size-base); flex-wrap: wrap; align-items: center; }
.stat-item { display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.stat-dot.total { background: var(--color-accent); }
.stat-dot.draft { background: var(--color-text-tertiary); }
.stat-dot.pending { background: var(--color-warning); }
.stat-dot.approved { background: var(--color-accent); }
.stat-dot.accepted { background: var(--color-success); }
.stat-money { font-weight: 700; color: var(--color-text-primary); font-size: var(--font-size-base); }
.stat-icon { font-size: var(--font-size-sm); margin-right: 2px; vertical-align: middle; line-height: 1; }
.th-icon { font-size: var(--font-size-sm); margin-right: 3px; vertical-align: middle; line-height: 1; }
.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: var(--font-size-base); }
.status-badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
.status-draft { background: var(--color-gray-subtle); color: var(--color-text-secondary); }
.status-pending { background: var(--color-warning-subtle); color: var(--color-warning); }
.status-approved { background: var(--color-info-subtle); color: var(--color-accent); }
.status-sent { background: var(--color-cyan-subtle); color: var(--color-info); }
.status-accepted { background: var(--color-success-subtle); color: var(--color-success); }
.status-rejected { background: var(--color-danger-subtle); color: var(--color-danger); }
.status-expired { background: var(--color-gray-subtle); color: var(--color-text-tertiary); }
.mono { font-family: 'JetBrains Mono', 'Cascadia Code', monospace; }
.text-success { color: var(--color-success, #22c55e); }
.text-warning { color: var(--color-warning, #f59e0b); }
.text-danger { color: var(--color-danger, #ef4444); }
.text-accent { color: var(--color-accent); }
.text-muted { color: var(--color-text-tertiary); }
.cell-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.empty-state { text-align: center; padding: 40px; color: var(--color-text-tertiary); }
.empty-state-icon { font-size: 36px; margin-bottom: 12px; }
.pagination-bar { display: flex; align-items: center; gap: 4px; padding: 8px 16px; }
.pagination-btn { padding: 4px 10px; font-size: var(--font-size-xs); border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-surface); cursor: pointer; }
.pagination-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-info { font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin-left: 8px; }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.15s; }
.list-item:hover { background: var(--color-bg-secondary); }
.list-item-check { flex-shrink: 0; }
.list-item-avatar { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: var(--font-size-sm); flex-shrink: 0; }
.list-item-main { flex: 1; min-width: 0; }
.list-item-row1 { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.list-item-name { font-size: var(--font-size-base); }
.list-item-row2 { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: 2px; }
.list-item-row3 { display: flex; gap: 12px; font-size: var(--font-size-sm); }
.list-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); }
.quote-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; transition: box-shadow 0.15s; }
.quote-card:hover { box-shadow: var(--shadow-md); }
.quote-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.quote-card-body { padding: 12px 16px; }
.quote-card-field { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-size-base); }
.field-label { color: var(--color-text-secondary); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.quote-card-footer { display: flex; gap: 4px; padding: 8px 16px; border-top: 1px solid var(--color-border); background: var(--color-bg-secondary); }
.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-secondary:hover { background: var(--color-bg-tertiary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: var(--font-size-xs); }
.btn-outline { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-outline:hover { background: var(--color-bg-secondary); }
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { color: var(--color-accent); }
.sort-icon { font-size: var(--font-size-xs); margin-left: 2px; }
.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex: 1; display: flex; flex-direction: column; }
.panel-card-header { padding: 12px 16px; font-weight: 600; font-size: var(--font-size-base); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.panel-card-body { padding: 16px; flex: 1; }
.panel-card-body.no-padding { padding: 0; flex: 1; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: var(--font-size-sm); white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.data-table tbody tr:hover { background: var(--color-bg-secondary); }
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
@media (max-width: 1024px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .quotation-page { margin: calc(var(--space-3) * -1); }
  .quotation-page-inner { padding: var(--space-3); }
  .page-header { flex-direction: column; }
  .card-grid { grid-template-columns: 1fr; }
}
</style>
