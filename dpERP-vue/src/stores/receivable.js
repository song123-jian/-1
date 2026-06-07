import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'

const RECEIVABLE_KEY = 'gj_erp_receivables'
const RECEIPT_KEY = 'gj_erp_receipts'
const INIT_KEY = 'gj_erp_receivables_initialized'

export const useReceivableStore = defineStore('receivable', () => {
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const receivables = ref(safeGetJSON(RECEIVABLE_KEY) || [])
  const receipts = ref(safeGetJSON(RECEIPT_KEY) || [])

  /* 持久化 */
  function persistReceivables() {
    safeSetJSON(RECEIVABLE_KEY, receivables.value)
  }
  function persistReceipts() {
    safeSetJSON(RECEIPT_KEY, receipts.value)
  }

  /* 状态标签映射 */
  const statusLabels = {
    pending: '待收款',
    partial: '部分收款',
    completed: '已收完',
    overdue: '已逾期'
  }
  const statusBadgeMap = {
    pending: 'warning',
    partial: 'info',
    completed: 'success',
    overdue: 'danger'
  }
  const sourceTypeLabels = {
    contract: '合同',
    order: '订单',
    delivery: '送货单'
  }
  const methodLabels = {
    bank: '银行转账',
    cash: '现金',
    check: '支票',
    other: '其他'
  }

  /* 统计计算 */
  const totalAmount = computed(() =>
    receivables.value.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  )
  const totalReceived = computed(() =>
    receivables.value.reduce((s, r) => s + (parseFloat(r.receivedAmount) || 0), 0)
  )
  const totalRemaining = computed(() =>
    Math.max(0, totalAmount.value - totalReceived.value)
  )
  const totalOverdue = computed(() =>
    receivables.value
      .filter(r => r.status === 'overdue')
      .reduce((s, r) => s + ((parseFloat(r.amount) || 0) - (parseFloat(r.receivedAmount) || 0)), 0)
  )

  /* 本月收款 */
  const thisMonthReceipts = computed(() => {
    const now = new Date()
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return receipts.value
      .filter(r => (r.receiptDate || '').startsWith(ym))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  })

  /* 生成应收单号 */
  function generateReceivableNo() {
    const now = new Date()
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const prefix = 'YS' + dateStr
    let maxSeq = 0
    for (const r of receivables.value) {
      if ((r.receivableNo || '').startsWith(prefix)) {
        const tail = r.receivableNo.slice(prefix.length)
        const n = parseInt(tail, 10)
        if (!isNaN(n) && n > maxSeq) maxSeq = n
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0')
  }

  /* 生成收款单号 */
  function generateReceiptNo() {
    const now = new Date()
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const prefix = 'RC' + dateStr
    let maxSeq = 0
    for (const r of receipts.value) {
      if ((r.receiptNo || '').startsWith(prefix)) {
        const tail = r.receiptNo.slice(prefix.length)
        const n = parseInt(tail, 10)
        if (!isNaN(n) && n > maxSeq) maxSeq = n
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0')
  }

  /* 自动更新逾期状态 */
  function refreshOverdueStatus() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    let changed = false
    for (const r of receivables.value) {
      if (r.status === 'completed') continue
      const dueDate = r.dueDate ? new Date(r.dueDate) : null
      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0)
        const isOverdue = dueDate < now && r.status !== 'completed'
        if (isOverdue && r.status !== 'overdue') {
          r.status = 'overdue'
          changed = true
        } else if (!isOverdue && r.status === 'overdue') {
          r.status = (parseFloat(r.receivedAmount) || 0) > 0 ? 'partial' : 'pending'
          changed = true
        }
      }
    }
    if (changed) persistReceivables()
  }

  /* 新增应收 */
  function addReceivable(data) {
    const item = {
      id: generateId('rv'),
      receivableNo: generateReceivableNo(),
      customerId: '',
      customerName: '',
      sourceType: 'contract',
      sourceId: '',
      sourceNo: '',
      amount: 0,
      receivedAmount: 0,
      remainingAmount: 0,
      dueDate: '',
      status: 'pending',
      createDate: new Date().toISOString().split('T')[0],
      notes: '',
      ...data
    }
    item.remainingAmount = (parseFloat(item.amount) || 0) - (parseFloat(item.receivedAmount) || 0)
    receivables.value.push(item)
    refreshOverdueStatus()
    persistReceivables()
    return item
  }

  /* 新增收款单 */
  function addReceipt(data) {
    const receivableId = data.receivableId
    const amount = parseFloat(data.amount) || 0
    if (amount <= 0) return null

    const rvIdx = receivables.value.findIndex(r => r.id === receivableId)
    if (rvIdx === -1) return null

    const rv = receivables.value[rvIdx]
    const remaining = (parseFloat(rv.amount) || 0) - (parseFloat(rv.receivedAmount) || 0)
    if (amount > remaining) return null

    const item = {
      id: generateId('rc'),
      receiptNo: generateReceiptNo(),
      receivableId,
      customerId: rv.customerId || '',
      customerName: rv.customerName || '',
      amount,
      method: data.method || 'bank',
      bankName: data.bankName || '',
      referenceNo: data.referenceNo || '',
      receiptDate: data.receiptDate || new Date().toISOString().split('T')[0],
      operator: data.operator || getCurrentUser(),
      notes: data.notes || '',
      createDate: new Date().toISOString().split('T')[0]
    }
    receipts.value.push(item)
    persistReceipts()

    /* 更新应收单的已收金额和状态 */
    const newReceived = (parseFloat(rv.receivedAmount) || 0) + amount
    receivables.value[rvIdx].receivedAmount = newReceived
    receivables.value[rvIdx].remainingAmount = (parseFloat(rv.amount) || 0) - newReceived

    if (newReceived >= (parseFloat(rv.amount) || 0)) {
      receivables.value[rvIdx].status = 'completed'
    } else if (newReceived > 0) {
      receivables.value[rvIdx].status = 'partial'
    }
    refreshOverdueStatus()
    persistReceivables()
    return item
  }

  /* 按客户查询 */
  function getReceivablesByCustomer(customerId) {
    return receivables.value.filter(r => r.customerId === customerId)
  }

  /* 获取逾期应收 */
  function getOverdueReceivables() {
    refreshOverdueStatus()
    return receivables.value.filter(r => r.status === 'overdue')
  }

  /* 账龄分析 */
  function getAgingAnalysis() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const result = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days180: 0,
      over180: 0,
      currentCount: 0,
      days30Count: 0,
      days60Count: 0,
      days90Count: 0,
      days180Count: 0,
      over180Count: 0
    }

    for (const r of receivables.value) {
      if (r.status === 'completed') continue
      const remaining = (parseFloat(r.amount) || 0) - (parseFloat(r.receivedAmount) || 0)
      if (remaining <= 0) continue

      const dueDate = r.dueDate ? new Date(r.dueDate) : null
      if (!dueDate) {
        result.current += remaining
        result.currentCount++
        continue
      }
      dueDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((now - dueDate) / 86400000)

      if (diffDays <= 0) {
        result.current += remaining
        result.currentCount++
      } else if (diffDays <= 30) {
        result.days30 += remaining
        result.days30Count++
      } else if (diffDays <= 60) {
        result.days60 += remaining
        result.days60Count++
      } else if (diffDays <= 90) {
        result.days90 += remaining
        result.days90Count++
      } else if (diffDays <= 180) {
        result.days180 += remaining
        result.days180Count++
      } else {
        result.over180 += remaining
        result.over180Count++
      }
    }
    return result
  }

  /* 初始化种子数据 */
  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return

    receivables.value = [
      {
        id: 'rv1', receivableNo: 'YS20260115001', customerId: 'c1', customerName: '上海贸易有限公司',
        sourceType: 'contract', sourceId: 'ct1', sourceNo: 'HT202601001',
        amount: 117100, receivedAmount: 85000, remainingAmount: 32100,
        dueDate: '2026-02-15', status: 'partial', createDate: '2026-01-15', notes: '合同HT202601001应收'
      },
      {
        id: 'rv2', receivableNo: 'YS20260301001', customerId: 'c3', customerName: '广州进出口有限公司',
        sourceType: 'contract', sourceId: 'ct2', sourceNo: 'HT202603001',
        amount: 310000, receivedAmount: 0, remainingAmount: 310000,
        dueDate: '2026-04-30', status: 'overdue', createDate: '2026-03-01', notes: '年度框架合同'
      },
      {
        id: 'rv3', receivableNo: 'YS20260410001', customerId: 'c2', customerName: '北京科技发展集团',
        sourceType: 'order', sourceId: '', sourceNo: 'ORD-20260410-001',
        amount: 54000, receivedAmount: 54000, remainingAmount: 0,
        dueDate: '2026-05-10', status: 'completed', createDate: '2026-04-10', notes: '不锈钢板304订单'
      },
      {
        id: 'rv4', receivableNo: 'YS20260501001', customerId: 'c4', customerName: '深圳智能制造有限公司',
        sourceType: 'delivery', sourceId: '', sourceNo: 'DL-20260501-001',
        amount: 86000, receivedAmount: 30000, remainingAmount: 56000,
        dueDate: '2026-06-01', status: 'partial', createDate: '2026-05-01', notes: '铝合金型材送货'
      },
      {
        id: 'rv5', receivableNo: 'YS20260510001', customerId: 'c1', customerName: '上海贸易有限公司',
        sourceType: 'order', sourceId: '', sourceNo: 'ORD-20260510-002',
        amount: 42000, receivedAmount: 0, remainingAmount: 42000,
        dueDate: '2026-06-10', status: 'pending', createDate: '2026-05-10', notes: 'POM塑料订单'
      },
      {
        id: 'rv6', receivableNo: 'YS20260420001', customerId: 'c6', customerName: '武汉钢铁贸易有限公司',
        sourceType: 'contract', sourceId: '', sourceNo: 'HT-20260420-003',
        amount: 95000, receivedAmount: 0, remainingAmount: 95000,
        dueDate: '2026-05-20', status: 'overdue', createDate: '2026-04-20', notes: '碳钢Q235合同'
      },
      {
        id: 'rv7', receivableNo: 'YS20260515001', customerId: 'c3', customerName: '广州进出口有限公司',
        sourceType: 'delivery', sourceId: '', sourceNo: 'DL-20260515-002',
        amount: 67500, receivedAmount: 20000, remainingAmount: 47500,
        dueDate: '2026-06-15', status: 'partial', createDate: '2026-05-15', notes: '轴承钢送货'
      },
      {
        id: 'rv8', receivableNo: 'YS20260520001', customerId: 'c2', customerName: '北京科技发展集团',
        sourceType: 'contract', sourceId: 'ct4', sourceNo: 'HT202605001',
        amount: 70000, receivedAmount: 0, remainingAmount: 70000,
        dueDate: '2026-08-20', status: 'pending', createDate: '2026-05-20', notes: '轴承钢GCr15合同'
      }
    ]
    persistReceivables()

    receipts.value = [
      {
        id: 'rc1', receiptNo: 'RC20260120001', receivableId: 'rv1', customerId: 'c1',
        customerName: '上海贸易有限公司', amount: 50000, method: 'bank',
        bankName: '中国银行', referenceNo: 'BOC20260120001',
        receiptDate: '2026-01-20', operator: '宋建', notes: '第一笔回款', createDate: '2026-01-20'
      },
      {
        id: 'rc2', receiptNo: 'RC20260215001', receivableId: 'rv1', customerId: 'c1',
        customerName: '上海贸易有限公司', amount: 35000, method: 'bank',
        bankName: '工商银行', referenceNo: 'ICBC20260215001',
        receiptDate: '2026-02-15', operator: '宋建', notes: '第二笔回款', createDate: '2026-02-15'
      },
      {
        id: 'rc3', receiptNo: 'RC20260412001', receivableId: 'rv3', customerId: 'c2',
        customerName: '北京科技发展集团', amount: 54000, method: 'bank',
        bankName: '建设银行', referenceNo: 'CCB20260412001',
        receiptDate: '2026-04-12', operator: '宋建', notes: '全额收款', createDate: '2026-04-12'
      },
      {
        id: 'rc4', receiptNo: 'RC20260505001', receivableId: 'rv4', customerId: 'c4',
        customerName: '深圳智能制造有限公司', amount: 30000, method: 'bank',
        bankName: '招商银行', referenceNo: 'CMB20260505001',
        receiptDate: '2026-05-05', operator: '宋建', notes: '首期收款', createDate: '2026-05-05'
      },
      {
        id: 'rc5', receiptNo: 'RC20260516001', receivableId: 'rv7', customerId: 'c3',
        customerName: '广州进出口有限公司', amount: 20000, method: 'check',
        bankName: '', referenceNo: 'CHK20260516001',
        receiptDate: '2026-05-16', operator: '宋建', notes: '支票收款', createDate: '2026-05-16'
      }
    ]
    persistReceipts()

    refreshOverdueStatus()
    safeSetItem(INIT_KEY, '1')
  }

  return {
    receivables, receipts,
    statusLabels, statusBadgeMap, sourceTypeLabels, methodLabels,
    totalAmount, totalReceived, totalRemaining, totalOverdue, thisMonthReceipts,
    addReceivable, addReceipt,
    getReceivablesByCustomer, getOverdueReceivables, getAgingAnalysis,
    refreshOverdueStatus,
    initSeedData,
    persistReceivables, persistReceipts
  }
})
