import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'
import { useSyncEngine } from '@/utils/syncEngine'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'

const STORAGE_KEY = 'gj_erp_quotations'
const TEMPLATE_KEY = 'gj_erp_quoteTemplates'
const VERSION_PREFIX = 'gj_erp_quoteVersions_'
const INIT_KEY = 'gj_erp_quotations_initialized'

function load(key, fallback) {
  const data = safeGetJSON(key)
  return data !== null ? data : fallback
}

function save(key, data) {
  safeSetJSON(key, data)
}

function generateQuoteNo(existing) {
  const now = new Date()
  const prefix = 'QT' + now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  let maxSeq = 0
  for (const q of existing) {
    if (q.quoteNo && q.quoteNo.startsWith(prefix)) {
      const seq = parseInt(q.quoteNo.slice(prefix.length), 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

export const useQuotationStore = defineStore('quotation', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const quotations = ref(load(STORAGE_KEY, []))
  const templates = ref(load(TEMPLATE_KEY, []))

  const draftCount = computed(() => quotations.value.filter(q => q.status === 'draft').length)
  const pendingCount = computed(() => quotations.value.filter(q => q.status === 'pending' || q.status === 'sent').length)
  const approvedCount = computed(() => quotations.value.filter(q => q.status === 'approved').length)
  const acceptedCount = computed(() => quotations.value.filter(q => q.status === 'accepted').length)
  const rejectedCount = computed(() => quotations.value.filter(q => q.status === 'rejected').length)
  const expiredCount = computed(() => quotations.value.filter(q => q.status === 'expired').length)

  const totalAmount = computed(() => quotations.value.reduce((s, q) => s + (q.total || 0), 0))
  const acceptedAmount = computed(() => quotations.value.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0))
  const conversionRate = computed(() => {
    const total = quotations.value.length
    if (total === 0) return 0
    return parseFloat((acceptedCount.value / total * 100).toFixed(1))
  })
  const avgProfitMargin = computed(() => {
    const withMargin = quotations.value.filter(q => q.profitMargin)
    if (withMargin.length === 0) return 0
    return parseFloat((withMargin.reduce((s, q) => s + parseFloat(q.profitMargin || 0), 0) / withMargin.length).toFixed(1))
  })
  const avgQuoteAmount = computed(() => {
    const total = quotations.value.length
    if (total === 0) return 0
    return totalAmount.value / total
  })

  const statusCounts = computed(() => {
    const counts = { draft: 0, pending: 0, approved: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 }
    for (const q of quotations.value) {
      if (counts[q.status] !== undefined) counts[q.status]++
    }
    return counts
  })

  const customerTopList = computed(() => {
    const map = {}
    for (const q of quotations.value) {
      const name = q.customerName || '未知'
      map[name] = (map[name] || 0) + (q.total || 0)
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  })

  function persist() {
    save(STORAGE_KEY, quotations.value)
  }

  function persistTemplates() {
    save(TEMPLATE_KEY, templates.value)
  }

  function addQuotation(data) {
    const q = {
      id: generateId('q'),
      quoteNo: generateQuoteNo(quotations.value),
      customerId: '',
      customerName: '',
      customerFullName: '',
      custContact: '',
      custPhone: '',
      custEmail: '',
      senderContact: '',
      senderCompany: '',
      senderPhone: '',
      senderEmail: '',
      date: new Date().toISOString().split('T')[0],
      expiryDate: '',
      items: '[]',
      subtotal: 0,
      taxRate: 13,
      total: 0,
      costBasis: 0,
      profitMargin: 0,
      status: 'draft',
      currency: 'CNY',
      notes: '',
      termPrice: '',
      termPayment: '',
      termDelivery: '',
      termDeliveryAddr: '',
      termQuality: '',
      termPriceAdj: '',
      termLegal: '',
      followUps: [],
      createdAt: new Date().toISOString(),
      ...data
    }
    quotations.value.push(q)
    persist()
    return q
  }

  function updateQuotation(id, updates) {
    const idx = quotations.value.findIndex(q => q.id === id)
    if (idx !== -1) {
      quotations.value[idx] = { ...quotations.value[idx], ...updates }
      persist()
    }
  }

  function deleteQuotation(id) {
    quotations.value = quotations.value.filter(q => q.id !== id)
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedId('quotations', id)
    persist()
  }

  function batchDelete(ids) {
    quotations.value = quotations.value.filter(q => !ids.includes(q.id))
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedIds('quotations', ids)
    persist()
  }

  function batchApprove(ids) {
    for (const q of quotations.value) {
      if (ids.includes(q.id) && (q.status === 'pending' || q.status === 'draft')) {
        q.status = 'approved'
      }
    }
    persist()
  }

  function changeStatus(id, newStatus) {
    const idx = quotations.value.findIndex(q => q.id === id)
    if (idx !== -1) {
      saveVersion(id, '状态变更为' + newStatus)
      quotations.value[idx].status = newStatus
      persist()
    }
  }

  function duplicateQuotation(id) {
    const src = quotations.value.find(q => q.id === id)
    if (!src) return null
    const dup = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateId('q'),
      quoteNo: generateQuoteNo(quotations.value),
      status: 'draft',
      followUps: [],
      createdAt: new Date().toISOString()
    }
    delete dup._versionCache
    quotations.value.push(dup)
    persist()
    return dup
  }

  function getQuotationById(id) {
    return quotations.value.find(q => q.id === id) || null
  }

  function getVersions(quoteId) {
    return load(VERSION_PREFIX + quoteId, [])
  }

  function saveVersion(quoteId, changeNote) {
    const q = quotations.value.find(x => x.id === quoteId)
    if (!q) return
    const versions = getVersions(quoteId)
    versions.push({
      version: versions.length + 1,
      data: JSON.parse(JSON.stringify(q)),
      changedBy: getCurrentUser(),
      changedAt: new Date().toISOString(),
      changeNote: changeNote || ''
    })
    save(VERSION_PREFIX + quoteId, versions)
  }

  function rollbackVersion(quoteId, version) {
    const versions = getVersions(quoteId)
    const target = versions.find(v => v.version === version)
    if (!target) return false
    const idx = quotations.value.findIndex(q => q.id === quoteId)
    if (idx === -1) return false
    saveVersion(quoteId, '回滚到 v' + version)
    const restored = JSON.parse(JSON.stringify(target.data))
    restored.id = quoteId
    quotations.value[idx] = restored
    persist()
    return true
  }

  function addFollowUp(quoteId, date, note) {
    const q = quotations.value.find(x => x.id === quoteId)
    if (!q) return
    if (!q.followUps) q.followUps = []
    q.followUps.push({
      date,
      note,
      createdAt: new Date().toISOString(),
      createdBy: getCurrentUser()
    })
    persist()
  }

  function addTemplate(data) {
    const tpl = {
      id: generateId('tpl'),
      name: '',
      createdAt: new Date().toISOString(),
      customerId: '',
      customerName: '',
      items: '[]',
      termPrice: '',
      termPayment: '',
      termDelivery: '',
      termDeliveryAddr: '',
      termQuality: '',
      termPriceAdj: '',
      termLegal: '',
      taxRate: 13,
      costBasis: 0,
      ...data
    }
    templates.value.push(tpl)
    persistTemplates()
    return tpl
  }

  function deleteTemplate(id) {
    templates.value = templates.value.filter(t => t.id !== id)
    persistTemplates()
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return

    quotations.value = [
      {
        id: 'q1', quoteNo: 'QT20241215001', customerId: 'c1', customerName: '上海贸易有限公司', customerFullName: '上海贸易有限公司',
        custContact: '李经理', custPhone: '021-5555XXXX', custEmail: 'li@sh-trade.com',
        senderContact: '王业务', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'wang@gj-newmat.com',
        date: '2024-12-15', expiryDate: '2025-01-15',
        items: JSON.stringify([
          { seq: 1, grade: 'ABS树脂', standard: '通用级', qty: 500, price: 98, remark: '' },
          { seq: 2, grade: 'POM塑料', standard: 'M90-44', qty: 200, price: 78, remark: '' }
        ]),
        subtotal: 64600, taxRate: 13, total: 72998, costBasis: 52000, profitMargin: 19.5,
        status: 'approved', currency: 'CNY', notes: '客户要求15天内交货',
        termPrice: '含税出厂价', termPayment: '月结30天', termDelivery: '物流配送', termDeliveryAddr: '客户指定仓库',
        termQuality: '按国标执行', termPriceAdj: '原材料波动±5%以内不调整', termLegal: '双方签字盖章生效',
        followUps: [], createdAt: '2024-12-15T08:00:00Z'
      },
      {
        id: 'q2', quoteNo: 'QT20241210001', customerId: 'c3', customerName: '广州进出口有限公司', customerFullName: '广州进出口有限公司',
        custContact: '陈总', custPhone: '020-3333XXXX', custEmail: 'chen@gz-import.com',
        senderContact: '王业务', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'wang@gj-newmat.com',
        date: '2024-12-10', expiryDate: '2025-01-10',
        items: JSON.stringify([
          { seq: 1, grade: '不锈钢板304', standard: '2B面', qty: 1000, price: 155, remark: '' },
          { seq: 2, grade: '铝合金型材6063', standard: 'T5', qty: 800, price: 125, remark: '' }
        ]),
        subtotal: 255000, taxRate: 13, total: 288150, costBasis: 210000, profitMargin: 17.6,
        status: 'sent', currency: 'CNY', notes: '',
        termPrice: '含税出厂价', termPayment: '月结60天', termDelivery: '物流配送', termDeliveryAddr: '广州黄埔仓库',
        termQuality: '按国标执行', termPriceAdj: '原材料波动±5%以内不调整', termLegal: '双方签字盖章生效',
        followUps: [{ date: '2024-12-18', note: '客户表示价格偏高，需要协商', createdAt: '2024-12-18T10:00:00Z', createdBy: '王业务' }],
        createdAt: '2024-12-10T09:00:00Z'
      },
      {
        id: 'q3', quoteNo: 'QT20241201001', customerId: 'c2', customerName: '北京科技发展集团', customerFullName: '北京科技发展集团',
        custContact: '赵经理', custPhone: '010-8888XXXX', custEmail: 'zhao@bj-tech.com',
        senderContact: '张经理', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'zhang@gj-newmat.com',
        date: '2024-12-01', expiryDate: '2024-12-31',
        items: JSON.stringify([
          { seq: 1, grade: '轴承钢GCr15', standard: 'Φ50', qty: 300, price: 320, remark: '' }
        ]),
        subtotal: 96000, taxRate: 13, total: 108480, costBasis: 72000, profitMargin: 25.0,
        status: 'accepted', currency: 'CNY', notes: '已转送货单',
        termPrice: '含税出厂价', termPayment: '款到发货', termDelivery: '专车配送', termDeliveryAddr: '北京亦庄工厂',
        termQuality: '按国标执行', termPriceAdj: '原材料波动±5%以内不调整', termLegal: '双方签字盖章生效',
        followUps: [], createdAt: '2024-12-01T08:30:00Z'
      },
      {
        id: 'q4', quoteNo: 'QT20241120001', customerId: 'c5', customerName: '成都精密机械有限公司', customerFullName: '成都精密机械有限公司',
        custContact: '刘工', custPhone: '028-7777XXXX', custEmail: 'liu@cd-prec.com',
        senderContact: '王业务', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'wang@gj-newmat.com',
        date: '2024-11-20', expiryDate: '2024-12-20',
        items: JSON.stringify([
          { seq: 1, grade: '碳钢Q235', standard: '热轧板', qty: 600, price: 55, remark: '' },
          { seq: 2, grade: '铜合金H59', standard: '棒材', qty: 100, price: 580, remark: '' }
        ]),
        subtotal: 91000, taxRate: 13, total: 102830, costBasis: 76000, profitMargin: 16.5,
        status: 'pending', currency: 'CNY', notes: '待总经理审批',
        termPrice: '含税出厂价', termPayment: '月结30天', termDelivery: '物流配送', termDeliveryAddr: '成都高新区仓库',
        termQuality: '按国标执行', termPriceAdj: '原材料波动±5%以内不调整', termLegal: '双方签字盖章生效',
        followUps: [], createdAt: '2024-11-20T14:00:00Z'
      },
      {
        id: 'q5', quoteNo: 'QT20241101001', customerId: 'c6', customerName: '武汉钢铁贸易有限公司', customerFullName: '武汉钢铁贸易有限公司',
        custContact: '黄总', custPhone: '027-6666XXXX', custEmail: 'huang@wh-steel.com',
        senderContact: '张经理', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'zhang@gj-newmat.com',
        date: '2024-11-01', expiryDate: '2024-12-01',
        items: JSON.stringify([
          { seq: 1, grade: '尼龙66', standard: '注塑级', qty: 150, price: 148, remark: '' }
        ]),
        subtotal: 22200, taxRate: 13, total: 25086, costBasis: 19500, profitMargin: 12.2,
        status: 'expired', currency: 'CNY', notes: '客户未回复',
        termPrice: '含税出厂价', termPayment: '款到发货', termDelivery: '物流配送', termDeliveryAddr: '武汉青山仓库',
        termQuality: '按国标执行', termPriceAdj: '原材料波动±5%以内不调整', termLegal: '双方签字盖章生效',
        followUps: [], createdAt: '2024-11-01T10:00:00Z'
      },
      {
        id: 'q6', quoteNo: 'QT20241218001', customerId: 'c4', customerName: '深圳智能制造有限公司', customerFullName: '深圳智能制造有限公司',
        custContact: '马工', custPhone: '0755-2222XXXX', custEmail: 'ma@sz-smart.com',
        senderContact: '王业务', senderCompany: '苏州冠久新材料科技有限公司', senderPhone: '0512-6666XXXX', senderEmail: 'wang@gj-newmat.com',
        date: '2024-12-18', expiryDate: '2025-01-18',
        items: JSON.stringify([
          { seq: 1, grade: '铝合金型材6063', standard: 'T6', qty: 400, price: 135, remark: '' },
          { seq: 2, grade: 'ABS树脂', standard: '高冲击级', qty: 300, price: 105, remark: '' }
        ]),
        subtotal: 87000, taxRate: 13, total: 98310, costBasis: 70000, profitMargin: 19.5,
        status: 'draft', currency: 'CNY', notes: '草稿待完善',
        termPrice: '', termPayment: '', termDelivery: '', termDeliveryAddr: '',
        termQuality: '', termPriceAdj: '', termLegal: '',
        followUps: [], createdAt: '2024-12-18T16:00:00Z'
      }
    ]
    persist()
    safeSetItem(INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(quotations.value, items, 'id')
    quotations.value = merged
    persist()
  }

  function replaceData(newData) {
    quotations.value = newData
    persist()
  }

  /**
   * 报价转合同
   * 增加已转换状态检查，防止重复转换
   * @param {string} id - 报价ID
   * @returns {{ success: boolean, error?: string, quotation?: Object }}
   */
  function convertToContract(id) {
    const idx = quotations.value.findIndex(q => q.id === id)
    if (idx === -1) {
      return { success: false, error: '报价单不存在' }
    }
    const quotation = quotations.value[idx]
    if (quotation.status !== 'approved' && quotation.status !== 'accepted') {
      return { success: false, error: '只有已审批或已接受的报价可以转为合同' }
    }
    if (quotation.convertedToContract) {
      return { success: false, error: '该报价已转换，不可重复操作' }
    }
    quotation.convertedToContract = true
    quotation.convertedAt = new Date().toISOString()
    saveVersion(id, '转为合同')
    persist()
    return { success: true, quotation }
  }

  /**
   * 报价转送货单
   * 增加已转换状态检查，防止重复转换
   * @param {string} id - 报价ID
   * @returns {{ success: boolean, error?: string, quotation?: Object }}
   */
  function convertToDelivery(id) {
    const idx = quotations.value.findIndex(q => q.id === id)
    if (idx === -1) {
      return { success: false, error: '报价单不存在' }
    }
    const quotation = quotations.value[idx]
    if (quotation.status !== 'approved' && quotation.status !== 'accepted') {
      return { success: false, error: '只有已审批或已接受的报价可以转为送货单' }
    }
    if (quotation.convertedToDelivery) {
      return { success: false, error: '该报价已转换，不可重复操作' }
    }
    quotation.convertedToDelivery = true
    quotation.convertedAt = new Date().toISOString()
    saveVersion(id, '转为送货单')
    persist()
    return { success: true, quotation }
  }

  return {
    quotations, templates,
    draftCount, pendingCount, approvedCount, acceptedCount, rejectedCount, expiredCount,
    totalAmount, acceptedAmount, conversionRate, avgProfitMargin, avgQuoteAmount,
    statusCounts, customerTopList,
    addQuotation, updateQuotation, deleteQuotation,
    batchDelete, batchApprove, changeStatus,
    duplicateQuotation, getQuotationById,
    getVersions, saveVersion, rollbackVersion,
    addFollowUp,
    addTemplate, deleteTemplate,
    initSeedData,
    replaceData, mergeRemoteItems,
    convertToContract, convertToDelivery,
    persist
  }
})
