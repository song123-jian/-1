import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'

const STORAGE_KEY = 'gj_erp_approvalRules'
const LOG_KEY = 'gj_erp_approvalLogs'
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
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[approval] localStorage容量不足，数据可能丢失！')
    }
  }
}

export const useApprovalStore = defineStore('approval', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const rules = ref(load(STORAGE_KEY, []))
  const logs = ref(load(LOG_KEY, []))

  const condLabels = { amount: '金额阈值', margin: '利润率阈值', all: '全部需要' }
  const typeLabels = { single: '单人审批', countersign: '会签', orsign: '或签' }
  const moduleOptions = ['报价管理', '回款管理', '采购管理', '合同管理', '送货管理', '对账管理']
  const approverOptions = ['总经理', '财务经理', '销售主管', '采购主管']
  const templates = [
    { value: 'quote_amount', label: '报价金额审批', module: '报价管理', condition: 'amount', threshold: 50000, approver: '总经理', approvalType: 'single', timeout: 24, nextApprover: '' },
    { value: 'payment_review', label: '回款复核审批', module: '回款管理', condition: 'amount', threshold: 100000, approver: '财务经理', approvalType: 'countersign', timeout: 48, nextApprover: '总经理' },
    { value: 'contract_sign', label: '合同签署审批', module: '合同管理', condition: 'amount', threshold: 200000, approver: '总经理', approvalType: 'countersign', timeout: 72, nextApprover: '' },
    { value: 'delivery_confirm', label: '送货确认审批', module: '送货管理', condition: 'all', threshold: 0, approver: '销售主管', approvalType: 'orsign', timeout: 12, nextApprover: '' }
  ]

  const totalCount = computed(() => rules.value.length)
  const enabledCount = computed(() => rules.value.filter(r => r.enabled).length)
  const pendingCount = computed(() => logs.value.filter(l => l.status === 'pending').length)
  const todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return logs.value.filter(l => l.createdAt && l.createdAt.startsWith(today)).length
  })

  function getById(id) {
    return rules.value.find(r => r.id === id)
  }

  function addRule(data) {
    const item = {
      id: generateId('apr'),
      module: data.module || '',
      condition: data.condition || 'amount',
      threshold: parseFloat(data.threshold) || 0,
      approver: data.approver || '',
      approvalType: data.approvalType || 'single',
      timeout: parseInt(data.timeout) || 24,
      nextApprover: data.nextApprover || '',
      enabled: data.enabled !== undefined ? data.enabled : true,
      priority: data.priority || rules.value.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    rules.value.push(item)
    persist(STORAGE_KEY, rules.value)
    addLog('create', item.id, '新增审批规则: ' + item.module + ' - ' + (condLabels[item.condition] || item.condition))
    return item
  }

  function updateRule(id, updates) {
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx === -1) return null
    rules.value[idx] = { ...rules.value[idx], ...updates, updatedAt: new Date().toISOString() }
    persist(STORAGE_KEY, rules.value)
    addLog('update', id, '修改审批规则: ' + rules.value[idx].module)
    return rules.value[idx]
  }

  function deleteRule(id) {
    const idx = rules.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    const rule = rules.value[idx]
    rules.value.splice(idx, 1)
    persist(STORAGE_KEY, rules.value)
    addLog('delete', id, '删除审批规则: ' + rule.module)
    return true
  }

  function toggleRule(id) {
    const rule = rules.value.find(r => r.id === id)
    if (!rule) return
    rule.enabled = !rule.enabled
    rule.updatedAt = new Date().toISOString()
    persist(STORAGE_KEY, rules.value)
    addLog('toggle', id, (rule.enabled ? '启用' : '禁用') + '审批规则: ' + rule.module)
  }

  function batchOperation(action, ids) {
    if (action === 'enable') {
      for (const r of rules.value) {
        if (ids.includes(r.id)) { r.enabled = true; r.updatedAt = new Date().toISOString() }
      }
    } else if (action === 'disable') {
      for (const r of rules.value) {
        if (ids.includes(r.id)) { r.enabled = false; r.updatedAt = new Date().toISOString() }
      }
    } else if (action === 'delete') {
      rules.value = rules.value.filter(r => !ids.includes(r.id))
    }
    persist(STORAGE_KEY, rules.value)
    addLog('batch', null, '批量' + (action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除') + ' ' + ids.length + ' 条规则')
  }

  function replaceData(newData) {
    rules.value = newData
    persist(STORAGE_KEY, rules.value)
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    const seeds = [
      { id: 'ar1', module: '报价管理', condition: 'amount', threshold: 100000, approver: '总经理', approvalType: 'single', timeout: 24, nextApprover: '', enabled: true, priority: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'ar2', module: '报价管理', condition: 'margin', threshold: 10, approver: '销售主管', approvalType: 'single', timeout: 12, nextApprover: '总经理', enabled: true, priority: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'ar3', module: '采购管理', condition: 'amount', threshold: 50000, approver: '总经理', approvalType: 'single', timeout: 24, nextApprover: '', enabled: true, priority: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
    rules.value = seeds
    persist(STORAGE_KEY, rules.value)
    localStorage.setItem(INIT_KEY, '1')
  }

  // 超时升级：将审批人升级到下一级审批人
  function escalateTimeout(ruleId) {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule || !rule.nextApprover) return false
    const oldApprover = rule.approver
    rule.approver = rule.nextApprover
    rule.nextApprover = ''
    rule.updatedAt = new Date().toISOString()
    persist(STORAGE_KEY, rules.value)
    addLog('escalate', ruleId, '审批超时升级: ' + oldApprover + ' [右] ' + rule.approver)
    return oldApprover
  }

  // 审批委托：将待审批任务从一人委托给另一人
  function delegateApproval(ruleId, fromUser, toUser) {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false
    const oldApprover = rule.approver
    rule.approver = toUser
    rule.updatedAt = new Date().toISOString()
    persist(STORAGE_KEY, rules.value)
    addLog('delegate', ruleId, '审批委托: ' + oldApprover + ' [右] ' + toUser)
    return true
  }

  // 撤回审批申请
  function recallApproval(ruleId) {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false
    rule.enabled = false
    rule.updatedAt = new Date().toISOString()
    persist(STORAGE_KEY, rules.value)
    addLog('recall', ruleId, '撤回审批: ' + rule.module)
    return true
  }

  // 审批日志
  function addLog(action, ruleId, description) {
    const entry = {
      id: generateId('aprlog'),
      action,
      ruleId,
      description,
      operator: getCurrentUser(),
      createdAt: new Date().toISOString(),
      status: action === 'create' || action === 'toggle' || action === 'escalate' || action === 'delegate' ? 'completed' : 'pending'
    }
    logs.value.unshift(entry)
    if (logs.value.length > 200) logs.value = logs.value.slice(0, 200)
    persist(LOG_KEY, logs.value)
  }

  // 检查审批是否超时
  function checkTimeout(ruleId) {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return { timedOut: false }
    const updated = new Date(rule.updatedAt || rule.createdAt)
    const now = new Date()
    const hoursDiff = (now - updated) / (1000 * 60 * 60)
    if (hoursDiff > rule.timeout) {
      return { timedOut: true, hoursOverdue: Math.round(hoursDiff - rule.timeout), rule }
    }
    return { timedOut: false, hoursRemaining: Math.round(rule.timeout - hoursDiff), rule }
  }

  // 获取审批日志
  function getLogs(filter) {
    let result = [...logs.value]
    if (filter) {
      if (filter.action) result = result.filter(l => l.action === filter.action)
      if (filter.ruleId) result = result.filter(l => l.ruleId === filter.ruleId)
      if (filter.startDate) result = result.filter(l => l.createdAt >= filter.startDate)
      if (filter.endDate) result = result.filter(l => l.createdAt <= filter.endDate)
    }
    return result
  }

  // 清空日志
  function clearLogs() {
    logs.value = []
    persist(LOG_KEY, logs.value)
  }

  /**
   * 获取指定模块和操作的审批链
   * 供工作流引擎调用，根据审批配置返回审批人列表
   * @param {string} module - 模块名称（如 '报价管理'）
   * @param {string} action - 操作类型（如 'create', 'update'）
   * @returns {Array} 审批人列表
   */
  function getApprovalChain(module, action) {
    const config = rules.value.find(r => r.module === module && r.enabled)
    if (!config) return []
    const approvers = []
    if (config.approver) approvers.push(config.approver)
    if (config.nextApprover) approvers.push(config.nextApprover)
    return approvers
  }

  return {
    rules, logs,
    condLabels, typeLabels, moduleOptions, approverOptions, templates,
    totalCount, enabledCount, pendingCount, todayCount,
    getById, addRule, updateRule, deleteRule, toggleRule, batchOperation,
    replaceData, initSeedData, escalateTimeout, delegateApproval, recallApproval,
    checkTimeout, addLog, getLogs, clearLogs, getApprovalChain
  }
})
