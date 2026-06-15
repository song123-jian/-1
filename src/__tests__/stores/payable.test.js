/**
 * 应付 Store 综合测试
 * 覆盖：正常流程、业务逻辑（逾期检测、账龄分析）、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePayableStore } from '@/modules/finance/stores/payable'
import { createPayable, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { safeGetJSON, safeGetItem } from '@/utils/storage'

/* mock sessionStore */
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户'
  })
}))

describe('应付 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = usePayableStore()
  })

  /* ========== 正常流程：CRUD 操作 ========== */
  describe('正常流程 - CRUD 操作', () => {
    it('新增应付记录', () => {
      const item = store.addPayable({
        supplierId: 's1',
        supplierName: '江苏钢铁集团有限公司',
        amount: 90000,
        dueDate: '2026-08-01'
      })
      expect(item).toBeDefined()
      expect(item.id).toBeTruthy()
      expect(item.payableNo).toMatch(/^YF\d{8}\d{3}$/)
      expect(item.supplierId).toBe('s1')
      expect(item.amount).toBe(90000)
      expect(item.paidAmount).toBe(0)
      expect(item.remainingAmount).toBe(90000)
      expect(item.status).toBe('pending')
    })

    it('自动生成应付单号', () => {
      const item1 = store.addPayable({ amount: 1000 })
      const item2 = store.addPayable({ amount: 2000 })
      expect(item1.payableNo).toBeTruthy()
      expect(item2.payableNo).toBeTruthy()
      expect(item1.payableNo).not.toBe(item2.payableNo)
    })

    it('新增应付时自动计算remainingAmount', () => {
      const item = store.addPayable({
        amount: 100000,
        paidAmount: 30000
      })
      expect(item.remainingAmount).toBe(70000)
    })

    it('按供应商查询应付', () => {
      store.addPayable({ supplierId: 's1', amount: 50000 })
      store.addPayable({ supplierId: 's1', amount: 30000 })
      store.addPayable({ supplierId: 's2', amount: 20000 })
      const result = store.getPayablesBySupplier('s1')
      expect(result).toHaveLength(2)
    })
  })

  /* ========== 业务逻辑：付款操作 ========== */
  describe('业务逻辑 - 付款操作', () => {
    it('新增付款单 - 部分付款后状态变为partial', () => {
      const py = store.addPayable({ amount: 100000, dueDate: '2026-12-31' })
      const result = store.addPayment({
        payableId: py.id,
        amount: 30000,
        method: 'bank'
      })
      expect(result.success).toBe(true)
      expect(result.item).toBeDefined()
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.paidAmount).toBe(30000)
      expect(updated.remainingAmount).toBe(70000)
      expect(updated.status).toBe('partial')
    })

    it('全额付款后状态变为completed', () => {
      const py = store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      store.addPayment({ payableId: py.id, amount: 50000, method: 'bank' })
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('completed')
      expect(updated.paidAmount).toBe(50000)
      expect(updated.remainingAmount).toBe(0)
    })

    it('分多次付款', () => {
      const py = store.addPayable({ amount: 100000, dueDate: '2026-12-31' })
      store.addPayment({ payableId: py.id, amount: 30000 })
      store.addPayment({ payableId: py.id, amount: 70000 })
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('completed')
    })

    it('付款金额为0时返回错误', () => {
      const py = store.addPayable({ amount: 100000, dueDate: '2026-12-31' })
      const result = store.addPayment({ payableId: py.id, amount: 0 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('付款金额必须大于0')
    })

    it('付款金额超过应付余额时返回错误', () => {
      const py = store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      const result = store.addPayment({ payableId: py.id, amount: 60000 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('付款金额超过应付余额')
    })

    it('应付单不存在时返回错误', () => {
      const result = store.addPayment({ payableId: 'non_existent', amount: 1000 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('应付单不存在')
    })
  })

  /* ========== 业务逻辑：逾期检测 ========== */
  describe('业务逻辑 - 逾期检测', () => {
    it('到期日已过且未付完的应付变为overdue', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const py = store.addPayable({
        amount: 50000,
        dueDate: pastDate.toISOString().slice(0, 10)
      })
      store.refreshOverdueStatus()
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('overdue')
    })

    it('已完成的不变为overdue', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const py = store.addPayable({
        amount: 50000,
        paidAmount: 50000,
        dueDate: pastDate.toISOString().slice(0, 10)
      })
      /* 手动设为completed */
      const idx = store.payables.findIndex(p => p.id === py.id)
      store.payables[idx].status = 'completed'
      store.refreshOverdueStatus()
      expect(store.payables[idx].status).toBe('completed')
    })

    it('getOverduePayables 返回逾期列表', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addPayable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.addPayable({ amount: 30000, dueDate: '2026-12-31' })
      const overdue = store.getOverduePayables()
      expect(overdue.length).toBeGreaterThanOrEqual(1)
    })

    it('未到期的不标记为overdue', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const py = store.addPayable({
        amount: 50000,
        dueDate: futureDate.toISOString().slice(0, 10)
      })
      store.refreshOverdueStatus()
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('pending')
    })

    it('部分付款后逾期仍标记为overdue', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      const py = store.addPayable({
        amount: 100000,
        paidAmount: 30000,
        dueDate: pastDate.toISOString().slice(0, 10)
      })
      store.refreshOverdueStatus()
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('overdue')
    })
  })

  /* ========== 业务逻辑：账龄分析 ========== */
  describe('业务逻辑 - 账龄分析', () => {
    it('getAgingAnalysis 返回账龄分析结果', () => {
      store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      const aging = store.getAgingAnalysis()
      expect(aging).toHaveProperty('current')
      expect(aging).toHaveProperty('days30')
      expect(aging).toHaveProperty('days60')
      expect(aging).toHaveProperty('days90')
      expect(aging).toHaveProperty('days180')
      expect(aging).toHaveProperty('over180')
    })

    it('已完成的不计入账龄', () => {
      const py = store.addPayable({ amount: 50000, paidAmount: 50000, dueDate: '2026-12-31' })
      const idx = store.payables.findIndex(p => p.id === py.id)
      store.payables[idx].status = 'completed'
      const aging = store.getAgingAnalysis()
      const totalAging = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.days180 + aging.over180
      expect(totalAging).toBe(0)
    })

    it('逾期应付归入对应账龄区间', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 45)
      store.addPayable({ amount: 80000, dueDate: pastDate.toISOString().slice(0, 10) })
      const aging = store.getAgingAnalysis()
      expect(aging.days60).toBeGreaterThan(0)
    })
  })

  /* ========== 计算属性 ========== */
  describe('计算属性', () => {
    it('totalAmount - 应付总额', () => {
      store.addPayable({ amount: 50000 })
      store.addPayable({ amount: 30000 })
      expect(store.totalAmount).toBe(80000)
    })

    it('totalPaid - 已付总额', () => {
      store.addPayable({ amount: 100000, paidAmount: 30000 })
      expect(store.totalPaid).toBe(30000)
    })

    it('totalRemaining - 剩余总额', () => {
      store.addPayable({ amount: 100000, paidAmount: 30000 })
      expect(store.totalRemaining).toBe(70000)
    })

    it('totalOverdue - 逾期总额', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addPayable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.refreshOverdueStatus()
      expect(store.totalOverdue).toBe(50000)
    })

    it('空数据时各项为0', () => {
      expect(store.totalAmount).toBe(0)
      expect(store.totalPaid).toBe(0)
      expect(store.totalRemaining).toBe(0)
      expect(store.totalOverdue).toBe(0)
    })
  })

  /* ========== 边界条件 ========== */
  describe('边界条件', () => {
    it('金额为0的应付', () => {
      const item = store.addPayable({ amount: 0 })
      expect(item.amount).toBe(0)
      expect(item.remainingAmount).toBe(0)
    })

    it('大金额应付', () => {
      const item = store.addPayable({ amount: 999999999.99 })
      expect(item.amount).toBe(999999999.99)
    })

    it('无到期日的应付', () => {
      const item = store.addPayable({ amount: 50000 })
      expect(item.dueDate).toBe('')
    })

    it('付款金额恰好等于余额', () => {
      const py = store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      store.addPayment({ payableId: py.id, amount: 50000 })
      const updated = store.payables.find(p => p.id === py.id)
      expect(updated.status).toBe('completed')
      expect(updated.remainingAmount).toBe(0)
    })

    it('按不存在的供应商查询返回空数组', () => {
      store.addPayable({ supplierId: 's1', amount: 50000 })
      const result = store.getPayablesBySupplier('non_existent')
      expect(result).toHaveLength(0)
    })
  })

  /* ========== 异常情况 ========== */
  describe('异常情况', () => {
    it('负数金额仍可添加', () => {
      const item = store.addPayable({ amount: -5000 })
      expect(item.amount).toBe(-5000)
    })

    it('非数字金额的remainingAmount默认为0', () => {
      const item = store.addPayable({ amount: 'abc' })
      expect(item.remainingAmount).toBe(0)
    })

    it('付款金额为负数返回错误', () => {
      const py = store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      const result = store.addPayment({ payableId: py.id, amount: -1000 })
      expect(result.success).toBe(false)
    })
  })

  /* ========== 数据持久化 ========== */
  describe('数据持久化', () => {
    it('新增应付后localStorage已更新', () => {
      store.addPayable({ amount: 50000 })
      const stored = safeGetJSON('gj_erp_payables')
      expect(stored).toHaveLength(1)
    })

    it('新增付款后localStorage已更新', () => {
      const py = store.addPayable({ amount: 50000, dueDate: '2026-12-31' })
      store.addPayment({ payableId: py.id, amount: 20000 })
      const storedPayables = safeGetJSON('gj_erp_payables')
      expect(storedPayables[0].paidAmount).toBe(20000)
      const storedPayments = safeGetJSON('gj_erp_payments')
      expect(storedPayments).toHaveLength(1)
    })

    it('逾期刷新后localStorage已更新', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addPayable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.refreshOverdueStatus()
      const stored = safeGetJSON('gj_erp_payables')
      expect(stored[0].status).toBe('overdue')
    })
  })

  /* ========== 种子数据 ========== */
  describe('种子数据', () => {
    it('initSeedData 初始化6条应付和4条付款', () => {
      store.initSeedData()
      expect(store.payables).toHaveLength(6)
      expect(store.payments).toHaveLength(4)
    })

    it('种子数据包含不同状态', () => {
      store.initSeedData()
      const statuses = store.payables.map(p => p.status)
      expect(statuses).toContain('completed')
      expect(statuses).toContain('overdue')
      expect(statuses).toContain('pending')
    })

    it('重复调用initSeedData不会重复添加', () => {
      store.initSeedData()
      store.initSeedData()
      expect(store.payables).toHaveLength(6)
    })

    it('清除初始化标记后可重新初始化', () => {
      store.initSeedData()
      // StorageManager 自动添加 gj_erp_ 前缀，所以实际 key 是 gj_erp_gj_erp_payables_initialized
      localStorage.removeItem('gj_erp_gj_erp_payables_initialized')
      store.initSeedData()
      expect(store.payables).toHaveLength(6)
    })

    it('种子数据中付款记录与应付关联正确', () => {
      store.initSeedData()
      for (const payment of store.payments) {
        const py = store.payables.find(p => p.id === payment.payableId)
        expect(py).toBeDefined()
      }
    })
  })
})
