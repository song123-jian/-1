import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { generateId } from '@/utils/uid'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'
import { generateOrderNo, computeAging, refreshOverdueStatus, statusBadgeMap, methodLabels } from '@/utils/financeHelpers'

const PAYABLE_KEY = 'gj_erp_payables'
const PAYMENT_KEY = 'gj_erp_payments'
const INIT_KEY = 'gj_erp_payables_initialized'

export const usePayableStore = defineStore('payable', () => {
  function getCurrentUser() {
    try {
      const sessionStore = useSessionStore()
      return sessionStore.roleName || '未知用户'
    } catch (e) {
      return '未知用户'
    }
  }

  const payables = ref(safeGetJSON(PAYABLE_KEY) || [])
  const payments = ref(safeGetJSON(PAYMENT_KEY) || [])

  /* 持久化 */
  function persistPayables() {
    safeSetJSON(PAYABLE_KEY, payables.value)
  }
  function persistPayments() {
    safeSetJSON(PAYMENT_KEY, payments.value)
  }

  /* 状态标签映射 */
  const statusLabels = {
    pending: '待付款',
    partial: '部分付款',
    completed: '已付完',
    overdue: '已逾期'
  }
  const sourceTypeLabels = {
    purchase: '采购单',
    inbound: '入库单',
    contract: '合同'
  }

  /* 统计计算 */
  const totalAmount = computed(() =>
    payables.value.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  )
  const totalPaid = computed(() =>
    payables.value.reduce((s, p) => s + (parseFloat(p.paidAmount) || 0), 0)
  )
  const totalRemaining = computed(() =>
    Math.max(0, totalAmount.value - totalPaid.value)
  )
  const totalOverdue = computed(() =>
    payables.value
      .filter(p => p.status === 'overdue')
      .reduce((s, p) => s + ((parseFloat(p.amount) || 0) - (parseFloat(p.paidAmount) || 0)), 0)
  )

  /* 本月付款 */
  const thisMonthPayments = computed(() => {
    const now = new Date()
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return payments.value
      .filter(p => (p.paymentDate || '').startsWith(ym))
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  })

  /* 生成应付单号 */
  function generatePayableNo() {
    return generateOrderNo('YF', payables.value, 'payableNo')
  }

  /* 生成付款单号 */
  function generatePaymentNo() {
    return generateOrderNo('PY', payments.value, 'paymentNo')
  }

  /* 自动更新逾期状态 */
  function _refreshOverdueStatus() {
    const changed = refreshOverdueStatus(payables.value, 'paidAmount')
    if (changed) persistPayables()
  }

  /* 新增应付 */
  function addPayable(data) {
    const item = {
      id: generateId('py'),
      payableNo: generatePayableNo(),
      supplierId: '',
      supplierName: '',
      sourceType: 'purchase',
      sourceId: '',
      sourceNo: '',
      amount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      dueDate: '',
      status: 'pending',
      createDate: new Date().toISOString().split('T')[0],
      notes: '',
      ...data
    }
    item.remainingAmount = (parseFloat(item.amount) || 0) - (parseFloat(item.paidAmount) || 0)
    payables.value.push(item)
    _refreshOverdueStatus()
    persistPayables()
    return item
  }

  /* 新增付款单 */
  function addPayment(data) {
    const payableId = data.payableId
    const amount = parseFloat(data.amount) || 0
    if (amount <= 0) return { success: false, error: '付款金额必须大于0' }

    const pyIdx = payables.value.findIndex(p => p.id === payableId)
    if (pyIdx === -1) return { success: false, error: '应付单不存在' }

    const py = payables.value[pyIdx]
    const remaining = (parseFloat(py.amount) || 0) - (parseFloat(py.paidAmount) || 0)
    if (amount > remaining) return { success: false, error: '付款金额超过应付余额' }

    const item = {
      id: generateId('pm'),
      paymentNo: generatePaymentNo(),
      payableId,
      supplierId: py.supplierId || '',
      supplierName: py.supplierName || '',
      amount,
      method: data.method || 'bank',
      bankName: data.bankName || '',
      referenceNo: data.referenceNo || '',
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      operator: data.operator || getCurrentUser(),
      notes: data.notes || '',
      createDate: new Date().toISOString().split('T')[0]
    }
    payments.value.push(item)
    persistPayments()

    /* 更新应付单的已付金额和状态 */
    const newPaid = (parseFloat(py.paidAmount) || 0) + amount
    payables.value[pyIdx].paidAmount = newPaid
    payables.value[pyIdx].remainingAmount = (parseFloat(py.amount) || 0) - newPaid

    if (newPaid >= (parseFloat(py.amount) || 0)) {
      payables.value[pyIdx].status = 'completed'
    } else if (newPaid > 0) {
      payables.value[pyIdx].status = 'partial'
    }
    _refreshOverdueStatus()
    persistPayables()
    return { success: true, item }
  }

  /* 按供应商查询 */
  function getPayablesBySupplier(supplierId) {
    return payables.value.filter(p => p.supplierId === supplierId)
  }

  /* 撤销付款记录 */
  function deletePayment(payableId, paymentId) {
    const payable = payables.value.find(p => p.id === payableId)
    if (!payable) return { success: false, error: '应付单不存在' }
    const payment = payable.payments?.find(pm => pm.id === paymentId)
    if (!payment) return { success: false, error: '付款记录不存在' }
    /* 回退已付金额 */
    payable.paidAmount = Math.max(0, (payable.paidAmount || 0) - (payment.amount || 0))
    payable.remainingAmount = (parseFloat(payable.amount) || 0) - payable.paidAmount
    /* 移除付款记录 */
    payable.payments = (payable.payments || []).filter(pm => pm.id !== paymentId)
    /* 从全局 payments 中也移除 */
    payments.value = payments.value.filter(pm => pm.id !== paymentId)
    /* 更新状态 */
    if (payable.paidAmount <= 0) payable.status = 'pending'
    else if (payable.paidAmount < (parseFloat(payable.amount) || 0)) payable.status = 'partial'
    else payable.status = 'completed'
    _refreshOverdueStatus()
    persistPayables()
    persistPayments()
    return { success: true }
  }

  /* 获取逾期应付 */
  function getOverduePayables() {
    _refreshOverdueStatus()
    return payables.value.filter(p => p.status === 'overdue')
  }

  /* 账龄分析 */
  function getAgingAnalysis() {
    return computeAging(payables.value, 'amount', 'paidAmount')
  }

  /* 初始化种子数据 */
  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return

    payables.value = [
      {
        id: 'py1', payableNo: 'YF20260410001', supplierId: 's1', supplierName: '江苏钢铁集团有限公司',
        sourceType: 'purchase', sourceId: '', sourceNo: 'PO-2026-001',
        amount: 90000, paidAmount: 90000, remainingAmount: 0,
        dueDate: '2026-05-10', status: 'completed', createDate: '2026-04-10', notes: '碳钢Q235采购'
      },
      {
        id: 'py2', payableNo: 'YF20260415001', supplierId: 's2', supplierName: '浙江化工原料有限公司',
        sourceType: 'purchase', sourceId: '', sourceNo: 'PO-2026-002',
        amount: 56000, paidAmount: 30000, remainingAmount: 26000,
        dueDate: '2026-05-15', status: 'partial', createDate: '2026-04-15', notes: 'ABS树脂采购'
      },
      {
        id: 'py3', payableNo: 'YF20260501001', supplierId: 's3', supplierName: '广东有色金属有限公司',
        sourceType: 'inbound', sourceId: 'w4', sourceNo: 'RK20260519002',
        amount: 125000, paidAmount: 0, remainingAmount: 125000,
        dueDate: '2026-06-01', status: 'overdue', createDate: '2026-05-01', notes: '铝合金型材入库'
      },
      {
        id: 'py4', payableNo: 'YF20260510001', supplierId: 's1', supplierName: '江苏钢铁集团有限公司',
        sourceType: 'contract', sourceId: '', sourceNo: 'HT-2026-PO-001',
        amount: 78000, paidAmount: 0, remainingAmount: 78000,
        dueDate: '2026-06-10', status: 'pending', createDate: '2026-05-10', notes: '不锈钢板304采购合同'
      },
      {
        id: 'py5', payableNo: 'YF20260515001', supplierId: 's4', supplierName: '山东机械制造有限公司',
        sourceType: 'purchase', sourceId: '', sourceNo: 'PO-2026-005',
        amount: 35000, paidAmount: 15000, remainingAmount: 20000,
        dueDate: '2026-05-30', status: 'partial', createDate: '2026-05-15', notes: 'POM塑料采购'
      },
      {
        id: 'py6', payableNo: 'YF20260520001', supplierId: 's2', supplierName: '浙江化工原料有限公司',
        sourceType: 'purchase', sourceId: '', sourceNo: 'PO-2026-006',
        amount: 48000, paidAmount: 0, remainingAmount: 48000,
        dueDate: '2026-06-20', status: 'pending', createDate: '2026-05-20', notes: '尼龙66采购'
      }
    ]
    persistPayables()

    payments.value = [
      {
        id: 'pm1', paymentNo: 'PY20260420001', payableId: 'py1', supplierId: 's1',
        supplierName: '江苏钢铁集团有限公司', amount: 90000, method: 'bank',
        bankName: '中国银行', referenceNo: 'BOC20260420001',
        paymentDate: '2026-04-20', operator: '宋建', notes: '全额付款', createDate: '2026-04-20'
      },
      {
        id: 'pm2', paymentNo: 'PY20260425001', payableId: 'py2', supplierId: 's2',
        supplierName: '浙江化工原料有限公司', amount: 30000, method: 'bank',
        bankName: '工商银行', referenceNo: 'ICBC20260425001',
        paymentDate: '2026-04-25', operator: '宋建', notes: '首期付款', createDate: '2026-04-25'
      },
      {
        id: 'pm3', paymentNo: 'PY20260518001', payableId: 'py5', supplierId: 's4',
        supplierName: '山东机械制造有限公司', amount: 15000, method: 'cash',
        bankName: '', referenceNo: '',
        paymentDate: '2026-05-18', operator: '宋建', notes: '现金付款', createDate: '2026-05-18'
      },
      {
        id: 'pm4', paymentNo: 'PY20260525001', payableId: 'py2', supplierId: 's2',
        supplierName: '浙江化工原料有限公司', amount: 26000, method: 'bank',
        bankName: '建设银行', referenceNo: 'CCB20260525001',
        paymentDate: '2026-05-25', operator: '宋建', notes: '尾款支付', createDate: '2026-05-25'
      }
    ]
    persistPayments()

    _refreshOverdueStatus()
    safeSetItem(INIT_KEY, '1')
  }

  return {
    payables, payments,
    statusLabels, statusBadgeMap, sourceTypeLabels, methodLabels,
    totalAmount, totalPaid, totalRemaining, totalOverdue, thisMonthPayments,
    addPayable, addPayment, deletePayment,
    getPayablesBySupplier, getOverduePayables, getAgingAnalysis,
    refreshOverdueStatus: _refreshOverdueStatus,
    initSeedData,
    persistPayables, persistPayments
  }
})
