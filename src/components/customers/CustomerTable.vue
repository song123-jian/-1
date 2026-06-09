<template>
  <div class="panel-card">
    <div class="panel-card-body no-padding">
      <div class="table-toolbar">
        <div class="column-config-wrapper">
          <button class="btn btn-outline" @click="toggleColumnConfig($event)"><Icon name="setting" :size="14" /> 列</button>
          <div v-if="showColumnConfig" class="column-config-dropdown" :style="colDropdownStyle">
            <label v-for="col in columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions')" :key="col.key" class="column-config-item">
              <input type="checkbox" v-model="columnVisible[col.key]">{{ col.label }}
            </label>
          </div>
        </div>
      </div>
      <div class="table-container">
        <table class="customer-table">
          <thead>
            <tr>
              <th class="col-check"><div class="checkbox" :class="{ checked: isAllSelected }" @click="handleToggleSelectAll"><Icon name="checkCircle" :size="14" /></div></th>
              <th v-if="columnVisible.no" class="col-no">编号</th>
              <th v-if="columnVisible.name" class="col-name">客户全称</th>
              <th v-if="columnVisible.contact" class="col-contact">姓名</th>
              <th v-if="columnVisible.position" class="col-position">职位</th>
              <th v-if="columnVisible.phone" class="col-phone">手机号码</th>
              <th v-if="columnVisible.level" class="col-level">等级</th>
              <th v-if="columnVisible.decision" class="col-decision">决策权限</th>
              <th v-if="columnVisible.concerns" class="col-concerns">核心关注点</th>
              <th v-if="columnVisible.status" class="col-status">状态</th>
              <th v-if="columnVisible.docs" class="col-docs">关联单据</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in paginatedCustomers" :key="c.id" :style="{ borderLeftColor: levelColors[c.level] || '#94a3b8', animationDelay: idx * 30 + 'ms' }" class="row-with-border row-animated">
              <td class="col-check"><div class="checkbox" :class="{ checked: selectedIds.includes(c.id) }" @click="handleToggleSelect(c.id)"><Icon name="checkCircle" :size="14" /></div></td>
              <td v-if="columnVisible.no" class="col-no"><strong class="text-accent">{{ c.customerNo || '-' }}</strong></td>
              <td v-if="columnVisible.name" class="col-name cell-editable" @dblclick="startInlineEdit(c, 'fullName')">
                <div v-if="!isInlineEditing(c.id, 'fullName')" class="name-cell">
                  <strong>{{ c.fullName || c.name }}</strong>
                  <div v-if="c.tags && c.tags.length > 0" class="tag-row">
                    <span v-for="tagId in c.tags" :key="tagId" class="mini-tag" :style="_getTagStyle(tagId)">{{ _getTagName(tagId) }}</span>
                  </div>
                </div>
                <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
              </td>
              <td v-if="columnVisible.contact" class="cell-editable" @dblclick="startInlineEdit(c, 'contactName')">
                <span v-if="!isInlineEditing(c.id, 'contactName')">{{ c.contactName || c.contact || '-' }}</span>
                <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
              </td>
              <td v-if="columnVisible.position" class="cell-editable" @dblclick="startInlineEdit(c, 'position')">
                <span v-if="!isInlineEditing(c.id, 'position')">{{ c.position || '-' }}</span>
                <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
              </td>
              <td v-if="columnVisible.phone" class="mono cell-editable" @dblclick="startInlineEdit(c, 'phone')">
                <span v-if="!isInlineEditing(c.id, 'phone')">{{ c.phone || '-' }}</span>
                <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
              </td>
              <td v-if="columnVisible.level" class="cell-editable" @dblclick="startInlineEdit(c, 'level')">
                <span v-if="!isInlineEditing(c.id, 'level')" class="level-badge" :class="'level-' + c.level">{{ levelLabel(c.level) }}</span>
                <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                  <option value="A">大客户</option>
                  <option value="B">B类客户</option>
                  <option value="C">C类客户</option>
                </select>
              </td>
              <td v-if="columnVisible.decision" class="cell-editable" @dblclick="startInlineEdit(c, 'decisionAuthority')">
                <span v-if="!isInlineEditing(c.id, 'decisionAuthority')">{{ c.decisionAuthority || '-' }}</span>
                <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                  <option v-for="opt in decisionOptions" :key="opt" :value="opt">{{ opt || '请选择' }}</option>
                </select>
              </td>
              <td v-if="columnVisible.concerns" class="col-concerns cell-editable" @dblclick="startInlineEdit(c, 'coreConcerns')">
                <span v-if="!isInlineEditing(c.id, 'coreConcerns')">{{ c.coreConcerns || '-' }}</span>
                <input v-else v-model="inlineEdit.value" class="inline-input" @keydown="onInlineKeydown($event, c)" @blur="confirmInlineEdit(c)" />
              </td>
              <td v-if="columnVisible.status" class="cell-editable" @dblclick="startInlineEdit(c, 'status')">
                <span v-if="!isInlineEditing(c.id, 'status')" class="status-badge" :class="'status-' + c.status">{{ c.status === 'active' ? '活跃' : '休眠' }}</span>
                <select v-else v-model="inlineEdit.value" class="inline-select" @change="confirmInlineEdit(c)" @blur="confirmInlineEdit(c)" @keydown="onInlineKeydown($event, c)">
                  <option value="active">活跃</option>
                  <option value="dormant">休眠</option>
                </select>
              </td>
              <td v-if="columnVisible.docs" class="col-docs">
                <div class="docs-cell">
                  <span v-if="getCustomerDocCount(c) > 0" class="doc-badge" @click.stop="$emit('openDetail', c)">{{ getCustomerDocCount(c) }}份</span>
                  <span v-else class="doc-empty">-</span>
                </div>
              </td>
              <td class="col-actions">
                <button class="action-btn" @click="$emit('openEdit', c)" title="编辑"><Icon name="edit" :size="14" /> 编辑</button>
                <button class="action-btn" @click="$emit('openDetail', c)" title="详情" style="color:var(--color-purple)"><Icon name="eye" :size="14" /> 详情</button>
                <button class="action-btn danger" @click="$emit('handleDelete', c)" title="删除"><Icon name="delete" :size="14" /> 删除</button>
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
        <span class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 页 · 共 {{ customers.length }} 条</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { useQuotationStore } from '@/stores/quotation'
import { useDataStore } from '@/stores/data'
import { levelColors, levelLabel, getTagName, getTagStyle } from '@/utils/customerHelpers'

const customerStore = useCustomerStore()
const quotationStore = useQuotationStore()
const dataStore = useDataStore()

const props = defineProps({
  customers: { type: Array, required: true },
  selectedIds: { type: Array, required: true }
})

const emit = defineEmits(['update:selectedIds', 'openEdit', 'openDetail', 'handleDelete'])

const decisionOptions = ['', '决策者', '影响者', '使用者', '推荐者', '把关者']

function _getTagName(tagId) {
  return getTagName(customerStore.tags, tagId)
}

function _getTagStyle(tagId) {
  return getTagStyle(customerStore.tags, tagId)
}

function getCustomerDocCount(c) {
  const cid = c.id
  const cname = c.fullName || c.name || ''
  const quotes = quotationStore.quotations.filter(q => q.customerId === cid || q.customerName === cname).length
  const cols = dataStore.collections.filter(col => col.customerId === cid || col.customerName === cname).length
  const contracts = dataStore.contracts.filter(ct => ct.customerId === cid || ct.customerName === cname).length
  return quotes + cols + contracts
}

// 列配置
const columnDefs = [
  { key: 'check', label: '', hideable: false },
  { key: 'no', label: '编号' },
  { key: 'name', label: '客户全称' },
  { key: 'contact', label: '姓名' },
  { key: 'position', label: '职位' },
  { key: 'phone', label: '手机号码' },
  { key: 'level', label: '等级' },
  { key: 'decision', label: '决策权限' },
  { key: 'concerns', label: '核心关注点' },
  { key: 'status', label: '状态' },
  { key: 'docs', label: '关联单据' },
  { key: 'actions', label: '操作', hideable: false }
]
const columnVisible = ref(Object.fromEntries(columnDefs.filter(c => c.key !== 'check' && c.key !== 'actions').map(c => [c.key, true])))
const showColumnConfig = ref(false)
const colDropdownStyle = ref({})

function toggleColumnConfig(event) {
  showColumnConfig.value = !showColumnConfig.value
  if (showColumnConfig.value) {
    const rect = event.target.getBoundingClientRect()
    colDropdownStyle.value = {
      top: rect.bottom + 8 + 'px',
      left: rect.left + 'px'
    }
  }
}

// 分页
const currentPage = ref(1)
const pageSize = 15
const totalPages = computed(() => Math.max(1, Math.ceil(props.customers.length / pageSize)))
const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return props.customers.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const pages = []
  const sp = Math.max(1, currentPage.value - 2)
  const ep = Math.min(totalPages.value, currentPage.value + 2)
  for (let p = sp; p <= ep; p++) pages.push(p)
  return pages
})

// 选择
const isAllSelected = computed(() =>
  paginatedCustomers.value.length > 0 && paginatedCustomers.value.every(c => props.selectedIds.includes(c.id))
)

function handleToggleSelect(id) {
  const ids = [...props.selectedIds]
  const idx = ids.indexOf(id)
  if (idx === -1) ids.push(id)
  else ids.splice(idx, 1)
  emit('update:selectedIds', ids)
}

function handleToggleSelectAll() {
  const pageIds = paginatedCustomers.value.map(c => c.id)
  if (isAllSelected.value) {
    emit('update:selectedIds', props.selectedIds.filter(id => !pageIds.includes(id)))
  } else {
    const ids = [...props.selectedIds]
    pageIds.forEach(id => {
      if (!ids.includes(id)) ids.push(id)
    })
    emit('update:selectedIds', ids)
  }
}

// 行内编辑
const inlineEdit = ref({ id: null, field: null, value: '' })

function startInlineEdit(customer, field) {
  let value = customer[field]
  if (field === 'fullName' && !value) value = customer.name
  if (field === 'contactName' && !value) value = customer.contact
  inlineEdit.value = { id: customer.id, field, value: String(value ?? '') }
}

function isInlineEditing(customerId, field) {
  return inlineEdit.value.id === customerId && inlineEdit.value.field === field
}

function confirmInlineEdit(customer) {
  const { field, value } = inlineEdit.value
  if (!field) return
  const updates = { [field]: value }
  if (field === 'fullName') updates.name = value
  if (field === 'contactName') updates.contact = value
  customerStore.updateCustomer(customer.id, updates)
  inlineEdit.value = { id: null, field: null, value: '' }
}

function cancelInlineEdit() {
  inlineEdit.value = { id: null, field: null, value: '' }
}

function onInlineKeydown(e, customer) {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmInlineEdit(customer)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelInlineEdit()
  }
}

// 列配置点击外部关闭
function closeColumnConfigOnClick(e) {
  const wrapper = document.querySelector('.column-config-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    showColumnConfig.value = false
  }
}

function closeColumnConfigOnResize() {
  showColumnConfig.value = false
}

function closeColumnConfigOnScroll() {
  showColumnConfig.value = false
}

onMounted(() => {
  document.addEventListener('click', closeColumnConfigOnClick)
  window.addEventListener('resize', closeColumnConfigOnResize)
  window.addEventListener('scroll', closeColumnConfigOnScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeColumnConfigOnClick)
  window.removeEventListener('resize', closeColumnConfigOnResize)
  window.removeEventListener('scroll', closeColumnConfigOnScroll, true)
})
</script>

<style scoped>
.no-padding { padding: 0 !important; }
.table-container { overflow-x: auto; }
.customer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.customer-table th { text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--color-text-tertiary); border-bottom: 2px solid var(--color-border); white-space: nowrap; letter-spacing: 0.03em; text-transform: uppercase; }
.customer-table td { padding: 12px 16px; font-size: 14px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-border); vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.customer-table tr:hover td { background: var(--color-surface-hover); }
.row-with-border { border-left: 3px solid transparent; }
@keyframes rowSlideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
.row-animated { animation: rowSlideIn 0.3s ease-out both; }
.table-toolbar { display: flex; align-items: center; gap: var(--space-3); padding: 8px 14px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-elevated); }
.col-check { width: 44px; text-align: center; }
.col-no { width: 140px; }
.col-name { min-width: 200px; }
.col-contact { width: 90px; }
.col-position { width: 90px; }
.col-phone { width: 130px; }
.col-level { width: 80px; text-align: center; }
.col-decision { width: 90px; }
.col-concerns { min-width: 120px; max-width: 160px; }
.col-status { width: 72px; text-align: center; }
.col-docs { width: 80px; text-align: center; }
.col-actions { width: 170px; }
.name-cell strong { color: var(--color-text-primary); }
.docs-cell { text-align: center; }
.doc-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--color-accent); color: #fff; cursor: pointer; transition: opacity var(--transition-fast); }
.doc-badge:hover { opacity: 0.8; }
.doc-empty { color: var(--color-text-tertiary); }
.tag-row { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.mini-tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 10px; }
.text-accent { color: var(--color-accent); }
.mono { font-family: var(--font-mono); }
.checkbox { width: 18px; height: 18px; border: 2px solid var(--color-border-light); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: transparent; transition: all var(--transition-fast); flex-shrink: 0; }
.checkbox:hover { border-color: var(--color-accent); }
.checkbox.checked { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.level-badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
.level-A { background: rgba(239,68,68,0.12); color: #ef4444; }
.level-B { background: rgba(245,158,11,0.12); color: #f59e0b; }
.level-C { background: rgba(59,130,246,0.12); color: #3b82f6; }
.status-badge { padding: 1px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 600; }
.status-active { background: var(--color-success-subtle); color: var(--color-success); }
.status-dormant { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: var(--radius-sm); transition: all var(--transition-fast); color: var(--color-text-secondary); white-space: nowrap; }
.action-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.action-btn.danger:hover { background: var(--color-danger-subtle); color: var(--color-danger); }
.inline-input { width: 100%; padding: 4px 8px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); }
.inline-select { width: 100%; padding: 4px 6px; border: 2px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text-primary); font-size: 14px; font-family: inherit; outline: none; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); cursor: pointer; }
.cell-editable { cursor: pointer; }
.pagination-bar { display: flex; align-items: center; gap: 4px; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border); flex-wrap: wrap; }
.pagination-btn { padding: 4px 10px; font-size: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: transparent; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.pagination-btn:hover:not(:disabled) { background: var(--color-surface-hover); }
.pagination-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info { font-size: 12px; color: var(--color-text-tertiary); margin-left: 8px; }
.column-config-wrapper { position: relative; }
.column-config-dropdown { position: fixed; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-2); z-index: 9999; min-width: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow-lg); }
.column-config-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); color: var(--color-text-primary); font-size: var(--font-size-base); cursor: pointer; white-space: nowrap; }
.column-config-item:hover { background: var(--color-surface-hover); border-radius: var(--radius-sm); }
</style>
