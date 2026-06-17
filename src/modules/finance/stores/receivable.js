import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import { generateId } from '@/utils/uid'
import { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON } from '@/utils/storage'
import {
  generateOrderNo,
  computeAging,
  refreshOverdueStatus,
  statusBadgeMap,
  methodLabels
} from '@/utils/financeHelpers'
import { toLocalDateStr } from '@/utils/format'

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
  const sourceTypeLabels = {
    contract: '合同',
    order: '订单',
    delivery: '送货单'
  }

  /* 统计计算 */
  const totalAmount = computed(() => receivables.value.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0))
  const totalReceived = computed(() => receivables.value.reduce((s, r) => s + (parseFloat(r.receivedAmount) || 0), 0))
  const totalRemaining = computed(() => Math.max(0, totalAmount.value - totalReceived.value))
  const totalOverdue = computed(() =>
    receivables.value
      .filter((r) => r.status === 'overdue')
      .reduce((s, r) => s + ((parseFloat(r.amount) || 0) - (parseFloat(r.receivedAmount) || 0)), 0)
  )

  /* 本月收款 */
  const thisMonthReceipts = computed(() => {
    const now = new Date()
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    return receipts.value
      .filter((r) => (r.receiptDate || '').startsWith(ym))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  })

  /* 生成应收单号 */
  function generateReceivableNo() {
    return generateOrderNo('YS', receivables.value, 'receivableNo')
  }

  /* 生成收款单号 */
  function generateReceiptNo() {
    return generateOrderNo('RC', receipts.value, 'receiptNo')
  }

  /* 自动更新逾期状态 */
  function _refreshOverdueStatus() {
    const changed = refreshOverdueStatus(receivables.value, 'receivedAmount')
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
      createDate: toLocalDateStr(),
      notes: '',
      ...data
    }
    item.remainingAmount = (parseFloat(item.amount) || 0) - (parseFloat(item.receivedAmount) || 0)
    receivables.value.push(item)
    _refreshOverdueStatus()
    persistReceivables()
    return item
  }

  /* 新增收款单 */
  function addReceipt(data) {
    const receivableId = data.receivableId
    const amount = parseFloat(data.amount) || 0
    if (amount <= 0) return { success: false, error: '收款金额必须大于0' }

    const rvIdx = receivables.value.findIndex((r) => r.id === receivableId)
    if (rvIdx === -1) return { success: false, error: '应收单不存在' }

    const rv = receivables.value[rvIdx]
    const remaining = (parseFloat(rv.amount) || 0) - (parseFloat(rv.receivedAmount) || 0)
    if (amount > remaining) return { success: false, error: '收款金额超过应收余额' }

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
      receiptDate: data.receiptDate || toLocalDateStr(),
      operator: data.operator || getCurrentUser(),
      notes: data.notes || '',
      createDate: toLocalDateStr()
    }
    receipts.value.push(item)
    persistReceipts()

    /* 更新应收单的已收金额和状态（使用 Math.round 避免浮点精度问题） */
    const newReceived = Math.round(((parseFloat(rv.receivedAmount) || 0) + amount) * 100) / 100
    receivables.value[rvIdx].receivedAmount = newReceived
    receivables.value[rvIdx].remainingAmount = Math.round(((parseFloat(rv.amount) || 0) - newReceived) * 100) / 100

    if (newReceived >= (parseFloat(rv.amount) || 0)) {
      receivables.value[rvIdx].status = 'completed'
    } else if (newReceived > 0) {
      receivables.value[rvIdx].status = 'partial'
    }
    _refreshOverdueStatus()
    persistReceivables()
    return { success: true, item }
  }

  /* 按客户查询 */
  function getReceivablesByCustomer(customerId) {
    return receivables.value.filter((r) => r.customerId === customerId)
  }

  /* 撤销收款记录 */
  function deleteReceipt(receivableId, receiptId) {
    const receivable = receivables.value.find((r) => r.id === receivableId)
    if (!receivable) return { success: false, error: '应收单不存在' }
    const receipt = receivable.receipts?.find((rc) => rc.id === receiptId)
    if (!receipt) return { success: false, error: '收款记录不存在' }
    /* 回退已收金额（使用 Math.round 避免浮点精度问题） */
    receivable.receivedAmount = Math.round(((receivable.receivedAmount || 0) - (receipt.amount || 0)) * 100) / 100
    receivable.remainingAmount =
      Math.round(((parseFloat(receivable.amount) || 0) - receivable.receivedAmount) * 100) / 100
    /* 移除收款记录 */
    receivable.receipts = (receivable.receipts || []).filter((rc) => rc.id !== receiptId)
    /* 从全局 receipts 中也移除 */
    receipts.value = receipts.value.filter((rc) => rc.id !== receiptId)
    /* 更新状态 */
    if (receivable.receivedAmount <= 0) receivable.status = 'pending'
    else if (receivable.receivedAmount < (parseFloat(receivable.amount) || 0)) receivable.status = 'partial'
    else receivable.status = 'completed'
    _refreshOverdueStatus()
    persistReceivables()
    persistReceipts()
    return { success: true }
  }

  /* 获取逾期应收 */
  function getOverdueReceivables() {
    _refreshOverdueStatus()
    return receivables.value.filter((r) => r.status === 'overdue')
  }

  /* 账龄分析 */
  function getAgingAnalysis() {
    return computeAging(receivables.value, 'amount', 'receivedAmount')
  }

  /* 初始化种子数据 */
  function initSeedData() {
    if (safeGetItem(INIT_KEY)) return

    receivables.value = [
      {
        id: 'rv1',
        receivableNo: 'YS20260115001',
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        sourceType: 'contract',
        sourceId: 'ct1',
        sourceNo: 'HT202601001',
        amount: 117100,
        receivedAmount: 85000,
        remainingAmount: 32100,
        dueDate: '2026-02-15',
        status: 'partial',
        createDate: '2026-01-15',
        notes: '合同HT202601001应收'
      },
      {
        id: 'rv2',
        receivableNo: 'YS20260301001',
        customerId: 'c3',
        customerName: '广州进出口有限公司',
        sourceType: 'contract',
        sourceId: 'ct2',
        sourceNo: 'HT202603001',
        amount: 310000,
        receivedAmount: 0,
        remainingAmount: 310000,
        dueDate: '2026-04-30',
        status: 'overdue',
        createDate: '2026-03-01',
        notes: '年度框架合同'
      },
      {
        id: 'rv3',
        receivableNo: 'YS20260410001',
        customerId: 'c2',
        customerName: '北京科技发展集团',
        sourceType: 'order',
        sourceId: '',
        sourceNo: 'ORD-20260410-001',
        amount: 54000,
        receivedAmount: 54000,
        remainingAmount: 0,
        dueDate: '2026-05-10',
        status: 'completed',
        createDate: '2026-04-10',
        notes: '不锈钢板304订单'
      },
      {
        id: 'rv4',
        receivableNo: 'YS20260501001',
        customerId: 'c4',
        customerName: '深圳智能制造有限公司',
        sourceType: 'delivery',
        sourceId: '',
        sourceNo: 'DL-20260501-001',
        amount: 86000,
        receivedAmount: 30000,
        remainingAmount: 56000,
        dueDate: '2026-06-01',
        status: 'partial',
        createDate: '2026-05-01',
        notes: '铝合金型材送货'
      },
      {
        id: 'rv5',
        receivableNo: 'YS20260510001',
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        sourceType: 'order',
        sourceId: '',
        sourceNo: 'ORD-20260510-002',
        amount: 42000,
        receivedAmount: 0,
        remainingAmount: 42000,
        dueDate: '2026-06-10',
        status: 'pending',
        createDate: '2026-05-10',
        notes: 'POM塑料订单'
      },
      {
        id: 'rv6',
        receivableNo: 'YS20260420001',
        customerId: 'c6',
        customerName: '武汉钢铁贸易有限公司',
        sourceType: 'contract',
        sourceId: '',
        sourceNo: 'HT-20260420-003',
        amount: 95000,
        receivedAmount: 0,
        remainingAmount: 95000,
        dueDate: '2026-05-20',
        status: 'overdue',
        createDate: '2026-04-20',
        notes: '碳钢Q235合同'
      },
      {
        id: 'rv7',
        receivableNo: 'YS20260515001',
        customerId: 'c3',
        customerName: '广州进出口有限公司',
        sourceType: 'delivery',
        sourceId: '',
        sourceNo: 'DL-20260515-002',
        amount: 67500,
        receivedAmount: 20000,
        remainingAmount: 47500,
        dueDate: '2026-06-15',
        status: 'partial',
        createDate: '2026-05-15',
        notes: '轴承钢送货'
      },
      {
        id: 'rv8',
        receivableNo: 'YS20260520001',
        customerId: 'c2',
        customerName: '北京科技发展集团',
        sourceType: 'contract',
        sourceId: 'ct4',
        sourceNo: 'HT202605001',
        amount: 70000,
        receivedAmount: 0,
        remainingAmount: 70000,
        dueDate: '2026-08-20',
        status: 'pending',
        createDate: '2026-05-20',
        notes: '轴承钢GCr15合同'
      }
    ]
    persistReceivables()

    receipts.value = [
      {
        id: 'rc1',
        receiptNo: 'RC20260120001',
        receivableId: 'rv1',
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        amount: 50000,
        method: 'bank',
        bankName: '中国银行',
        referenceNo: 'BOC20260120001',
        receiptDate: '2026-01-20',
        operator: '宋建',
        notes: '第一笔回款',
        createDate: '2026-01-20'
      },
      {
        id: 'rc2',
        receiptNo: 'RC20260215001',
        receivableId: 'rv1',
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        amount: 35000,
        method: 'bank',
        bankName: '工商银行',
        referenceNo: 'ICBC20260215001',
        receiptDate: '2026-02-15',
        operator: '宋建',
        notes: '第二笔回款',
        createDate: '2026-02-15'
      },
      {
        id: 'rc3',
        receiptNo: 'RC20260412001',
        receivableId: 'rv3',
        customerId: 'c2',
        customerName: '北京科技发展集团',
        amount: 54000,
        method: 'bank',
        bankName: '建设银行',
        referenceNo: 'CCB20260412001',
        receiptDate: '2026-04-12',
        operator: '宋建',
        notes: '全额收款',
        createDate: '2026-04-12'
      },
      {
        id: 'rc4',
        receiptNo: 'RC20260505001',
        receivableId: 'rv4',
        customerId: 'c4',
        customerName: '深圳智能制造有限公司',
        amount: 30000,
        method: 'bank',
        bankName: '招商银行',
        referenceNo: 'CMB20260505001',
        receiptDate: '2026-05-05',
        operator: '宋建',
        notes: '首期收款',
        createDate: '2026-05-05'
      },
      {
        id: 'rc5',
        receiptNo: 'RC20260516001',
        receivableId: 'rv7',
        customerId: 'c3',
        customerName: '广州进出口有限公司',
        amount: 20000,
        method: 'check',
        bankName: '',
        referenceNo: 'CHK20260516001',
        receiptDate: '2026-05-16',
        operator: '宋建',
        notes: '支票收款',
        createDate: '2026-05-16'
      }
    ]
    persistReceipts()

    _refreshOverdueStatus()
    safeSetItem(INIT_KEY, '1')
  }

  return {
    receivables,
    receipts,
    statusLabels,
    statusBadgeMap,
    sourceTypeLabels,
    methodLabels,
    totalAmount,
    totalReceived,
    totalRemaining,
    totalOverdue,
    thisMonthReceipts,
    addReceivable,
    addReceipt,
    deleteReceipt,
    getReceivablesByCustomer,
    getOverdueReceivables,
    getAgingAnalysis,
    refreshOverdueStatus: _refreshOverdueStatus,
    initSeedData,
    persistReceivables,
    persistReceipts
  }
})
