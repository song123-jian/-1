﻿<template>
  <div class="contract-page">
    <div class="page-header">
      <div>
        <h2 class="page-header-title">合同管理</h2>
        <p class="page-header-subtitle">合同全生命周期管理：创建<Icon name="chevronRight" :size="14" />审批<Icon name="chevronRight" :size="14" />签订<Icon name="chevronRight" :size="14" />归档</p>
      </div>
      <div class="page-header-actions">
        <div class="view-toggle">
          <button v-for="v in viewModes" :key="v.key" class="view-btn" :class="{ active: currentView === v.key }" :title="v.icon + ' ' + v.label" @click="currentView = v.key"><Icon :name="v.icon" :size="14" /> {{ v.label }}</button>
        </div>
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.hideable !== false)" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
        <button class="btn btn-outline" @click="showAnalytics = !showAnalytics">{{ showAnalytics ? '列表' : '分析' }}</button>
        <button class="btn btn-outline" @click="handleExport">导出</button>
        <button v-if="canDelete" class="btn btn-outline" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</button>
        <button class="btn btn-outline" @click="openTemplateManager">模板管理</button>
        <button v-if="canCreate" class="btn btn-primary" @click="openWizard">新建合同</button>
      </div>
    </div>

    <div class="contract-toolbar">
      <select v-model="filterStatus" class="form-select filter-select">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_approval">待审批</option>
        <option value="approved">已审批</option>
        <option value="signed">已签订</option>
        <option value="archived">已归档</option>
        <option value="cancelled">已作废</option>
      </select>
      <select v-model="filterSettlement" class="form-select filter-select">
        <option value="">全部结算方式</option>
        <option value="款到发货">款到发货</option>
        <option value="月结30天">月结30天</option>
        <option value="月结60天">月结60天</option>
        <option value="月结90天">月结90天</option>
        <option value="货到付款">货到付款</option>
      </select>
      <select v-model="filterType" class="form-select filter-select">
        <option value="">全部类型</option>
        <option value="购销合同">购销合同</option>
        <option value="采购合同">采购合同</option>
        <option value="服务合同">服务合同</option>
        <option value="框架协议">框架协议</option>
        <option value="技术协议">技术协议</option>
      </select>
      <div class="contract-search">
        <span class="search-icon"><Icon name="search" :size="14" /></span>
        <input v-model="searchText" type="text" class="search-input" placeholder="搜索合同编号/客户名称/合同类型..." />
      </div>
      <div class="filter-date-group">
        <input v-model="filterDateFrom" type="date" class="form-input filter-date" title="签订日期起" />
        <span class="filter-date-sep">~</span>
        <input v-model="filterDateTo" type="date" class="form-input filter-date" title="签订日期止" />
      </div>
      <input v-model.number="filterAmountMin" type="number" class="form-input filter-amount" placeholder="金额≥(万)" />
      <input v-model.number="filterAmountMax" type="number" class="form-input filter-amount" placeholder="金额≤(万)" />
      <button class="btn btn-outline filter-reset-btn" @click="resetFilters">重置</button>
    </div>

    <div class="contract-stats-bar">
      <div class="stats-ring-section">
        <svg width="48" height="48" viewBox="0 0 48 48" class="stats-ring-svg">
          <circle cx="24" cy="24" r="18" fill="none" stroke="var(--color-border)" stroke-width="3" />
          <circle cx="24" cy="24" r="18" fill="none" :stroke="signRateColor" stroke-width="3" stroke-linecap="round" :stroke-dasharray="signRateDash" stroke-dashoffset="0" transform="rotate(-90 24 24)" class="stats-ring-progress" />
        </svg>
        <div class="stats-ring-text">
          <span class="stats-ring-percent" :style="{ color: signRateColor }">{{ signRate }}%</span>
          <span class="stats-ring-label">签订率</span>
        </div>
      </div>
      <div class="stats-items">
        <div class="stat-item"><span class="stat-dot total"></span><span class="stat-num">{{ contractStore.contracts.length }}</span><span class="stat-label">总计</span></div>
        <div class="stat-item"><span class="stat-dot draft"></span><span class="stat-num">{{ contractStore.draftCount }}</span><span class="stat-label">草稿</span></div>
        <div class="stat-item"><span class="stat-dot pending"></span><span class="stat-num">{{ contractStore.pendingApprovalCount }}</span><span class="stat-label">待审批</span></div>
        <div class="stat-item"><span class="stat-dot approved"></span><span class="stat-num">{{ contractStore.approvedCount }}</span><span class="stat-label">已审批</span></div>
        <div class="stat-item"><span class="stat-dot signed"></span><span class="stat-num">{{ contractStore.signedCount }}</span><span class="stat-label">已签订</span></div>
      </div>
      <div class="stats-money-items">
        <div class="stat-money-item"><span class="stat-money-val">¥{{ formatNumber(contractStore.totalAmount) }}</span><span class="stat-money-label">总额</span></div>
        <div class="stat-money-item"><span class="stat-money-val">¥{{ formatNumber(contractStore.signedAmount) }}</span><span class="stat-money-label">已签订</span></div>
      </div>
      <div v-if="contractStore.expiringCount > 0" class="stat-item stat-expiring">
        <span class="stat-dot expiring"></span><span class="stat-num">{{ contractStore.expiringCount }}</span><span class="stat-label">即将到期</span>
      </div>
    </div>

    <div v-if="selectedIds.length > 0" class="batch-bar">
      <span>已选 {{ selectedIds.length }} 项</span>
      <button class="btn btn-ghost btn-sm" @click="selectedIds = []">取消选择</button>
    </div>

    <div v-if="showAnalytics" class="analytics-panel">
      <div class="analytics-kpis">
        <div class="kpi-card"><div class="kpi-value">{{ contractStore.contracts.length }}</div><div class="kpi-label">合同总数</div></div>
        <div class="kpi-card"><div class="kpi-value text-success">{{ contractStore.signedCount }}</div><div class="kpi-label">已签订</div></div>
        <div class="kpi-card"><div class="kpi-value text-accent">¥{{ formatNumber(contractStore.signedAmount) }}</div><div class="kpi-label">已签金额</div></div>
        <div class="kpi-card"><div class="kpi-value text-warning">{{ contractStore.expiringCount }}</div><div class="kpi-label">即将到期</div></div>
        <div class="kpi-card"><div class="kpi-value text-danger">{{ contractStore.cancelledCount }}</div><div class="kpi-label">已作废</div></div>
      </div>
      <div class="analytics-grid">
        <div class="panel-card">
          <div class="panel-card-header">状态分布</div>
          <div class="panel-card-body">
            <div v-for="(label, key) in statusLabels" :key="key" class="bar-row">
              <span class="bar-label">{{ label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: barWidth(key), background: statusColors[key] }"></div></div>
              <span class="bar-value">{{ contractStore.statusCounts[key] || 0 }}</span>
            </div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-card-header">客户合同金额 TOP10</div>
          <div class="panel-card-body">
            <div v-for="(c, i) in contractStore.customerTopList" :key="c.name" class="top-row">
              <span class="top-rank">{{ i + 1 }}</span>
              <span class="top-name">{{ c.name }}</span>
              <span class="top-amount mono">¥{{ formatNumber(c.amount) }}</span>
            </div>
            <div v-if="contractStore.customerTopList.length === 0" class="empty-hint">暂无数据</div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="currentView === 'table'" class="panel-card">
        <div class="panel-card-body no-padding">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40px"><div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll">[√]</div></th>
                  <th v-if="columnVisible.contractNo" style="width:140px">合同编号</th>
                  <th v-if="columnVisible.signDate" style="width:110px;text-align:center">签订日期</th>
                  <th v-if="columnVisible.partyA" style="min-width:100px">甲方</th>
                  <th v-if="columnVisible.partyB" style="min-width:100px">乙方</th>
                  <th v-if="columnVisible.paymentDate" style="width:110px;text-align:center">回款日</th>
                  <th v-if="columnVisible.unitPrice" style="width:100px;text-align:right">单价</th>
                  <th v-if="columnVisible.totalAmount" style="width:120px;text-align:right">金额</th>
                  <th v-if="columnVisible.settlement" style="width:100px;text-align:center">结算方式</th>
                  <th v-if="columnVisible.status" style="width:80px;text-align:center">状态</th>
                  <th v-if="columnVisible.relatedDocs" style="width:80px;text-align:center">关联单据</th>
                  <th style="min-width:200px;text-align:center">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pagedContracts.length === 0"><td colspan="12" class="empty-state"><div class="empty-state-icon"><Icon name="file" :size="24" /></div>暂无合同数据</td></tr>
                <tr v-for="c in pagedContracts" :key="c.id">
                  <td><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="toggleSelect(c.id)">[√]</div></td>
                  <td v-if="columnVisible.contractNo" class="mono"><strong style="color:var(--color-accent)">{{ c.contractNo }}</strong></td>
                  <td v-if="columnVisible.signDate" style="text-align:center">{{ c.signDate || '-' }}</td>
                  <td v-if="columnVisible.partyA">{{ c.partyA }}</td>
                  <td v-if="columnVisible.partyB">{{ c.partyB || '苏州冠久新材料科技有限公司' }}</td>
                  <td v-if="columnVisible.paymentDate" style="text-align:center">{{ getPaymentDate(c) }}</td>
                  <td v-if="columnVisible.unitPrice" class="mono" style="text-align:right">{{ getFirstUnitPrice(c) }}</td>
                  <td v-if="columnVisible.totalAmount" class="mono" style="text-align:right">¥{{ formatNumber(c.totalAmount) }}</td>
                  <td v-if="columnVisible.settlement" style="text-align:center">{{ c.settlement || '-' }}</td>
                  <td v-if="columnVisible.status" style="text-align:center"><span class="status-badge" :class="'status-' + c.status">{{ statusLabels[c.status] || c.status }}</span></td>
                  <td v-if="columnVisible.relatedDocs" style="text-align:center">
                    <span v-if="getRelatedCount(c) > 0" class="related-count-badge" @click="openPreview(c); previewTab = 'related'">{{ getRelatedCount(c) }}份</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td class="cell-actions">
                    <button class="action-btn action-btn-text" @click="openPreview(c)">预览</button>
                    <button class="action-btn action-btn-text" @click="openWizard(c.id)">编辑</button>
                    <button v-if="c.status === 'draft'" class="action-btn action-btn-text" @click="handleSubmitApproval(c)" style="color:var(--color-purple)">提交审批</button>
                    <button v-if="c.status === 'pending_approval' && canApprove" class="action-btn action-btn-text" @click="handleApprove(c)" style="color:var(--color-success)">通过</button>
                    <button v-if="c.status === 'pending_approval'" class="action-btn action-btn-text" @click="handleReject(c)" style="color:var(--color-danger)">驳回</button>
                    <button v-if="c.status === 'approved' && canSign" class="action-btn action-btn-text" @click="handleSign(c)" style="color:var(--color-success)">签订</button>
                    <button v-if="c.status === 'signed'" class="action-btn action-btn-text" @click="handleArchive(c)" style="color:var(--color-info)">归档</button>
                    <button v-if="c.status === 'approved' || c.status === 'signed'" class="action-btn action-btn-text" @click="handleCancel(c)" style="color:var(--color-danger)">作废</button>
                    <button class="action-btn action-btn-text" @click="handleDuplicate(c)">复制</button>
                    <button v-if="canDelete" class="action-btn action-btn-text" style="color:var(--color-danger)" @click="handleDelete(c)">删除</button>
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
            <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ filteredContracts.length }} 条</span>
          </div>
        </div>
      </div>

      <ContractListView
        :currentView="currentView"
        :contracts="filteredContracts"
        :selectedIds="selectedIds"
        :statusLabels="statusLabels"
        :statusColors="statusColors"
        :canDelete="canDelete"
        :canSign="canSign"
        @openPreview="openPreview"
        @openWizard="openWizard"
        @toggleSelect="toggleSelect"
        @duplicate="handleDuplicate"
        @delete="handleDelete"
        @submitApproval="handleSubmitApproval"
        @sign="handleSign"
      />

      <ContractCalendarView
        :currentView="currentView"
        :calendarMonth="calendarMonth"
        :calendarDays="calendarDays"
        :weekDays="weekDays"
        :statusLabels="statusLabels"
        :statusColors="statusColors"
        @openPreview="openPreview"
        @prevMonth="prevMonth"
        @nextMonth="nextMonth"
        @prevWeek="prevWeek"
        @nextWeek="nextWeek"
      />
    </template>

    <Teleport to="body">
      <ContractFormModal
        :showModal="showWizard"
        :wizardStep="wizardStep"
        :wizardData="wizardData"
        :isEditing="isEditing"
        :termsEditing="termsEditing"
        :customers="customerStore.customers"
        :saveAsTemplateFlag="saveAsTemplateFlag"
        :showTemplateModal="showTemplateModal"
        :templates="contractStore.templates"
        :aiParsing="aiParsing"
        :showRejectModal="showRejectModal"
        :rejectReason="rejectReason"
        @close="closeWizard"
        @nextStep="nextStep"
        @prevStep="wizardStep--"
        @saveDraft="saveDraft"
        @submitContract="submitContract"
        @addProductRow="addProductRow"
        @removeProductRow="removeProductRow"
        @partyAChange="onPartyAChange"
        @uploadSeal="uploadSeal"
        @toggleTermsEditing="termsEditing = !termsEditing"
        @update:saveAsTemplateFlag="saveAsTemplateFlag = $event"
        @closeTemplateModal="showTemplateModal = false"
        @templateDrop="handleContractTemplateDrop"
        @templateFileSelect="handleContractTemplateFileSelect"
        @useTemplate="useTemplate"
        @deleteTemplate="deleteTemplate"
        @saveAsTemplate="saveCurrentAsTemplate"
        @closeRejectModal="showRejectModal = false"
        @update:rejectReason="rejectReason = $event"
        @confirmReject="confirmReject"
      />

      <ContractPreview
        :showPreview="showPreview"
        :contract="previewContract"
        :previewTab="previewTab"
        @close="showPreview = false; previewContract = null; document.body.style.overflow = ''"
        @updatePreviewTab="previewTab = $event"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useContractStore } from '@/stores/contract'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useCollectionStore } from '@/stores/collection'
import { useDeliveryStore } from '@/stores/delivery'
import { usePermission } from '@/utils/permissionGuard'

import ContractFormModal from '@/components/contracts/ContractFormModal.vue'
import ContractPreview from '@/components/contracts/ContractPreview.vue'
import ContractCalendarView from '@/components/contracts/ContractCalendarView.vue'
import ContractListView from '@/components/contracts/ContractListView.vue'

const contractStore = useContractStore()
const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const collectionStore = useCollectionStore()
const deliveryStore = useDeliveryStore()
const perm = usePermission()

const canCreate = computed(() => perm.isAllowed('quote_contract', 'canCreateContract'))
const canDelete = computed(() => perm.isAllowed('quote_contract', 'canDeleteContract'))
const canSign = computed(() => perm.isAllowed('quote_contract', 'canSignContract'))
const canApprove = computed(() => perm.isAllowed('quote_contract', 'canApproveContract'))

const statusLabels = {
  draft: '草稿', pending_approval: '待审批', approved: '已审批',
  signed: '已签订', archived: '已归档', cancelled: '已作废'
}
const statusColors = {
  draft: '#64748b', pending_approval: '#f59e0b', approved: '#3b82f6',
  signed: '#22c55e', archived: '#06b6d4', cancelled: '#ef4444'
}

const RING_CIRC = 2 * Math.PI * 18
const signRate = computed(() => {
  const total = contractStore.contracts.length
  if (total === 0) return 0
  return Math.round((contractStore.signedCount / total) * 100)
})
const signRateColor = computed(() => {
  const r = signRate.value
  if (r >= 60) return 'var(--color-success)'
  if (r >= 30) return 'var(--color-warning)'
  return 'var(--color-danger)'
})
const signRateDash = computed(() => {
  const p = signRate.value / 100
  return `${p * RING_CIRC} ${RING_CIRC}`
})

const viewModes = [
  { key: 'table', icon: 'table', label: '表格' },
  { key: 'list', icon: 'list', label: '列表' },
  { key: 'card', icon: 'card', label: '卡片' },
  { key: 'calendar', icon: 'calendar', label: '日历' },
  { key: 'week', icon: 'calendar', label: '周视图' }
]

const currentView = ref('table')
const showAnalytics = ref(false)
const searchText = ref('')
const filterStatus = ref('')
const filterSettlement = ref('')
const filterType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterAmountMin = ref(0)
const filterAmountMax = ref(0)
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = 15

const columnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'contractNo', label: '合同编号' },
  { key: 'signDate', label: '签订日期' },
  { key: 'partyA', label: '甲方' },
  { key: 'partyB', label: '乙方' },
  { key: 'paymentDate', label: '回款日' },
  { key: 'unitPrice', label: '单价' },
  { key: 'totalAmount', label: '金额' },
  { key: 'settlement', label: '结算方式' },
  { key: 'status', label: '状态' },
  { key: 'relatedDocs', label: '关联单据' },
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

const filteredContracts = computed(() => {
  let list = contractStore.contracts
  const s = searchText.value.toLowerCase()
  if (s) {
    list = list.filter(c =>
      (c.contractNo || '').toLowerCase().includes(s) ||
      (c.partyA || '').toLowerCase().includes(s) ||
      (c.contractType || '').toLowerCase().includes(s)
    )
  }
  if (filterStatus.value) list = list.filter(c => c.status === filterStatus.value)
  if (filterSettlement.value) list = list.filter(c => c.settlement === filterSettlement.value)
  if (filterType.value) list = list.filter(c => (c.contractType || '购销合同') === filterType.value)
  if (filterDateFrom.value) list = list.filter(c => c.signDate && c.signDate >= filterDateFrom.value)
  if (filterDateTo.value) list = list.filter(c => c.signDate && c.signDate <= filterDateTo.value)
  if (filterAmountMin.value > 0) list = list.filter(c => (c.totalAmount || 0) >= filterAmountMin.value * 10000)
  if (filterAmountMax.value > 0) list = list.filter(c => (c.totalAmount || 0) <= filterAmountMax.value * 10000)
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredContracts.value.length / pageSize)))
const pagedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredContracts.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  const pages = []
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i)
  return pages
})

const isAllSelected = computed(() =>
  pagedContracts.value.length > 0 && pagedContracts.value.every(c => selectedIds.value.includes(c.id))
)

const calendarMonth = ref(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
const weekViewDate = ref(new Date())

const calendarDays = computed(() => {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days = []
  for (let i = 1 - startPad; i <= lastDay.getDate(); i++) {
    const d = new Date(y, m - 1, i)
    const dateStr = d.toISOString().split('T')[0]
    const contracts = filteredContracts.value.filter(c => c.signDate === dateStr || c.endDate === dateStr)
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: d.getMonth() === m - 1, contracts, isToday: dateStr === new Date().toISOString().split('T')[0] })
  }
  return days
})

const weekDays = computed(() => {
  const base = new Date(weekViewDate.value)
  const dow = (base.getDay() + 6) % 7
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)
  const days = []
  const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const contracts = filteredContracts.value.filter(c => c.signDate === dateStr || c.endDate === dateStr)
    days.push({ date: dateStr, day: d.getDate(), label: weekLabels[i], contracts, isToday: dateStr === new Date().toISOString().split('T')[0] })
  }
  return days
})

function prevMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 1) calendarMonth.value = (y - 1) + '-12'
  else calendarMonth.value = y + '-' + String(m - 1).padStart(2, '0')
}

function nextMonth() {
  const [y, m] = calendarMonth.value.split('-').map(Number)
  if (m === 12) calendarMonth.value = (y + 1) + '-01'
  else calendarMonth.value = y + '-' + String(m + 1).padStart(2, '0')
}

function prevWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() - 7)
  weekViewDate.value = d
}

function nextWeek() {
  const d = new Date(weekViewDate.value)
  d.setDate(d.getDate() + 7)
  weekViewDate.value = d
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !pagedContracts.value.some(c => c.id === id))
  } else {
    for (const c of pagedContracts.value) {
      if (!selectedIds.value.includes(c.id)) selectedIds.value.push(c.id)
    }
  }
}

function barWidth(key) {
  const total = contractStore.contracts.length
  if (total === 0) return '0%'
  return ((contractStore.statusCounts[key] || 0) / total * 100).toFixed(0) + '%'
}

function getPaymentDate(c) {
  if (!c.signDate || !c.settlement) return '-'
  const signDate = new Date(c.signDate)
  const match = c.settlement.match(/(\d+)/)
  if (match) {
    const days = parseInt(match[1])
    signDate.setDate(signDate.getDate() + days)
    return signDate.toISOString().split('T')[0]
  }
  return c.endDate || '-'
}

function getFirstUnitPrice(c) {
  try {
    const products = c.products
    if (Array.isArray(products) && products.length > 0 && products[0].unitPrice) {
      return '¥' + parseFloat(products[0].unitPrice).toFixed(2)
    }
  } catch { /* ignore */ }
  return '-'
}

function formatNumber(n) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const showWizard = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const wizardStep = ref(1)
const termsEditing = ref(false)
const wizardData = ref({})
const saveAsTemplateFlag = ref(false)

function getDefaultWizardData() {
  return {
    contractType: '购销合同',
    contractNo: '',
    partyA: '',
    partyAId: '',
    partyB: '苏州冠久新材料科技有限公司',
    signPlace: '苏州・高新区',
    signDate: new Date().toISOString().split('T')[0],
    endDate: '',
    settlement: '款到发货',
    products: [{ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' }],
    totalAmount: 0,
    terms: contractStore.getDefaultTerms(),
    partyAInfo: { address: '', representative: '', contact: '', date: new Date().toISOString().split('T')[0], seal: '' },
    partyBInfo: { companyName: '苏州冠久新材料科技有限公司', address: '苏州高新区滨河路3337号', representative: '宋建', contact: '15589233039', date: new Date().toISOString().split('T')[0], seal: 'preset' },
    status: 'draft',
    sourceQuoteId: '',
    notes: ''
  }
}

function openWizard(editId) {
  wizardStep.value = 1
  termsEditing.value = false
  if (editId) {
    const c = contractStore.getContractById(editId)
    if (!c) { alert('未找到该合同'); return }
    isEditing.value = true
    editingId.value = editId
    wizardData.value = JSON.parse(JSON.stringify(c))
  } else {
    isEditing.value = false
    editingId.value = null
    wizardData.value = getDefaultWizardData()
  }
  showWizard.value = true
  document.body.style.overflow = 'hidden'
}

function closeWizard() {
  showWizard.value = false
  document.body.style.overflow = ''
  wizardStep.value = 1
  editingId.value = null
}

const productsTotal = computed(() => {
  return wizardData.value.products?.reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0) || 0
})

function addProductRow() {
  wizardData.value.products.push({ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' })
}

function removeProductRow(idx) {
  wizardData.value.products.splice(idx, 1)
  if (wizardData.value.products.length === 0) {
    wizardData.value.products.push({ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' })
  }
}

function onPartyAChange() {
  const name = wizardData.value.partyA
  const c = customerStore.customers.find(x => (x.fullName || x.name) === name)
  if (c) {
    wizardData.value.partyAId = c.id
    wizardData.value.partyAInfo = wizardData.value.partyAInfo || {}
    if (c.address) wizardData.value.partyAInfo.address = c.address
    if (c.contact || c.contactName) wizardData.value.partyAInfo.representative = c.contact || c.contactName
    if (c.phone) wizardData.value.partyAInfo.contact = c.phone
  }
}

function uploadSeal(party) {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = () => {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (party === 'A') {
        wizardData.value.partyAInfo.seal = e.target.result
        wizardData.value.partyAInfo.sealTimestamp = new Date().toISOString()
      } else if (party === 'B') {
        wizardData.value.partyBInfo.seal = e.target.result
        wizardData.value.partyBInfo.sealTimestamp = new Date().toISOString()
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function nextStep() {
  const d = wizardData.value
  if (wizardStep.value === 1) {
    const existing = contractStore.contracts.filter(c => c.contractNo === d.contractNo && c.id !== editingId.value)
    if (d.contractNo && existing.length > 0) { alert('合同编号 ' + d.contractNo + ' 已存在'); return }
    if (d.endDate && d.signDate && d.endDate < d.signDate) { alert('到期日期不能早于签订日期'); return }
  }
  if (wizardStep.value === 2) {
    const hasValid = d.products.some(p => p.productName && p.quantity > 0 && p.unitPrice > 0)
    if (!hasValid) { alert('请至少添加一条完整的产品明细'); return }
    for (let i = 0; i < d.products.length; i++) {
      if (d.products[i].quantity < 0) { alert('第' + (i + 1) + '行数量不能为负数'); return }
      if (d.products[i].unitPrice < 0) { alert('第' + (i + 1) + '行单价不能为负数'); return }
    }
    d.totalAmount = Math.round(productsTotal.value * 100) / 100
  }
  if (wizardStep.value < 4) wizardStep.value++
}

function saveAsTemplateIfNeeded(d) {
  if (!saveAsTemplateFlag.value) return
  const name = prompt('请输入模板名称：', '标准购销合同模板')
  if (name) {
    contractStore.addTemplate({
      name,
      contractType: d.contractType,
      settlement: d.settlement,
      terms: JSON.parse(JSON.stringify(d.terms || {})),
      partyBInfo: JSON.parse(JSON.stringify(d.partyBInfo || {})),
      products: JSON.parse(JSON.stringify(d.products || []))
    })
  }
  saveAsTemplateFlag.value = false
}

function saveDraft() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'draft'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
  } else {
    contractStore.addContract(d)
    editingId.value = contractStore.contracts[contractStore.contracts.length - 1].id
    isEditing.value = true
  }
  saveAsTemplateIfNeeded(d)
  alert('草稿已保存，合同编号: ' + d.contractNo)
}

function submitContract() {
  const d = wizardData.value
  d.totalAmount = Math.round(productsTotal.value * 100) / 100
  d.status = 'pending_approval'
  if (isEditing.value) {
    contractStore.updateContract(editingId.value, d)
    contractStore.addHistoryEvent(editingId.value, 'submit', d.contractNo + ' 提交审批')
  } else {
    const c = contractStore.addContract(d)
    contractStore.addHistoryEvent(c.id, 'submit', c.contractNo + ' 提交审批')
  }
  saveAsTemplateIfNeeded(d)
  closeWizard()
  alert('合同已提交审批')
}

function handleSubmitApproval(c) {
  if (c.status !== 'draft') { alert('只有草稿状态的合同才能提交审批'); return }
  contractStore.changeStatus(c.id, 'pending_approval')
}

function handleApprove(c) {
  if (c.status !== 'pending_approval') { alert('该合同不在待审批状态'); return }
  if (confirm('确认审批通过合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'approved')
  }
}

const showRejectModal = ref(false)
const rejectTargetId = ref(null)
const rejectReason = ref('')

function handleReject(c) {
  if (c.status !== 'pending_approval') { alert('该合同不在待审批状态'); return }
  rejectTargetId.value = c.id
  rejectReason.value = ''
  showRejectModal.value = true
}

function confirmReject() {
  contractStore.changeStatus(rejectTargetId.value, 'draft', { reason: rejectReason.value })
  showRejectModal.value = false
}

function handleSign(c) {
  if (c.status !== 'approved') { alert('只有已审批的合同才能签订'); return }
  if (confirm('确认签订合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'signed')
  }
}

function handleArchive(c) {
  if (c.status !== 'signed') { alert('只有已签订的合同才能归档'); return }
  if (confirm('确认归档合同 ' + c.contractNo + '？')) {
    contractStore.changeStatus(c.id, 'archived')
  }
}

function handleCancel(c) {
  if (c.status !== 'approved' && c.status !== 'signed') { alert('只有已审批或已签订的合同才能作废'); return }
  if (confirm('确认作废合同 ' + c.contractNo + '？作废后不可恢复。')) {
    contractStore.changeStatus(c.id, 'cancelled')
  }
}

function handleDuplicate(c) {
  const dup = contractStore.duplicateContract(c.id)
  if (dup) alert('已复制合同 ' + c.contractNo + '，新单号：' + dup.contractNo)
}

function handleDelete(c) {
  if (confirm('确认删除合同 ' + c.contractNo + '？此操作不可恢复。')) {
    contractStore.deleteContract(c.id)
    selectedIds.value = selectedIds.value.filter(id => id !== c.id)
  }
}

function handleBatchDelete() {
  if (confirm('确认删除选中的 ' + selectedIds.value.length + ' 条合同？')) {
    contractStore.batchDelete(selectedIds.value)
    selectedIds.value = []
  }
}

function handleExport() {
  try {
  const fmt = prompt('请选择导出格式：\n1 - JSON（完整数据）\n2 - CSV（表格数据）\n\n请输入 1 或 2', '2')
  if (fmt === null) return
  if (fmt === '1' || fmt.trim() === '1') {
    const data = JSON.stringify(contractStore.contracts, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contracts_export.json'
    a.click()
    URL.revokeObjectURL(url)
  } else {
    const headers = ['合同编号', '合同类型', '甲方', '乙方', '签订日期', '到期日', '金额', '结算方式', '状态', '签订地点']
    const statusMap = { draft: '草稿', pending_approval: '待审批', approved: '已审批', signed: '已签订', archived: '已归档', cancelled: '已作废' }
    const rows = contractStore.contracts.map(c => [
      c.contractNo, c.contractType, c.partyA, c.partyB || '苏州冠久新材料科技有限公司',
      c.signDate, c.endDate, c.totalAmount, c.settlement, statusMap[c.status] || c.status, c.signPlace
    ])
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contracts_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  } catch (e) { console.error('导出失败:', e); alert('导出失败: ' + e.message) }
}

const showPreview = ref(false)
const previewContract = ref(null)
const previewTab = ref('content')

function getRelatedCount(c) {
  const customerName = c.partyA
  const contractNo = c.contractNo
  const sourceQuoteId = c.sourceQuoteId
  let count = 0
  count += quotationStore.quotations.filter(q =>
    q.id === sourceQuoteId || q.customerName === customerName || (q.quoteNo && c.notes && c.notes.includes(q.quoteNo))
  ).length
  count += deliveryStore.deliveries.filter(d =>
    d.customerName === customerName || (d.contractNo && d.contractNo === contractNo)
  ).length
  count += collectionStore.collections.filter(col =>
    col.customerName === customerName || (col.contractNo && col.contractNo === contractNo)
  ).length
  return count
}

function openPreview(c) {
  previewContract.value = c
  previewTab.value = 'content'
  showPreview.value = true
  document.body.style.overflow = 'hidden'
}

const showTemplateModal = ref(false)
const aiParsing = ref(false)

function handleContractTemplateFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function handleContractTemplateDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file) parseContractTemplateFile(file)
}

function parseContractTemplateFile(file) {
  aiParsing.value = true
  setTimeout(() => {
    aiParsing.value = false
    const name = prompt('AI识别完成，请确认模板名称：', file.name.replace(/\.[^.]+$/, ''))
    if (name) {
      contractStore.addTemplate({
        name,
        contractType: '购销合同',
        settlement: '款到发货',
        terms: contractStore.getDefaultTerms(),
        partyBInfo: { companyName: '苏州冠久新材料科技有限公司', address: '苏州高新区滨河路3337号', representative: '宋建', contact: '15589233039' }
      })
      alert('模板"' + name + '"已通过AI识别创建，请编辑确认详细信息')
    }
  }, 2000)
}

function openTemplateManager() {
  showTemplateModal.value = true
  document.body.style.overflow = 'hidden'
}

function useTemplate(tpl) {
  showTemplateModal.value = false
  const data = getDefaultWizardData()
  data.contractType = tpl.contractType || data.contractType
  data.terms = JSON.parse(JSON.stringify(tpl.terms || {}))
  data.settlement = tpl.settlement || data.settlement
  data.partyBInfo = JSON.parse(JSON.stringify(tpl.partyBInfo || {}))
  if (tpl.products && tpl.products.length > 0) {
    data.products = JSON.parse(JSON.stringify(tpl.products))
  }
  wizardData.value = data
  isEditing.value = false
  editingId.value = null
  wizardStep.value = 1
  showWizard.value = true
}

function deleteTemplate(id) {
  if (confirm('确认删除该模板？')) {
    contractStore.deleteTemplate(id)
  }
}

function saveCurrentAsTemplate() {
  const name = prompt('请输入模板名称：', '标准购销合同模板')
  if (!name) return
  contractStore.addTemplate({
    name,
    settlement: wizardData.value.settlement,
    terms: JSON.parse(JSON.stringify(wizardData.value.terms || {})),
    partyBInfo: JSON.parse(JSON.stringify(wizardData.value.partyBInfo || {}))
  })
  alert('模板"' + name + '"已保存')
}

watch([searchText, filterStatus, filterSettlement, filterType], () => { currentPage.value = 1 })

function resetFilters() {
  searchText.value = ''
  filterStatus.value = ''
  filterSettlement.value = ''
  filterType.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterAmountMin.value = 0
  filterAmountMax.value = 0
}

function handleClickOutside(e) {
  if (showColumnConfig.value && !e.target.closest('.column-config-wrapper')) {
    showColumnConfig.value = false
  }
}

onMounted(() => {
  contractStore.initSeedData()
  contractStore.initTemplateSeedData()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.contract-page { max-width: 100%; margin: calc(var(--space-6) * -1); min-height: calc(100vh - var(--topbar-height)); padding: var(--space-6); background: var(--color-bg-primary); }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4); }
.page-header-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.page-header-subtitle { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 4px 0 0; }
.page-header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

.view-toggle { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.view-btn { padding: 6px 14px; font-size: var(--font-size-base); border: none; background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s; }
.view-btn + .view-btn { border-left: 1px solid var(--color-border); }
.view-btn.active { background: var(--color-accent); color: #fff; }

.contract-toolbar { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.contract-search { position: relative; min-width: 200px; flex: 1 1 200px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; height: 34px; padding: 0 12px 0 32px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text-primary); outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: var(--color-accent); }
.filter-select { height: 34px; min-width: 110px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-date-group { display: flex; align-items: center; gap: 4px; }
.filter-date { height: 34px; width: 130px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-date-sep { color: var(--color-text-tertiary); font-size: 12px; flex-shrink: 0; }
.filter-amount { height: 34px; width: 100px; padding: 0 8px; font-size: 12px; border-radius: var(--radius-md); }
.filter-reset-btn { height: 34px; white-space: nowrap; }

.contract-stats-bar { display: flex; gap: var(--space-5); padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-4); font-size: 13px; flex-wrap: wrap; align-items: center; }
.stats-ring-section { display: flex; align-items: center; gap: var(--space-3); padding-right: var(--space-4); border-right: 1px solid var(--color-border); }
.stats-ring-svg { flex-shrink: 0; }
@keyframes ringDraw { from { stroke-dashoffset: 113.1; } }
.stats-ring-progress { animation: ringDraw 1s ease-out; transition: stroke-dasharray 0.6s ease; }
.stats-ring-text { display: flex; flex-direction: column; }
.stats-ring-percent { font-size: var(--font-size-xl); font-weight: 700; font-family: var(--font-mono); line-height: 1; }
.stats-ring-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-top: 2px; }
.stats-items { display: flex; gap: var(--space-4); flex: 1; flex-wrap: wrap; }
.stat-item { display: flex; align-items: center; gap: var(--space-2); color: var(--color-text-secondary); }
.stat-dot { width: 8px; height: 8px; border-radius: var(--radius-full); flex-shrink: 0; }
.stat-dot.total { background: var(--color-accent); box-shadow: 0 0 6px rgba(59, 130, 246, 0.3); }
.stat-dot.draft { background: var(--color-text-tertiary); }
.stat-dot.pending { background: var(--color-warning); box-shadow: 0 0 6px rgba(245, 158, 11, 0.3); animation: pendingPulse 2s ease-in-out infinite; }
.stat-dot.approved { background: var(--color-accent); box-shadow: 0 0 6px rgba(59, 130, 246, 0.3); }
.stat-dot.signed { background: var(--color-success); box-shadow: 0 0 6px rgba(34, 197, 94, 0.3); }
.stat-dot.expiring { background: var(--color-warning); animation: expiringPulse 1.5s ease-in-out infinite; }
@keyframes pendingPulse { 0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.3); } 50% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.6); } }
@keyframes expiringPulse { 0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.3); } 50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.7); } }
.stat-num { font-weight: 700; font-family: var(--font-mono); font-size: var(--font-size-base); color: var(--color-text-primary); }
.stat-label { color: var(--color-text-tertiary); font-size: var(--font-size-xs); }
.stat-expiring { color: var(--color-warning); }
.stat-expiring .stat-num { color: var(--color-warning); }
.stats-money-items { display: flex; gap: var(--space-4); padding-left: var(--space-4); border-left: 1px solid var(--color-border); }
.stat-money-item { display: flex; flex-direction: column; gap: 2px; }
.stat-money-val { font-weight: 700; font-family: var(--font-mono); font-size: var(--font-size-base); color: var(--color-text-primary); }
.stat-money-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

.batch-bar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 16px; background: var(--color-accent-subtle, #eff6ff); border: 1px solid var(--color-accent); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 13px; }

.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-draft { background: var(--color-gray-subtle); color: var(--color-text-secondary); }
.status-pending_approval { background: var(--color-warning-subtle); color: var(--color-warning); }
.status-approved { background: var(--color-info-subtle); color: var(--color-accent); }
.status-signed { background: var(--color-success-subtle); color: var(--color-success); }
.status-archived { background: var(--color-cyan-subtle); color: var(--color-info); }
.status-cancelled { background: var(--color-danger-subtle); color: var(--color-danger); }

.mono { font-family: var(--font-mono); }
.text-success { color: var(--color-success, #22c55e); }
.text-warning { color: var(--color-warning, #f59e0b); }
.text-danger { color: var(--color-danger, #ef4444); }
.text-accent { color: var(--color-accent); }
.text-muted { color: var(--color-text-tertiary); }

.cell-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.action-btn { padding: 3px 6px; font-size: 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; transition: background 0.15s; }
.action-btn:hover { background: var(--color-bg-tertiary); }

.empty-state { text-align: center; padding: 40px; color: var(--color-text-tertiary); }
.empty-state-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--color-text-tertiary); font-size: 24px; }

.pagination-bar { display: flex; align-items: center; gap: 4px; padding: 8px 16px; }
.pagination-btn { padding: 4px 10px; font-size: 12px; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-surface); cursor: pointer; }
.pagination-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-info { font-size: 12px; color: var(--color-text-tertiary); margin-left: 8px; }

.analytics-panel { margin-bottom: var(--space-4); }
.analytics-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
.kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; text-align: center; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.kpi-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text-primary); font-family: var(--font-mono); }
.kpi-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
.bar-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.bar-label { width: 60px; font-size: 12px; }
.bar-track { flex: 1; height: 20px; background: var(--color-bg-tertiary); border-radius: var(--radius-sm); overflow: hidden; }
.bar-fill { height: 100%; border-radius: var(--radius-sm); transition: width 0.3s; position: relative; overflow: hidden; }
.bar-fill::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: barShimmer 2s ease-in-out infinite; }
@keyframes barShimmer { 0% { left: -100%; } 100% { left: 100%; } }
.bar-value { font-size: 12px; min-width: 30px; text-align: right; }
.top-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.top-rank { width: 24px; font-weight: 700; color: var(--color-accent); }
.top-name { flex: 1; }
.top-amount { font-weight: 600; }
.empty-hint { text-align: center; color: var(--color-text-tertiary); padding: 20px; }

.btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: all 0.15s; background: var(--color-surface); color: var(--color-text-primary); }
.btn:hover { background: var(--color-bg-secondary); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-ghost:hover { background: var(--color-bg-secondary); }
.btn-sm { padding: 4px 8px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.panel-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); width: 100%; }
.panel-card-header { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.panel-card-body { padding: 16px; }
.panel-card-body.no-padding { padding: 0; }

.table-container { overflow-x: auto; width: 100%; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
.data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid var(--color-border); font-size: 12px; white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); }
.related-count-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--color-accent); background: rgba(99,102,241,0.1); cursor: pointer; transition: background 0.2s; }
.related-count-badge:hover { background: rgba(99,102,241,0.2); }
.action-btn-text { font-size: 12px; padding: 2px 8px; border-radius: 4px; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.action-btn-text:hover { background: var(--color-bg-secondary); border-color: var(--color-accent); color: var(--color-accent); }
.data-table tbody tr:hover { background: var(--color-bg-secondary); }
@keyframes rowSlideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.data-table tbody tr { animation: rowSlideIn 0.3s ease-out both; }
.data-table tbody tr:nth-child(1) { animation-delay: 0ms; }
.data-table tbody tr:nth-child(2) { animation-delay: 20ms; }
.data-table tbody tr:nth-child(3) { animation-delay: 40ms; }
.data-table tbody tr:nth-child(4) { animation-delay: 60ms; }
.data-table tbody tr:nth-child(5) { animation-delay: 80ms; }
.data-table tbody tr:nth-child(n+6) { animation-delay: 100ms; }

@media (max-width: 1024px) {
  .analytics-kpis { grid-template-columns: repeat(3, 1fr); }
  .analytics-grid { grid-template-columns: 1fr 1fr; }
  .contract-toolbar { flex-wrap: wrap; }
}
@media (max-width: 768px) {
  .contract-page { padding: var(--space-3); }
  .page-header { flex-direction: column; }
  .analytics-kpis { grid-template-columns: repeat(2, 1fr); }
  .analytics-grid { grid-template-columns: 1fr; }
  .contract-toolbar { flex-wrap: wrap; }
  .contract-search { min-width: 100%; flex: 1 1 100%; }
  .filter-date-group { flex-direction: row; }
  .filter-select, .filter-date, .filter-amount, .filter-reset-btn { flex: 1 1 calc(50% - var(--space-2)); min-width: 0; }
}

.btn-outline { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-outline:hover { background: var(--color-bg-secondary); }

.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 160px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
</style>