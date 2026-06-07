import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mergeArrays } from '@/utils/conflictResolver'
import { useSessionStore } from './session'
import { useSyncEngine } from '@/utils/syncEngine'
import { numberToChinese } from '../utils/numberToChinese.js'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON, safeRemoveItem } from '@/utils/storage'

const OLD_STORAGE_KEY = 'statements'
const STORAGE_KEY = 'gj_erp_statements'
const INIT_KEY = 'gj_erp_statements_initialized'

// 数据迁移：将旧key 'statements' 的数据迁移到新key 'gj_erp_statements'
if (!safeGetItem(STORAGE_KEY) && safeGetItem(OLD_STORAGE_KEY)) {
  try {
    const oldData = safeGetItem(OLD_STORAGE_KEY)
    if (oldData) {
      safeSetItem(STORAGE_KEY, oldData)
      safeRemoveItem(OLD_STORAGE_KEY)
    }
  } catch (e) { /* 迁移失败不影响正常使用 */ }
}

export const useStatementStore = defineStore('statement', () => {
  /* 获取当前用户标识 */
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const statements = ref(safeGetJSON(STORAGE_KEY) || [])

  function generateStatementNo(period) {
    const existing = statements.value
    const prefix = 'GJ-DZ-' + (period || '').replace('-', '')
    let maxSeq = 0
    for (const s of existing) {
      if (s.statementNo && s.statementNo.startsWith(prefix)) {
        const seq = parseInt(s.statementNo.split('-').pop(), 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
    return prefix + '-' + String(maxSeq + 1).padStart(3, '0')
  }

  const statusLabels = {
    draft: '草稿',
    pending: '待审核',
    confirmed: '已确认',
    paid: '已付款',
    voided: '已作废'
  }

  const statusBadgeMap = {
    draft: 'neutral',
    pending: 'warning',
    confirmed: 'success',
    paid: 'info',
    voided: 'danger'
  }

  const totalStatements = computed(() => statements.value.length)

  const pendingCount = computed(() =>
    statements.value.filter(s => s.status === 'pending').length
  )

  const confirmedCount = computed(() =>
    statements.value.filter(s => s.status === 'confirmed').length
  )

  const paidCount = computed(() =>
    statements.value.filter(s => s.status === 'paid').length
  )

  const totalBalance = computed(() =>
    statements.value
      .filter(s => s.status !== 'voided')
      .reduce((sum, s) => sum + ((s.totalAmount || 0) - (s.paidAmount || 0)), 0)
  )

  const totalAmount = computed(() =>
    statements.value
      .filter(s => s.status !== 'voided')
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  )

  const totalPaid = computed(() =>
    statements.value
      .filter(s => s.status !== 'voided')
      .reduce((sum, s) => sum + (s.paidAmount || 0), 0)
  )

  function getById(id) {
    return statements.value.find(s => s.id === id)
  }

  function addStatement(data) {
    const now = new Date().toISOString().split('T')[0]
    const stmt = {
      id: 'stmt_' + Date.now(),
      ...data,
      status: 'pending',
      paidAmount: 0,
      balance: data.totalAmount || 0,
      createdBy: getCurrentUser(),
      createdAt: now,
      updatedAt: now
    }
    statements.value.push(stmt)
    safeSetJSON(STORAGE_KEY, statements.value)
    return stmt
  }

  function updateStatement(id, updates) {
    const idx = statements.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      const now = new Date().toISOString().split('T')[0]
      statements.value[idx] = {
        ...statements.value[idx],
        ...updates,
        updatedAt: now
      }
      if (updates.totalAmount !== undefined) {
        statements.value[idx].balance =
          (updates.totalAmount || 0) - (statements.value[idx].paidAmount || 0)
      }
      safeSetJSON(STORAGE_KEY, statements.value)
    }
  }

  function deleteStatement(id) {
    const stmt = getById(id)
    if (stmt && (stmt.status === 'pending' || stmt.status === 'draft')) {
      statements.value = statements.value.filter(s => s.id !== id)
      const syncEngine = useSyncEngine()
      syncEngine.recordDeletedId('statements', id)
      safeSetJSON(STORAGE_KEY, statements.value)
    }
  }

  function confirmStatement(id) {
    const stmt = getById(id)
    if (!stmt || stmt.status !== 'pending') return false
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    stmt.status = 'confirmed'
    stmt.confirmedAt = now
    stmt.reviewer = stmt.reviewer || 'admin'
    stmt.updatedAt = new Date().toISOString().split('T')[0]
    safeSetJSON(STORAGE_KEY, statements.value)
    return true
  }

  function voidStatement(id) {
    const stmt = getById(id)
    if (!stmt) return false
    if (stmt.status === 'paid') return false
    if (stmt.status !== 'pending' && stmt.status !== 'confirmed') return false
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    stmt.status = 'voided'
    stmt.voidedAt = now
    stmt.updatedAt = new Date().toISOString().split('T')[0]
    safeSetJSON(STORAGE_KEY, statements.value)
    return true
  }

  function markAsPaid(id, paidAmount) {
    const stmt = getById(id)
    if (!stmt || stmt.status !== 'confirmed') return false
    const totalAmt = stmt.totalAmount || 0
    const currentPaid = stmt.paidAmount || 0
    const newPaid = currentPaid + (paidAmount || 0)
    if (newPaid > totalAmt) return false
    stmt.paidAmount = newPaid
    stmt.balance = totalAmt - newPaid
    stmt.lastPaidAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    if (newPaid >= totalAmt) {
      stmt.status = 'paid'
      stmt.paidAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    stmt.updatedAt = new Date().toISOString().split('T')[0]
    safeSetJSON(STORAGE_KEY, statements.value)
    return true
  }

  function reopenStatement(id) {
    const stmt = getById(id)
    if (!stmt) return false
    if (stmt.status !== 'confirmed' && stmt.status !== 'voided') return false
    stmt.status = 'pending'
    stmt.reopenedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    if (stmt.paidAmount) stmt.paidAmount = 0
    stmt.balance = stmt.totalAmount || 0
    stmt.updatedAt = new Date().toISOString().split('T')[0]
    safeSetJSON(STORAGE_KEY, statements.value)
    return true
  }

  function checkAlerts() {
    const now = new Date()
    const alerts = []
    for (const s of statements.value) {
      if (s.status === 'pending') {
        const createdDate = new Date(s.createdAt || s.updatedAt || now)
        const daysPending = Math.floor((now - createdDate) / 86400000)
        if (daysPending > 7) {
          alerts.push({
            id: s.id,
            type: 'overdue_confirm',
            priority: daysPending > 14 ? 'high' : 'medium',
            message: s.statementNo + ' 待审核已超 ' + daysPending + ' 天',
            statementNo: s.statementNo,
            days: daysPending
          })
        }
      }
      if (s.status === 'confirmed') {
        const balance = (s.totalAmount || 0) - (s.paidAmount || 0)
        if (balance > 0) {
          const confirmDate = new Date(s.confirmedAt || s.updatedAt || s.createdAt || now)
          const daysSinceConfirm = Math.floor((now - confirmDate) / 86400000)
          const termMatch = (s.paymentTerm || '').match(/\d+/)
          const termDays = termMatch ? parseInt(termMatch[0]) : 30
          if (daysSinceConfirm > termDays) {
            alerts.push({
              id: s.id,
              type: 'overdue_payment',
              priority: 'high',
              message: s.statementNo + ' 付款逾期 ' + (daysSinceConfirm - termDays) + ' 天，未结 ¥' + balance.toFixed(2),
              statementNo: s.statementNo,
              days: daysSinceConfirm - termDays,
              balance
            })
          }
        }
      }
    }
    return alerts
  }

  function analyzeDiscrepancies(statementId, transactions) {
    const stmt = getById(statementId)
    if (!stmt) return null
    const parts = (stmt.period || '').split('-')
    const yr = parseInt(parts[0]) || 0
    const mo = parseInt(parts[1]) || 0
    if (!yr || !mo) return null
    const lastDay = new Date(yr, mo, 0).getDate()
    const periodStart = stmt.period + '-01'
    const periodEnd = stmt.period + '-' + String(lastDay).padStart(2, '0')
    const matchedTxns = (transactions || []).filter(t =>
      t.customerId === stmt.buyerId &&
      t.date >= periodStart &&
      t.date <= periodEnd &&
      t.type !== 'collection'
    )
    const stmtTotal = stmt.subtotal || 0
    const txnTotal = matchedTxns.reduce((sum, t) => sum + (t.amount || 0), 0)
    const diff = stmtTotal - txnTotal
    return {
      statementSubtotal: stmtTotal,
      transactionTotal: txnTotal,
      difference: diff,
      matchedCount: matchedTxns.length,
      itemCount: (stmt.items || []).length,
      isBalanced: Math.abs(diff) < 0.01
    }
  }

  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return
    statements.value = [
      {
        id: 'st1',
        statementNo: 'GJ-DZ-202411-001',
        type: '月度对账单',
        period: '2024-11',
        reconDate: '2024-12-01',
        preparer: 'admin',
        reviewer: '',
        contactPhone: '13800138001',
        buyerId: 'c2',
        buyerName: '北京科技发展集团',
        buyerAddress: '北京市海淀区中关村大街1号',
        buyerContact: '张经理',
        buyerPhone: '010-88886666',
        buyerEmail: 'zhang@bjkj.com',
        sellerId: 's1',
        sellerName: '江苏钢铁集团有限公司',
        sellerAddress: '江苏省南京市江宁区工业路88号',
        sellerContact: '李总',
        sellerPhone: '025-87654321',
        sellerEmail: 'li@jssteel.com',
        items: [
          { date: '2024-11-05', name: '碳钢Q235', code: 'MTL-007', spec: 'Φ12mm', color: '', unit: 'kg', qty: 500, price: 45, amount: 22500, remark: '' },
          { date: '2024-11-15', name: '不锈钢304', code: 'MTL-001', spec: '2mm板', color: '银色', unit: 'kg', qty: 300, price: 18.5, amount: 5550, remark: '' }
        ],
        subtotal: 28050,
        taxRate: 13,
        taxAmount: 3646.50,
        totalAmount: 31696.50,
        totalChinese: numberToChinese(31696.50),
        paidAmount: 10000,
        balance: 21696.50,
        paymentMethod: '银行转账',
        paymentTerm: '月结30天',
        bankName: '中国工商银行南京江宁支行',
        bankAccount: '4301011234567890123',
        bankHolder: '江苏钢铁集团有限公司',
        buyerSign: '',
        buyerSignDate: '',
        sellerSign: '',
        sellerSignDate: '',
        status: 'pending',
        createdAt: '2024-12-01',
        updatedAt: '2024-12-01'
      },
      {
        id: 'st2',
        statementNo: 'GJ-DZ-202411-002',
        type: '月度对账单',
        period: '2024-11',
        reconDate: '2024-12-02',
        preparer: 'admin',
        reviewer: 'finance',
        contactPhone: '13900139002',
        buyerId: 'c1',
        buyerName: '上海贸易有限公司',
        buyerAddress: '上海市浦东新区陆家嘴环路1000号',
        buyerContact: '王总',
        buyerPhone: '021-66668888',
        buyerEmail: 'wang@shmy.com',
        sellerId: 's2',
        sellerName: '浙江化工原料有限公司',
        sellerAddress: '浙江省杭州市萧山区化工园区',
        sellerContact: '赵经理',
        sellerPhone: '0571-87654321',
        sellerEmail: 'zhao@zjhg.com',
        items: [
          { date: '2024-11-03', name: '铝合金型材6063', code: 'MTL-003', spec: '40x40mm', color: '银白', unit: 'kg', qty: 800, price: 95, amount: 76000, remark: '' },
          { date: '2024-11-20', name: '铜棒H62', code: 'MTL-005', spec: 'Φ20mm', color: '金色', unit: 'kg', qty: 200, price: 58, amount: 11600, remark: '加急订单' }
        ],
        subtotal: 87600,
        taxRate: 13,
        taxAmount: 11388,
        totalAmount: 98988,
        totalChinese: numberToChinese(98988),
        paidAmount: 50000,
        balance: 48988,
        paymentMethod: '承兑汇票',
        paymentTerm: '票到15天',
        bankName: '中国建设银行杭州萧山支行',
        bankAccount: '3302012345678901234',
        bankHolder: '浙江化工原料有限公司',
        buyerSign: '王明',
        buyerSignDate: '2024-12-05',
        sellerSign: '赵刚',
        sellerSignDate: '2024-12-04',
        status: 'confirmed',
        createdAt: '2024-12-02',
        updatedAt: '2024-12-05'
      }
    ]
    safeSetJSON(STORAGE_KEY, statements.value)
    safeSetItem(INIT_KEY, '1')
  }

  function mergeRemoteItems(items) {
    if (!Array.isArray(items)) return
    const merged = mergeArrays(statements.value, items, 'id')
    statements.value = merged
    safeSetJSON(STORAGE_KEY, statements.value)
  }

  function replaceData(newData) {
    statements.value = newData
    safeSetJSON(STORAGE_KEY, statements.value)
  }

  return {
    statements,
    statusLabels,
    statusBadgeMap,
    totalStatements,
    pendingCount,
    confirmedCount,
    paidCount,
    totalBalance,
    totalAmount,
    totalPaid,
    getById,
    addStatement,
    updateStatement,
    deleteStatement,
    confirmStatement,
    voidStatement,
    markAsPaid,
    reopenStatement,
    checkAlerts,
    analyzeDiscrepancies,
    generateStatementNo,
    numberToChinese,
    initSeedData,
    replaceData, mergeRemoteItems
  }
})
