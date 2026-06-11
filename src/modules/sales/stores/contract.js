import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { numberToChinese } from '@/utils/numberToChinese.js'
import { useSessionStore } from '@/stores/session'
import { generateId } from '@/utils/uid'
import { useSyncEngine } from '@/utils/syncEngine'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'
import { toLocalDateStr } from '@/utils/format'

const STORAGE_PREFIX = 'gj_erp_'
const STORAGE_KEY = STORAGE_PREFIX + 'contracts'
const TEMPLATE_KEY = STORAGE_PREFIX + 'contractTemplates'
const ATTACHMENT_KEY = STORAGE_PREFIX + 'contractAttachments_'
const HISTORY_KEY = STORAGE_PREFIX + 'contractHistory_'
const INIT_KEY = 'gj_erp_contracts_initialized'
const TEMPLATE_INIT_KEY = 'gj_erp_contract_templates_initialized'

function generateContractNo(existing) {
  const now = new Date()
  const prefix = 'HT' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0')
  const samePrefix = existing.filter((c) => (c.contractNo || '').startsWith(prefix))
  let maxSeq = 0
  for (const c of samePrefix) {
    const tail = c.contractNo.slice(prefix.length)
    const n = parseInt(tail, 10)
    if (!isNaN(n) && n > maxSeq) maxSeq = n
  }
  return prefix + String(maxSeq + 1).padStart(3, '0')
}

function getDefaultTerms() {
  return {
    quality: '产品质量以双方封存样品或书面订单确认标准为准；无书面约定的，按乙方企业标准执行。',
    transport: '运输方式为汽车运输，运费由乙方承担；风险划分原则为货物在各自掌管期间，毁损、灭失风险由各自承担。',
    inspection: '甲方按合同第二条约定标准验收，异议期为货到后5日内；甲方逾期未验收且无正当理由的，视为产品质量合格。',
    settlement: '采用${结算方式}结算方式，票到当天付清全款。',
    packaging:
      '按乙方生产厂家标准包装，包装须适于运输与储存；甲方有特殊包装要求的，应提前书面说明，增加费用由甲方承担；合理损耗按千分之三执行。',
    breach:
      '产品花色、规格、质量不符合约定时，甲方同意利用的按质论价，不同意利用的由乙方负责返工或换货；甲方未经乙方同意擅自变更产品规格、标准等产生的费用由甲方承担；乙方不承担甲方间接损失、预期利益损失、第三方赔偿责任等后果性损害。',
    dispute: '合同履行中发生争议，双方友好协商解决；协商不成，提交合同签订地人民法院诉讼解决。',
    validity:
      '本合同为一次性订单合同；采用本合同第五条C款结算的，自双方签字盖章之日起生效；其他交易可参照本合同条件另行书面约定。',
    ipOwnership: '产品知识产权归乙方所有；甲方未付清全部货款前，对应未付款部分货物所有权归乙方所有。',
    other: '本合同扫描件、照片、PDF、传真件、微信/邮件确认件与原件具有同等法律效力。'
  }
}

export const useContractStore = defineStore('contract', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const contracts = ref(safeGetJSON(STORAGE_KEY) || [])
  const templates = ref(safeGetJSON(TEMPLATE_KEY) || [])

  const draftCount = computed(() => contracts.value.filter((c) => c.status === 'draft').length)
  const pendingApprovalCount = computed(() => contracts.value.filter((c) => c.status === 'pending_approval').length)
  const approvedCount = computed(() => contracts.value.filter((c) => c.status === 'approved').length)
  const signedCount = computed(() => contracts.value.filter((c) => c.status === 'signed').length)
  const archivedCount = computed(() => contracts.value.filter((c) => c.status === 'archived').length)
  const cancelledCount = computed(() => contracts.value.filter((c) => c.status === 'cancelled').length)

  const totalAmount = computed(() => contracts.value.reduce((s, c) => s + (c.totalAmount || 0), 0))
  const signedAmount = computed(() =>
    contracts.value
      .filter((c) => c.status === 'signed' || c.status === 'archived')
      .reduce((s, c) => s + (c.totalAmount || 0), 0)
  )

  const expiringCount = computed(() => {
    const now = new Date()
    return contracts.value.filter((c) => {
      if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) return false
      const days = Math.floor((new Date(c.endDate) - now) / 86400000)
      return days > 0 && days <= 30
    }).length
  })

  const expiredCount = computed(() => {
    const now = new Date()
    return contracts.value.filter((c) => {
      if (!c.endDate || (c.status !== 'signed' && c.status !== 'active')) return false
      return new Date(c.endDate) < now
    }).length
  })

  const statusCounts = computed(() => {
    const counts = { draft: 0, pending_approval: 0, approved: 0, signed: 0, archived: 0, cancelled: 0 }
    for (const c of contracts.value) {
      if (counts[c.status] !== undefined) counts[c.status]++
    }
    return counts
  })

  const settlementCounts = computed(() => {
    const counts = {}
    for (const c of contracts.value) {
      const s = c.settlement || '未设定'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  })

  const typeCounts = computed(() => {
    const counts = {}
    for (const c of contracts.value) {
      const t = c.contractType || '购销合同'
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  })

  const customerTopList = computed(() => {
    const map = {}
    for (const c of contracts.value) {
      const name = c.partyA || '未知'
      map[name] = (map[name] || 0) + (c.totalAmount || 0)
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  })

  const monthlyAmounts = computed(() => {
    const map = {}
    for (const c of contracts.value) {
      if (c.signDate) {
        const month = c.signDate.slice(0, 7)
        map[month] = (map[month] || 0) + (c.totalAmount || 0)
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))
  })

  function persist() {
    safeSetJSON(STORAGE_KEY, contracts.value)
  }

  function addContract(data) {
    const autoNo = generateContractNo(contracts.value)
    const c = {
      id: generateId('ct'),
      contractType: '购销合同',
      partyA: '',
      partyAId: '',
      partyB: '苏州冠久新材料科技有限公司',
      signPlace: '苏州・高新区',
      signDate: toLocalDateStr(),
      endDate: '',
      settlement: '款到发货',
      products: [],
      totalAmount: 0,
      terms: getDefaultTerms(),
      partyAInfo: {
        address: '',
        representative: '',
        contact: '',
        date: toLocalDateStr(),
        seal: ''
      },
      partyBInfo: {
        companyName: '苏州冠久新材料科技有限公司',
        address: '苏州高新区滨河路3337号',
        representative: '宋建',
        contact: '15589233039',
        date: toLocalDateStr(),
        seal: 'preset'
      },
      status: 'draft',
      sourceQuoteId: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
      contractNo: data.contractNo || autoNo
    }
    contracts.value.push(c)
    persist()
    addHistoryEvent(c.id, 'create', '创建合同 ' + c.contractNo)
    return c
  }

  function updateContract(id, updates) {
    const idx = contracts.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      contracts.value[idx] = { ...contracts.value[idx], ...updates, updatedAt: new Date().toISOString() }
      persist()
    }
  }

  function deleteContract(id) {
    contracts.value = contracts.value.filter((c) => c.id !== id)
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedId('contracts', id)
    persist()
  }

  function batchDelete(ids) {
    contracts.value = contracts.value.filter((c) => !ids.includes(c.id))
    const syncEngine = useSyncEngine()
    syncEngine.recordDeletedIds('contracts', ids)
    persist()
  }

  function changeStatus(id, newStatus, extra) {
    const idx = contracts.value.findIndex((c) => c.id === id)
    if (idx === -1) return false
    const c = contracts.value[idx]
    const statusLabels = {
      draft: '草稿',
      pending_approval: '待审批',
      approved: '已审批',
      signed: '已签订',
      archived: '已归档',
      cancelled: '已作废'
    }
    if (newStatus === 'signed' && c.status !== 'approved') return false
    if (newStatus === 'pending_approval' && c.status !== 'draft') return false
    if (newStatus === 'approved' && c.status !== 'pending_approval') return false
    if (newStatus === 'archived' && c.status !== 'signed') return false
    if (newStatus === 'cancelled' && c.status !== 'approved' && c.status !== 'signed') return false
    const updates = { status: newStatus, updatedAt: new Date().toISOString() }
    if (newStatus === 'pending_approval') {
      updates.submittedBy = getCurrentUser()
      updates.submittedAt = new Date().toISOString()
    }
    if (newStatus === 'approved') {
      updates.approvedBy = getCurrentUser()
      updates.approvedAt = new Date().toISOString()
    }
    if (newStatus === 'signed') {
      updates.signedBy = getCurrentUser()
      updates.signedAt = new Date().toISOString()
    }
    if (newStatus === 'draft' && c.status === 'pending_approval') {
      updates.rejectedBy = getCurrentUser()
      updates.rejectedAt = new Date().toISOString()
      updates.rejectionReason = (extra && extra.reason) || ''
    }
    contracts.value[idx] = { ...c, ...updates }
    persist()
    addHistoryEvent(
      id,
      newStatus === 'draft' && c.status === 'pending_approval' ? 'reject' : newStatus,
      c.contractNo +
        ' ' +
        (newStatus === 'draft' && c.status === 'pending_approval'
          ? '审批驳回'
          : '状态变更为' + (statusLabels[newStatus] || newStatus))
    )
    return true
  }

  function duplicateContract(id) {
    const source = contracts.value.find((c) => c.id === id)
    if (!source) return null
    const cloned = JSON.parse(JSON.stringify(source))
    cloned.id = generateId('ct')
    cloned.contractNo = generateContractNo(contracts.value)
    cloned.status = 'draft'
    cloned.partyAInfo = { address: '', representative: '', contact: '', date: '', seal: '' }
    cloned.signDate = toLocalDateStr()
    cloned.endDate = ''
    delete cloned.createdAt
    delete cloned.updatedAt
    delete cloned.signedBy
    delete cloned.signedAt
    delete cloned.approvedBy
    delete cloned.approvedAt
    contracts.value.push(cloned)
    persist()
    addHistoryEvent(cloned.id, 'create', '复制合同，源自 ' + source.contractNo)
    return cloned
  }

  function getContractById(id) {
    return contracts.value.find((c) => c.id === id) || null
  }

  function getHistory(contractId) {
    return safeGetJSON(HISTORY_KEY + contractId) || []
  }

  function addHistoryEvent(contractId, type, label) {
    const events = getHistory(contractId)
    events.push({
      type,
      label,
      user: getCurrentUser(),
      time: new Date().toISOString()
    })
    safeSetJSON(HISTORY_KEY + contractId, events)
  }

  function getAttachments(contractId) {
    return safeGetJSON(ATTACHMENT_KEY + contractId) || []
  }

  function addAttachment(contractId, file) {
    const attachments = getAttachments(contractId)
    attachments.push({
      id: generateId('att'),
      name: file.name,
      size: file.size,
      type: file.type,
      data: file.data || '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: getCurrentUser()
    })
    safeSetJSON(ATTACHMENT_KEY + contractId, attachments)
  }

  function deleteAttachment(contractId, attId) {
    const attachments = getAttachments(contractId).filter((a) => a.id !== attId)
    safeSetJSON(ATTACHMENT_KEY + contractId, attachments)
  }

  function addTemplate(data) {
    const tpl = {
      id: generateId('tpl'),
      name: data.name || '未命名模板',
      version: 'v1.0',
      createdAt: toLocalDateStr(),
      settlement: data.settlement || '',
      terms: JSON.parse(JSON.stringify(data.terms || {})),
      partyBInfo: JSON.parse(JSON.stringify(data.partyBInfo || {})),
      ...data
    }
    templates.value.push(tpl)
    safeSetJSON(TEMPLATE_KEY, templates.value)
    return tpl
  }

  function deleteTemplate(id) {
    templates.value = templates.value.filter((t) => t.id !== id)
    safeSetJSON(TEMPLATE_KEY, templates.value)
  }

  function importFromQuotation(quoteId, quotationStore) {
    const q = quotationStore.getQuotationById(quoteId)
    if (!q) return null
    const products = []
    try {
      const items = typeof q.items === 'string' ? JSON.parse(q.items) : q.items || []
      for (const item of items) {
        products.push({
          productName: item.grade || item.productName || '',
          spec: item.standard || item.spec || '',
          quantity: item.qty || item.quantity || 0,
          unitPrice: item.price || item.unitPrice || 0,
          amount: (item.qty || item.quantity || 0) * (item.price || item.unitPrice || 0),
          deliveryPlace: '',
          remark: item.remark || ''
        })
      }
    } catch (e) {
      console.warn('[importFromQuotation] parse items failed', e)
    }
    return {
      partyA: q.customerName || '',
      partyAId: q.customerId || '',
      sourceQuoteId: q.id,
      settlement: '款到发货',
      products,
      totalAmount: q.total || 0,
      partyAInfo: {
        address: '',
        representative: q.custContact || '',
        contact: q.custPhone || '',
        date: toLocalDateStr(),
        seal: ''
      }
    }
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    const seedContracts = [
      {
        id: 'ct1',
        contractNo: 'HT202601001',
        contractType: '购销合同',
        partyA: '上海贸易有限公司',
        partyAId: 'c1',
        partyB: '苏州冠久新材料科技有限公司',
        signPlace: '苏州・高新区',
        signDate: '2026-01-15',
        endDate: '2026-12-31',
        settlement: '月结30天',
        products: [
          {
            productName: 'ABS树脂',
            spec: '通用级',
            quantity: 5000,
            unitPrice: 12.5,
            amount: 62500,
            deliveryPlace: '上海',
            remark: ''
          },
          {
            productName: 'POM塑料',
            spec: 'M90-44',
            quantity: 3000,
            unitPrice: 18.2,
            amount: 54600,
            deliveryPlace: '上海',
            remark: ''
          }
        ],
        totalAmount: 117100,
        terms: getDefaultTerms(),
        partyAInfo: {
          address: '上海市浦东新区',
          representative: '王经理',
          contact: '021-5555XXXX',
          date: '2026-01-15',
          seal: ''
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '2026-01-15',
          seal: 'preset'
        },
        status: 'signed',
        signedBy: '宋建',
        signedAt: '2026-01-15T10:00:00Z',
        sourceQuoteId: '',
        notes: '',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z'
      },
      {
        id: 'ct2',
        contractNo: 'HT202603001',
        contractType: '购销合同',
        partyA: '广州进出口有限公司',
        partyAId: 'c3',
        partyB: '苏州冠久新材料科技有限公司',
        signPlace: '苏州・高新区',
        signDate: '2026-03-01',
        endDate: '2027-02-28',
        settlement: '月结60天',
        products: [
          {
            productName: '不锈钢板304',
            spec: '2B/BA',
            quantity: 8000,
            unitPrice: 25.0,
            amount: 200000,
            deliveryPlace: '广州',
            remark: ''
          },
          {
            productName: '铝合金型材6063',
            spec: 'T5',
            quantity: 5000,
            unitPrice: 22.0,
            amount: 110000,
            deliveryPlace: '广州',
            remark: ''
          }
        ],
        totalAmount: 310000,
        terms: getDefaultTerms(),
        partyAInfo: {
          address: '广州市天河区',
          representative: '李总',
          contact: '020-3888XXXX',
          date: '2026-03-01',
          seal: ''
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '2026-03-01',
          seal: 'preset'
        },
        status: 'pending_approval',
        submittedBy: '宋建',
        submittedAt: '2026-03-01T09:00:00Z',
        sourceQuoteId: '',
        notes: '大客户年度框架合同',
        createdAt: '2026-02-25T08:00:00Z',
        updatedAt: '2026-03-01T09:00:00Z'
      },
      {
        id: 'ct3',
        contractNo: 'HT202604001',
        contractType: '采购合同',
        partyA: '苏州冠久新材料科技有限公司',
        partyAId: '',
        partyB: '江苏钢铁集团有限公司',
        signPlace: '苏州・高新区',
        signDate: '2026-04-10',
        endDate: '2026-10-10',
        settlement: '款到发货',
        products: [
          {
            productName: '碳钢Q235',
            spec: '热轧板卷',
            quantity: 20000,
            unitPrice: 4.5,
            amount: 90000,
            deliveryPlace: '苏州',
            remark: ''
          }
        ],
        totalAmount: 90000,
        terms: getDefaultTerms(),
        partyAInfo: {
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '2026-04-10',
          seal: 'preset'
        },
        partyBInfo: {
          companyName: '江苏钢铁集团有限公司',
          address: '江苏省',
          representative: '周经理',
          contact: '0512-5333XXXX',
          date: '2026-04-10',
          seal: ''
        },
        status: 'approved',
        approvedBy: '总经理',
        approvedAt: '2026-04-12T14:00:00Z',
        sourceQuoteId: '',
        notes: '',
        createdAt: '2026-04-08T08:00:00Z',
        updatedAt: '2026-04-12T14:00:00Z'
      },
      {
        id: 'ct4',
        contractNo: 'HT202605001',
        contractType: '购销合同',
        partyA: '北京科技发展集团',
        partyAId: 'c2',
        partyB: '苏州冠久新材料科技有限公司',
        signPlace: '苏州・高新区',
        signDate: '2026-05-20',
        endDate: '2026-08-20',
        settlement: '货到付款',
        products: [
          {
            productName: '轴承钢GCr15',
            spec: 'Φ50',
            quantity: 2000,
            unitPrice: 35.0,
            amount: 70000,
            deliveryPlace: '北京',
            remark: ''
          }
        ],
        totalAmount: 70000,
        terms: getDefaultTerms(),
        partyAInfo: {
          address: '北京市海淀区',
          representative: '张总',
          contact: '010-6666XXXX',
          date: '2026-05-20',
          seal: ''
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '2026-05-20',
          seal: 'preset'
        },
        status: 'draft',
        sourceQuoteId: 'q3',
        notes: '由报价单QT20241201001转入',
        createdAt: '2026-05-18T08:00:00Z',
        updatedAt: '2026-05-18T08:00:00Z'
      },
      {
        id: 'ct5',
        contractNo: 'HT202605002',
        contractType: '框架协议',
        partyA: '深圳智能制造有限公司',
        partyAId: 'c4',
        partyB: '苏州冠久新材料科技有限公司',
        signPlace: '苏州・高新区',
        signDate: '2026-05-01',
        endDate: '2027-04-30',
        settlement: '月结90天',
        products: [],
        totalAmount: 500000,
        terms: getDefaultTerms(),
        partyAInfo: {
          address: '深圳市南山区',
          representative: '刘总',
          contact: '0755-2222XXXX',
          date: '2026-05-01',
          seal: ''
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '2026-05-01',
          seal: 'preset'
        },
        status: 'archived',
        sourceQuoteId: '',
        notes: '年度框架协议',
        createdAt: '2026-04-20T08:00:00Z',
        updatedAt: '2026-05-25T16:00:00Z'
      }
    ]
    contracts.value = seedContracts
    const seedTemplates = [
      {
        id: 'tpl_seed_1',
        name: '标准购销合同',
        version: 'v2.0',
        createdAt: '2026-01-01',
        contractType: '购销合同',
        settlement: '月结30天',
        terms: getDefaultTerms(),
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '',
          seal: 'preset'
        },
        products: [{ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' }]
      },
      {
        id: 'tpl_seed_2',
        name: '采购合同（供应商）',
        version: 'v1.0',
        createdAt: '2026-01-01',
        contractType: '采购合同',
        settlement: '款到发货',
        terms: {
          ...getDefaultTerms(),
          settlement: '采用${结算方式}结算方式，货到验收合格后5个工作日内付清全款。',
          quality: '原材料质量以国家标准及双方书面确认的技术参数为准；无书面约定的，按行业通用标准执行。',
          transport: '运输方式由甲方指定，运费由乙方承担；风险划分原则为货物交付甲方前由乙方承担，交付后由甲方承担。'
        },
        partyBInfo: { companyName: '', address: '', representative: '', contact: '', date: '', seal: '' },
        products: [
          { productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '苏州', remark: '' }
        ]
      },
      {
        id: 'tpl_seed_3',
        name: '框架协议（年度合作）',
        version: 'v1.0',
        createdAt: '2026-01-01',
        contractType: '框架协议',
        settlement: '月结60天',
        terms: {
          ...getDefaultTerms(),
          validity:
            '本协议有效期为一年，自双方签字盖章之日起生效；协议期满前30日内，如双方无异议，自动续期一年；具体订单以双方书面确认为准。',
          settlement: '采用${结算方式}结算方式，每月25日对账，次月15日前付清上月货款。',
          breach:
            '任何一方未按协议约定履行义务的，应承担违约责任，赔偿对方因此遭受的直接经济损失；连续两次违约的，守约方有权单方解除协议。'
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '',
          seal: 'preset'
        },
        products: [
          { productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '按订单执行' }
        ]
      }
    ]
    templates.value = seedTemplates
    safeSetJSON(TEMPLATE_KEY, templates.value)
    persist()
    safeSetItem(INIT_KEY, '1')
    safeSetItem(TEMPLATE_INIT_KEY, '1')
  }

  function initTemplateSeedData() {
    if (safeGetItem(TEMPLATE_INIT_KEY)) return
    const seedTemplates = [
      {
        id: 'tpl_seed_1',
        name: '标准购销合同',
        version: 'v2.0',
        createdAt: '2026-01-01',
        contractType: '购销合同',
        settlement: '月结30天',
        terms: getDefaultTerms(),
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '',
          seal: 'preset'
        },
        products: [{ productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '' }]
      },
      {
        id: 'tpl_seed_2',
        name: '采购合同（供应商）',
        version: 'v1.0',
        createdAt: '2026-01-01',
        contractType: '采购合同',
        settlement: '款到发货',
        terms: {
          ...getDefaultTerms(),
          settlement: '采用${结算方式}结算方式，货到验收合格后5个工作日内付清全款。',
          quality: '原材料质量以国家标准及双方书面确认的技术参数为准；无书面约定的，按行业通用标准执行。',
          transport: '运输方式由甲方指定，运费由乙方承担；风险划分原则为货物交付甲方前由乙方承担，交付后由甲方承担。'
        },
        partyBInfo: { companyName: '', address: '', representative: '', contact: '', date: '', seal: '' },
        products: [
          { productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '苏州', remark: '' }
        ]
      },
      {
        id: 'tpl_seed_3',
        name: '框架协议（年度合作）',
        version: 'v1.0',
        createdAt: '2026-01-01',
        contractType: '框架协议',
        settlement: '月结60天',
        terms: {
          ...getDefaultTerms(),
          validity:
            '本协议有效期为一年，自双方签字盖章之日起生效；协议期满前30日内，如双方无异议，自动续期一年；具体订单以双方书面确认为准。',
          settlement: '采用${结算方式}结算方式，每月25日对账，次月15日前付清上月货款。',
          breach:
            '任何一方未按协议约定履行义务的，应承担违约责任，赔偿对方因此遭受的直接经济损失；连续两次违约的，守约方有权单方解除协议。'
        },
        partyBInfo: {
          companyName: '苏州冠久新材料科技有限公司',
          address: '苏州高新区滨河路3337号',
          representative: '宋建',
          contact: '15589233039',
          date: '',
          seal: 'preset'
        },
        products: [
          { productName: '', spec: '', quantity: 0, unitPrice: 0, amount: 0, deliveryPlace: '', remark: '按订单执行' }
        ]
      }
    ]
    templates.value = seedTemplates
    safeSetJSON(TEMPLATE_KEY, templates.value)
    safeSetItem(TEMPLATE_INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(contracts.value, items, 'id')
    contracts.value = merged
    persist()
  }

  function replaceData(newData) {
    contracts.value = newData
    persist()
  }

  return {
    contracts,
    templates,
    draftCount,
    pendingApprovalCount,
    approvedCount,
    signedCount,
    archivedCount,
    cancelledCount,
    totalAmount,
    signedAmount,
    expiringCount,
    expiredCount,
    statusCounts,
    settlementCounts,
    typeCounts,
    customerTopList,
    monthlyAmounts,
    addContract,
    updateContract,
    deleteContract,
    batchDelete,
    changeStatus,
    duplicateContract,
    getContractById,
    getHistory,
    addHistoryEvent,
    getAttachments,
    addAttachment,
    deleteAttachment,
    addTemplate,
    deleteTemplate,
    importFromQuotation,
    numberToChinese,
    getDefaultTerms,
    initSeedData,
    initTemplateSeedData,
    replaceData,
    mergeRemoteItems,
    persist
  }
})
