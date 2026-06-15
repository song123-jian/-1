/**
 * 财务 Store 深度测试
 * 覆盖账龄分析边界、逾期状态翻转、部分付款精度、负数验证、撤销收款、单号溢出
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReceivableStore } from '@/modules/finance/stores/receivable'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== Mock 依赖 ===== */
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '管理员'
  })
}))

describe('财务 Store 深度测试', () => {
  let store

  beforeEach(() => {
    clearStorage()
    setupPinia()
    store = useReceivableStore()
  })

  /* ==================== FN-01: 账龄分析边界 ==================== */
  describe('FN-01: 账龄分析边界', () => {
    it('dueDate 为 null 时归入 current', () => {
      store.addReceivable({
        customerId: 'c1',
        customerName: '测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: null,
        status: 'pending'
      })
      const aging = store.getAgingAnalysis()
      expect(aging.current).toBe(10000)
      expect(aging.currentCount).toBe(1)
    })

    it('dueDate 为未来日期时归入 current', () => {
      const futureDate = '2099-12-31'
      store.addReceivable({
        customerId: 'c2',
        customerName: '未来客户',
        amount: 20000,
        receivedAmount: 0,
        dueDate: futureDate,
        status: 'pending'
      })
      const aging = store.getAgingAnalysis()
      expect(aging.current).toBe(20000)
      expect(aging.currentCount).toBe(1)
    })

    it('dueDate 为今天时归入 current', () => {
      const today = new Date().toISOString().split('T')[0]
      store.addReceivable({
        customerId: 'c3',
        customerName: '今日到期客户',
        amount: 30000,
        receivedAmount: 0,
        dueDate: today,
        status: 'pending'
      })
      const aging = store.getAgingAnalysis()
      expect(aging.current).toBe(30000)
      expect(aging.currentCount).toBe(1)
    })

    it('dueDate 为过去日期时归入对应账龄段', () => {
      /* 逾期15天 -> days30（1-30天） */
      const pastDate15 = new Date()
      pastDate15.setDate(pastDate15.getDate() - 15)
      const dueDateStr15 = pastDate15.toISOString().split('T')[0]

      store.addReceivable({
        customerId: 'c4',
        customerName: '逾期15天客户',
        amount: 50000,
        receivedAmount: 0,
        dueDate: dueDateStr15,
        status: 'overdue'
      })
      const aging = store.getAgingAnalysis()
      expect(aging.days30).toBe(50000)
      expect(aging.days30Count).toBe(1)
    })

    it('逾期31-60天归入 days60', () => {
      const pastDate45 = new Date()
      pastDate45.setDate(pastDate45.getDate() - 45)
      const dueDateStr45 = pastDate45.toISOString().split('T')[0]

      store.addReceivable({
        customerId: 'c4b',
        customerName: '逾期45天客户',
        amount: 30000,
        receivedAmount: 0,
        dueDate: dueDateStr45,
        status: 'overdue'
      })
      const aging = store.getAgingAnalysis()
      expect(aging.days60).toBe(30000)
      expect(aging.days60Count).toBe(1)
    })

    it('已完成的应收单不参与账龄分析', () => {
      store.addReceivable({
        customerId: 'c5',
        customerName: '已完成客户',
        amount: 10000,
        receivedAmount: 10000,
        dueDate: '2020-01-01',
        status: 'completed'
      })
      const aging = store.getAgingAnalysis()
      /* completed 状态应被跳过 */
      expect(aging.over180).toBe(0)
      expect(aging.over180Count).toBe(0)
    })

    it('已部分付款的应收单只计算剩余金额', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 15)
      const dueDateStr = pastDate.toISOString().split('T')[0]

      store.addReceivable({
        customerId: 'c6',
        customerName: '部分付款客户',
        amount: 100000,
        receivedAmount: 60000,
        dueDate: dueDateStr,
        status: 'overdue'
      })
      const aging = store.getAgingAnalysis()
      /* 剩余金额 = 100000 - 60000 = 40000 */
      expect(aging.days30).toBe(40000)
    })
  })

  /* ==================== FN-02: 逾期状态翻转 ==================== */
  describe('FN-02: 逾期状态翻转', () => {
    it('逾期应收单全额收款后状态变为 completed', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '逾期客户',
        amount: 50000,
        receivedAmount: 0,
        dueDate: '2020-01-01',
        status: 'overdue'
      })

      /* 全额收款 */
      const result = store.addReceipt({
        receivableId: rv.id,
        amount: 50000,
        method: 'bank'
      })
      expect(result.success).toBe(true)

      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('completed')
    })

    it('逾期应收单部分收款后状态仍为 overdue（refreshOverdueStatus 保持逾期状态）', () => {
      const rv = store.addReceivable({
        customerId: 'c2',
        customerName: '逾期客户2',
        amount: 50000,
        receivedAmount: 0,
        dueDate: '2020-01-01',
        status: 'overdue'
      })

      const result = store.addReceipt({
        receivableId: rv.id,
        amount: 20000,
        method: 'bank'
      })
      expect(result.success).toBe(true)

      const updated = store.receivables.find(r => r.id === rv.id)
      /* _refreshOverdueStatus 会将已逾期且未收完的单据保持为 overdue */
      expect(updated.status).toBe('overdue')
      expect(updated.receivedAmount).toBe(20000)
    })

    it('pending 状态到期后刷新为 overdue', () => {
      const rv = store.addReceivable({
        customerId: 'c3',
        customerName: '到期客户',
        amount: 30000,
        receivedAmount: 0,
        dueDate: '2020-06-01',
        status: 'pending'
      })

      store.refreshOverdueStatus()
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('overdue')
    })

    it('未到期 pending 状态不变', () => {
      const rv = store.addReceivable({
        customerId: 'c4',
        customerName: '未到期客户',
        amount: 30000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      store.refreshOverdueStatus()
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('pending')
    })
  })

  /* ==================== FN-03: 部分付款精度 ==================== */
  describe('FN-03: 部分付款精度', () => {
    it('总额100，分三次付33.33，剩余应为0.01', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '精度客户',
        amount: 100,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      /* 第一次付款 33.33 */
      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })
      /* 第二次付款 33.33 */
      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })
      /* 第三次付款 33.33 */
      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })

      const updated = store.receivables.find(r => r.id === rv.id)
      /* 100 - 33.33 * 3 = 100 - 99.99 = 0.01 */
      expect(updated.receivedAmount).toBeCloseTo(99.99, 2)
      expect(updated.remainingAmount).toBeCloseTo(0.01, 2)
      /* 状态应为 partial（未全额收完） */
      expect(updated.status).toBe('partial')
    })

    it('总额100，付33.33三次后再付0.01完成', () => {
      const rv = store.addReceivable({
        customerId: 'c2',
        customerName: '精度完成客户',
        amount: 100,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })
      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })
      store.addReceipt({ receivableId: rv.id, amount: 33.33, method: 'bank' })
      store.addReceipt({ receivableId: rv.id, amount: 0.01, method: 'bank' })

      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.receivedAmount).toBeCloseTo(100, 2)
      expect(updated.remainingAmount).toBeCloseTo(0, 2)
      expect(updated.status).toBe('completed')
    })
  })

  /* ==================== FN-04: 负数金额验证 ==================== */
  describe('FN-04: 负数金额验证', () => {
    it('收款金额为0时拒绝', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      const result = store.addReceipt({
        receivableId: rv.id,
        amount: 0,
        method: 'bank'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('大于0')
    })

    it('收款金额为负数时拒绝', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      const result = store.addReceipt({
        receivableId: rv.id,
        amount: -500,
        method: 'bank'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('大于0')
    })

    it('收款金额超过应收余额时拒绝', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      const result = store.addReceipt({
        receivableId: rv.id,
        amount: 20000,
        method: 'bank'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('超过应收余额')
    })

    it('应收单不存在时拒绝收款', () => {
      const result = store.addReceipt({
        receivableId: 'nonexistent-id',
        amount: 100,
        method: 'bank'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
  })

  /* ==================== FN-05: 撤销收款 ==================== */
  describe('FN-05: 撤销收款恢复余额', () => {
    it('撤销收款后已收金额减少', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '撤销测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      /* 添加收款记录到 receivable 的 receipts 数组 */
      const receiptRecord = {
        id: 'rc_test_1',
        amount: 3000,
        method: 'bank',
        receiptDate: new Date().toISOString().split('T')[0]
      }
      rv.receipts = [receiptRecord]
      rv.receivedAmount = 3000
      rv.remainingAmount = 7000
      rv.status = 'partial'
      store.persistReceivables()

      /* 撤销收款 */
      const result = store.deleteReceipt(rv.id, receiptRecord.id)
      expect(result.success).toBe(true)

      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.receivedAmount).toBe(0)
      expect(updated.remainingAmount).toBe(10000)
      expect(updated.status).toBe('pending')
    })

    it('撤销部分收款后状态从 completed 变为 partial', () => {
      const rv = store.addReceivable({
        customerId: 'c2',
        customerName: '部分撤销客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      const receipt1 = { id: 'rc_p1', amount: 6000, method: 'bank', receiptDate: '2026-01-01' }
      const receipt2 = { id: 'rc_p2', amount: 4000, method: 'bank', receiptDate: '2026-01-02' }
      rv.receipts = [receipt1, receipt2]
      rv.receivedAmount = 10000
      rv.remainingAmount = 0
      rv.status = 'completed'
      store.persistReceivables()

      /* 撤销第二笔收款 */
      const result = store.deleteReceipt(rv.id, receipt2.id)
      expect(result.success).toBe(true)

      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.receivedAmount).toBe(6000)
      expect(updated.remainingAmount).toBe(4000)
      expect(updated.status).toBe('partial')
    })

    it('撤销不存在的收款记录返回失败', () => {
      const rv = store.addReceivable({
        customerId: 'c3',
        customerName: '测试客户',
        amount: 10000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })

      const result = store.deleteReceipt(rv.id, 'nonexistent-receipt')
      expect(result.success).toBe(false)
    })

    it('撤销不存在的应收单返回失败', () => {
      const result = store.deleteReceipt('nonexistent-rv', 'some-receipt')
      expect(result.success).toBe(false)
    })
  })

  /* ==================== FN-06: 单号溢出 ==================== */
  describe('FN-06: 单号溢出', () => {
    it('同一天1000个应收单编号不重复', { timeout: 120000 }, () => {
      const nos = new Set()
      for (let i = 0; i < 1000; i++) {
        const rv = store.addReceivable({
          customerId: `c_${i}`,
          customerName: `客户_${i}`,
          amount: 1000,
          receivedAmount: 0,
          dueDate: '2099-12-31',
          status: 'pending'
        })
        nos.add(rv.receivableNo)
      }
      expect(nos.size).toBe(1000)
    })

    it('同一天100个收款单编号不重复', { timeout: 60000 }, () => {
      /* 先创建100个应收单 */
      const rvs = []
      for (let i = 0; i < 100; i++) {
        rvs.push(store.addReceivable({
          customerId: `c_${i}`,
          customerName: `客户_${i}`,
          amount: 10000,
          receivedAmount: 0,
          dueDate: '2099-12-31',
          status: 'pending'
        }))
      }

      /* 为每个应收单创建收款 */
      const receiptNos = new Set()
      for (const rv of rvs) {
        const result = store.addReceipt({
          receivableId: rv.id,
          amount: 1000,
          method: 'bank'
        })
        expect(result.success).toBe(true)
        receiptNos.add(result.item.receiptNo)
      }
      expect(receiptNos.size).toBe(100)
    })

    it('单号格式正确', () => {
      const rv = store.addReceivable({
        customerId: 'c1',
        customerName: '格式客户',
        amount: 1000,
        receivedAmount: 0,
        dueDate: '2099-12-31',
        status: 'pending'
      })
      /* YS + YYYYMMDD + NNN 格式 */
      expect(rv.receivableNo).toMatch(/^YS\d{11}$/)
    })
  })
})
