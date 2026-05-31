import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_collections'
const INIT_KEY = 'gj_erp_collections_initialized'

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

function generateCollectionNo() {
  const now = new Date()
  const prefix = 'COL-' + now.getFullYear() + '-'
  const existing = load(STORAGE_KEY, [])
  let maxSeq = 0
  for (let i = 0; i < existing.length; i++) {
    const no = existing[i].collectionNo || ''
    if (no.startsWith(prefix)) {
      const parts = no.split('-')
      const seq = parseInt(parts[parts.length - 1]) || 0
      if (seq > maxSeq) maxSeq = seq
    }
  }
  return prefix + String(maxSeq + 1).padStart(4, '0')
}

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref(load(STORAGE_KEY, []))

  const methodLabels = {
    bank_transfer: '银行转账',
    cash: '现金',
    check: '支票',
    wechat: '微信',
    alipay: '支付宝',
    other: '其他'
  }

  const statusLabels = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    voided: '已作废'
  }

  const statusBadgeMap = {
    pending: 'warning',
    confirmed: 'success',
    completed: 'success',
    voided: 'danger'
  }

  function _save() {
    persist(STORAGE_KEY, collections.value)
  }

  const totalCollected = computed(() => {
    let sum = 0
    for (const c of collections.value) {
      if (c.status === 'voided') continue
      if (c.status === 'confirmed' || c.status === 'completed') {
        sum += parseFloat(c.amount) || 0
      }
    }
    return sum
  })

  const totalAmount = computed(() => {
    let sum = 0
    for (const c of collections.value) {
      if (c.status === 'voided') continue
      sum += parseFloat(c.amount) || 0
    }
    return sum
  })

  const totalPending = computed(() => {
    return Math.max(0, totalAmount.value - totalCollected.value)
  })

  const totalOverdue = computed(() => {
    let sum = 0
    for (const c of collections.value) {
      if (c.status === 'voided') continue
      if (c.status !== 'confirmed' && c.status !== 'completed') {
        if (getOverdueDays(c) > 0) {
          sum += parseFloat(c.amount) || 0
        }
      }
    }
    return sum
  })

  const collectionRate = computed(() => {
    const total = totalAmount.value
    if (total === 0) return 0
    return Math.round((totalCollected.value / total) * 1000) / 10
  })

  const pendingCount = computed(() => {
    return collections.value.filter(c => c.status === 'pending').length
  })

  function getOverdueDays(col) {
    const dueDate = col.dueDate || col.date || null
    if (!dueDate) return 0
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const d = new Date(dueDate)
    d.setHours(0, 0, 0, 0)
    const days = Math.floor((now - d) / 86400000)
    return days > 0 ? days : 0
  }

  function getProgress(col) {
    if (!col || !col.amount || col.amount <= 0) return 0
    if (!col.installments || col.installments.length === 0) {
      return (col.status === 'confirmed' || col.status === 'completed') ? 100 : 0
    }
    let paidAmount = 0
    for (const inst of col.installments) {
      if (inst.status === 'paid') paidAmount += parseFloat(inst.amount) || 0
    }
    return Math.min(100, Math.round(paidAmount / col.amount * 100))
  }

  function computeAgingData(customers, transactions) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const agingData = []

    for (const c of customers) {
      const balance = parseFloat(c.balance) || 0
      if (balance <= 0) continue

      let current = 0, days30 = 0, days60 = 0, days90 = 0, daysOver = 0
      const custTxns = (transactions || []).filter(t =>
        t.customerId === c.id || t.customerName === c.fullName || t.customerName === c.companyName
      )
      const custPayments = collections.value.filter(p =>
        p.customerId === c.id || p.customerName === c.fullName || p.customerName === c.companyName
      )

      let totalDebit = 0
      let totalPaid = 0
      for (const p of custPayments) { totalPaid += parseFloat(p.amount) || 0 }

      let hasRealTxns = false
      for (const t of custTxns) {
        const amt = parseFloat(t.amount || t.totalAmount) || 0
        if (t.type === 'sale' || t.type === 'income' || t.type === 'quotation' || t.type === 'delivery') {
          totalDebit += amt
          hasRealTxns = true
          const tDate = new Date(t.date || t.transactionDate)
          tDate.setHours(0, 0, 0, 0)
          const diffDays = Math.floor((today - tDate) / (1000 * 60 * 60 * 24))
          if (diffDays <= 30) current += amt
          else if (diffDays <= 60) days30 += amt
          else if (diffDays <= 90) days60 += amt
          else daysOver += amt
        }
      }

      let remaining = Math.max(0, totalDebit > 0 ? totalDebit - totalPaid : balance)

      if (hasRealTxns && totalDebit > 0) {
        const ratio = remaining / totalDebit
        current = Math.round(current * ratio)
        days30 = Math.round(days30 * ratio)
        days60 = Math.round(days60 * ratio)
        days90 = Math.round(days60 > 0 ? Math.round((days60 + daysOver) * ratio * 0.3) : 0)
        daysOver = Math.round(daysOver * ratio)
        const total = current + days30 + days60 + days90 + daysOver
        if (total <= 0 && balance > 0) { current = balance }
      } else {
        current = balance
        days30 = 0; days60 = 0; days90 = 0; daysOver = 0
      }

      const status = daysOver > 0 ? '高风险' : days60 > 0 ? '中风险' : days30 > 0 ? '低风险' : '正常'
      const statusColor = daysOver > 0 ? 'var(--color-danger)' : days60 > 0 ? 'var(--color-warning)' : days30 > 0 ? 'var(--color-info)' : 'var(--color-success)'

      agingData.push({
        name: c.fullName || c.companyName || c.shortName || c.name,
        balance, current, days30, days60, days90, daysOver, status, statusColor
      })
    }
    return agingData
  }

  function addCollection(data) {
    const item = {
      id: 'col_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      collectionNo: generateCollectionNo(),
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      statementId: data.statementId || '',
      date: data.date || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate || '',
      amount: parseFloat(data.amount) || 0,
      currency: 'CNY',
      method: data.method || 'bank_transfer',
      referenceNo: data.referenceNo || '',
      bankAccount: data.bankAccount || '',
      notes: data.notes || '',
      status: 'pending',
      installments: [],
      createdAt: new Date().toISOString()
    }
    collections.value.push(item)
    _save()
    return item
  }

  function updateCollection(id, updates) {
    const idx = collections.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      collections.value[idx] = { ...collections.value[idx], ...updates, updatedAt: new Date().toISOString() }
      _save()
    }
  }

  function deleteCollection(id) {
    collections.value = collections.value.filter(c => c.id !== id)
    _save()
  }

  function confirmCollection(id) {
    const idx = collections.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      collections.value[idx].status = 'confirmed'
      collections.value[idx].confirmedAt = new Date().toISOString()
      _save()
    }
  }

  function voidCollection(id) {
    const idx = collections.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      collections.value[idx].status = 'voided'
      collections.value[idx].voidedAt = new Date().toISOString()
      _save()
    }
  }

  function addInstallment(colId, installment) {
    const col = collections.value.find(c => c.id === colId)
    if (!col) return null
    if (!col.installments) col.installments = []

    const inst = {
      id: 'inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      period: installment.period || (col.installments.length + 1),
      amount: parseFloat(installment.amount) || 0,
      date: installment.date || new Date().toISOString().split('T')[0],
      method: installment.method || col.method || 'bank_transfer',
      status: installment.status || 'pending',
      notes: installment.notes || '',
      createdAt: new Date().toISOString()
    }

    if (inst.amount <= 0) return null

    let totalInstalled = 0
    for (const i of col.installments) { totalInstalled += parseFloat(i.amount) || 0 }
    if (totalInstalled + inst.amount > col.amount) {
      console.warn('分期总额将超过回款总额')
    }

    col.installments.push(inst)

    let paidAmount = 0
    for (const i of col.installments) {
      if (i.status === 'paid') paidAmount += parseFloat(i.amount) || 0
    }
    if (paidAmount >= col.amount) { col.status = 'completed' }
    else if (paidAmount > 0) { col.status = 'confirmed' }

    _save()
    return inst
  }

  function updateInstallmentStatus(colId, instId, newStatus) {
    const col = collections.value.find(c => c.id === colId)
    if (!col || !col.installments) return

    for (const inst of col.installments) {
      if (inst.id === instId) {
        inst.status = newStatus
        if (newStatus === 'paid') inst.paidAt = new Date().toISOString()
        break
      }
    }

    let paidAmount = 0
    for (const i of col.installments) {
      if (i.status === 'paid') paidAmount += parseFloat(i.amount) || 0
    }
    if (paidAmount >= col.amount) col.status = 'completed'
    else if (paidAmount > 0) col.status = 'confirmed'

    _save()
  }

  function deleteInstallment(colId, instId) {
    const col = collections.value.find(c => c.id === colId)
    if (!col || !col.installments) return
    col.installments = col.installments.filter(inst => inst.id !== instId)
    for (let k = 0; k < col.installments.length; k++) {
      col.installments[k].period = k + 1
    }
    _save()
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    collections.value = [
      {
        id: 'col1', collectionNo: 'COL-2024-0034', customerId: 'c2',
        customerName: '北京科技发展集团', statementId: 'STM-2024-0015',
        date: '2024-12-15', dueDate: '2025-01-15', amount: 50000,
        currency: 'CNY', method: 'bank_transfer', referenceNo: 'BT20241215001',
        bankAccount: '6222XXXXXXXX1234', notes: '', status: 'confirmed',
        installments: [], createdAt: '2024-12-15T10:00:00'
      },
      {
        id: 'col2', collectionNo: 'COL-2024-0035', customerId: 'c1',
        customerName: '上海贸易有限公司', statementId: 'STM-2024-0016',
        date: '2024-12-16', dueDate: '2025-01-16', amount: 85000,
        currency: 'CNY', method: 'bank_transfer', referenceNo: 'BT20241216002',
        bankAccount: '6222XXXXXXXX5678', notes: '', status: 'confirmed',
        installments: [], createdAt: '2024-12-16T10:00:00'
      },
      {
        id: 'col3', collectionNo: 'COL-2024-0036', customerId: 'c3',
        customerName: '广州进出口有限公司', statementId: '',
        date: '2024-11-20', dueDate: '2024-12-20', amount: 120000,
        currency: 'CNY', method: 'bank_transfer', referenceNo: 'BT20241120001',
        bankAccount: '', notes: '大额分期回款', status: 'pending',
        installments: [
          { id: 'inst1', period: 1, amount: 40000, date: '2024-11-20', method: 'bank_transfer', status: 'paid', notes: '第一期', createdAt: '2024-11-20T10:00:00', paidAt: '2024-11-22T10:00:00' },
          { id: 'inst2', period: 2, amount: 40000, date: '2024-12-20', method: 'bank_transfer', status: 'pending', notes: '第二期', createdAt: '2024-11-20T10:00:00' },
          { id: 'inst3', period: 3, amount: 40000, date: '2025-01-20', method: 'bank_transfer', status: 'pending', notes: '第三期', createdAt: '2024-11-20T10:00:00' }
        ],
        createdAt: '2024-11-20T10:00:00'
      },
      {
        id: 'col4', collectionNo: 'COL-2024-0037', customerId: 'c6',
        customerName: '武汉钢铁贸易有限公司', statementId: '',
        date: '2024-10-01', dueDate: '2024-11-01', amount: 32000,
        currency: 'CNY', method: 'cash', referenceNo: '',
        bankAccount: '', notes: '逾期未回款', status: 'pending',
        installments: [], createdAt: '2024-10-01T10:00:00'
      },
      {
        id: 'col5', collectionNo: 'COL-2024-0038', customerId: 'c4',
        customerName: '深圳智能制造有限公司', statementId: '',
        date: '2024-12-01', dueDate: '2025-01-01', amount: 45000,
        currency: 'CNY', method: 'wechat', referenceNo: 'WX20241201001',
        bankAccount: '', notes: '', status: 'completed',
        installments: [], createdAt: '2024-12-01T10:00:00'
      }
    ]
    _save()
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    collections,
    methodLabels,
    statusLabels,
    statusBadgeMap,
    totalCollected,
    totalAmount,
    totalPending,
    totalOverdue,
    collectionRate,
    pendingCount,
    getOverdueDays,
    getProgress,
    computeAgingData,
    addCollection,
    updateCollection,
    deleteCollection,
    confirmCollection,
    voidCollection,
    addInstallment,
    updateInstallmentStatus,
    deleteInstallment,
    initSeedData
  }
})
