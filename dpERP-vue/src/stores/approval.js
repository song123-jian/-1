import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_approvalRules'
const INIT_KEY = 'gj_erp_approval_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return fallback
}

function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

export const useApprovalStore = defineStore('approval', () => {
  const rules = ref(load(STORAGE_KEY, []))

  const condLabels = { amount: '金额阈值', margin: '利润率阈值', all: '全部需要' }
  const typeLabels = { single: '单人审批', countersign: '会签', orsign: '或签' }
  const moduleOptions = ['报价管理', '回款管理', '采购管理', '合同管理', '送货管理', '对账管理']
  const approverOptions = ['总经理', '财务经理', '销售主管', '采购主管']
  const templates = [
    { value: 'quote_amount', label: '报价金额审批', module: '报价管理', condition: 'amount', threshold: 100000, approver: '总经理', approvalType: 'single', timeout: 24 },
    { value: 'payment_review', label: '回款复核审批', module: '回款管理', condition: 'amount', threshold: 50000, approver: '财务经理', approvalType: 'single', timeout: 12 },
    { value: 'contract_sign', label: '合同签署审批', module: '合同管理', condition: 'amount', threshold: 200000, approver: '总经理', approvalType: 'countersign', timeout: 48 },
    { value: 'delivery_confirm', label: '送货确认审批', module: '送货管理', condition: 'all', threshold: 0, approver: '销售主管', approvalType: 'single', timeout: 24 }
  ]

  const totalCount = computed(() => rules.value.length)
  const enabledCount = computed(() => rules.value.filter(r => r.enabled).length)
  const pendingCount = computed(() => 0)
  const todayCount = computed(() => 0)

  function getById(id) {
    return rules.value.find(r => r.id === id)
  }

  function addRule(data) {
    const item = {
      id: 'ar' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      module: data.module || '',
      condition: data.condition || 'amount',
      threshold: parseFloat(data.threshold) || 0,
      approver: data.approver || '',
      approvalType: data.approvalType || 'single',
      timeout: parseInt(data.timeout) || 24,
      nextApprover: data.nextApprover || '',
      enabled: data.enabled !== undefined ? data.enabled : true
    }
    rules.value.push(item)
    persist(STORAGE_KEY, rules.value)
    return item
  }

  function updateRule(id, updates) {
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx === -1) return null
    rules.value[idx] = { ...rules.value[idx], ...updates }
    persist(STORAGE_KEY, rules.value)
    return rules.value[idx]
  }

  function deleteRule(id) {
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    rules.value.splice(idx, 1)
    persist(STORAGE_KEY, rules.value)
    return true
  }

  function toggleRule(id) {
    const rule = rules.value.find(r => r.id === id)
    if (!rule) return
    rule.enabled = !rule.enabled
    persist(STORAGE_KEY, rules.value)
  }

  function batchOperation(action, ids) {
    if (action === 'enable') {
      for (const r of rules.value) {
        if (ids.includes(r.id)) r.enabled = true
      }
    } else if (action === 'disable') {
      for (const r of rules.value) {
        if (ids.includes(r.id)) r.enabled = false
      }
    } else if (action === 'delete') {
      rules.value = rules.value.filter(r => !ids.includes(r.id))
    }
    persist(STORAGE_KEY, rules.value)
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    const seeds = [
      { id: 'ar1', module: '报价管理', condition: 'amount', threshold: 100000, approver: '总经理', approvalType: 'single', timeout: 24, nextApprover: '', enabled: true },
      { id: 'ar2', module: '报价管理', condition: 'margin', threshold: 10, approver: '销售主管', approvalType: 'single', timeout: 12, nextApprover: '总经理', enabled: true },
      { id: 'ar3', module: '采购管理', condition: 'amount', threshold: 50000, approver: '总经理', approvalType: 'single', timeout: 24, nextApprover: '', enabled: true },
      { id: 'ar4', module: '合同管理', condition: 'amount', threshold: 200000, approver: '总经理', approvalType: 'countersign', timeout: 48, nextApprover: '', enabled: true },
      { id: 'ar5', module: '回款管理', condition: 'amount', threshold: 50000, approver: '财务经理', approvalType: 'single', timeout: 12, nextApprover: '', enabled: false },
      { id: 'ar6', module: '送货管理', condition: 'all', threshold: 0, approver: '销售主管', approvalType: 'single', timeout: 24, nextApprover: '', enabled: true }
    ]
    rules.value = seeds
    persist(STORAGE_KEY, rules.value)
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    rules, condLabels, typeLabels, moduleOptions, approverOptions, templates,
    totalCount, enabledCount, pendingCount, todayCount,
    getById, addRule, updateRule, deleteRule, toggleRule, batchOperation,
    initSeedData
  }
})
