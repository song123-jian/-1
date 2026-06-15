/**
 * 应收 Store 综合测试
 * 覆盖：正常流程、业务逻辑（逾期检测、账龄分析）、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReceivableStore } from '@/modules/finance/stores/receivable'
import { createReceivable, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { safeGetJSON, safeGetItem } from '@/utils/storage'

/* mock sessionStore */
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户'
  })
}))

describe('应收 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useReceivableStore()
  })

  /* ========== 正常流程：CRUD 操作 ========== */
  describe('正常流程 - CRUD 操作', () => {
    it('新增应收记录', () => {
      const item = store.addReceivable({
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        amount: 100000,
        dueDate: '2026-08-01'
      })
      expect(item).toBeDefined()
      expect(item.id).toBeTruthy()
      expect(item.receivableNo).toMatch(/^YS\d{8}\d{3}$/)
      expect(item.customerId).toBe('c1')
      expect(item.amount).toBe(100000)
      expect(item.receivedAmount).toBe(0)
      expect(item.remainingAmount).toBe(100000)
      expect(item.status).toBe('pending')
    })

    it('自动生成应收单号', () => {
      const item1 = store.addReceivable({ amount: 1000 })
      const item2 = store.addReceivable({ amount: 2000 })
      expect(item1.receivableNo).toBeTruthy()
      expect(item2.receivableNo).toBeTruthy()
      expect(item1.receivableNo).not.toBe(item2.receivableNo)
    })

    it('新增应收时自动计算remainingAmount', () => {
      const item = store.addReceivable({
        amount: 100000,
        receivedAmount: 30000
      })
      expect(item.remainingAmount).toBe(70000)
    })

    it('按客户查询应收', () => {
      store.addReceivable({ customerId: 'c1', amount: 50000 })
      store.addReceivable({ customerId: 'c1', amount: 30000 })
      store.addReceivable({ customerId: 'c2', amount: 20000 })
      const result = store.getReceivablesByCustomer('c1')
      expect(result).toHaveLength(2)
    })
  })

  /* ========== 业务逻辑：收款操作 ========== */
  describe('业务逻辑 - 收款操作', () => {
    it('新增收款单 - 部分收款后状态变为partial', () => {
      const rv = store.addReceivable({ amount: 100000, dueDate: '2026-12-31' })
      const result = store.addReceipt({
        receivableId: rv.id,
        amount: 30000,
        method: 'bank'
      })
      expect(result.success).toBe(true)
      expect(result.item).toBeDefined()
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.receivedAmount).toBe(30000)
      expect(updated.remainingAmount).toBe(70000)
      expect(updated.status).toBe('partial')
    })

    it('全额收款后状态变为completed', () => {
      const rv = store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      store.addReceipt({ receivableId: rv.id, amount: 50000, method: 'bank' })
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('completed')
      expect(updated.receivedAmount).toBe(50000)
      expect(updated.remainingAmount).toBe(0)
    })

    it('分多次收款', () => {
      const rv = store.addReceivable({ amount: 100000, dueDate: '2026-12-31' })
      store.addReceipt({ receivableId: rv.id, amount: 30000 })
      store.addReceipt({ receivableId: rv.id, amount: 70000 })
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('completed')
    })

    it('收款金额为0时返回错误', () => {
      const rv = store.addReceivable({ amount: 100000, dueDate: '2026-12-31' })
      const result = store.addReceipt({ receivableId: rv.id, amount: 0 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('收款金额必须大于0')
    })

    it('收款金额超过应收余额时返回错误', () => {
      const rv = store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      const result = store.addReceipt({ receivableId: rv.id, amount: 60000 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('收款金额超过应收余额')
    })

    it('应收单不存在时返回错误', () => {
      const result = store.addReceipt({ receivableId: 'non_existent', amount: 1000 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('应收单不存在')
    })
  })

  /* ========== 业务逻辑：逾期检测 ========== */
  describe('业务逻辑 - 逾期检测', () => {
    it('到期日已过且未收完的应收变为overdue', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const rv = store.addReceivable({
        amount: 50000,
        dueDate: pastDate.toISOString().slice(0, 10)
      })
      store.refreshOverdueStatus()
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('overdue')
    })

    it('已完成的不变为overdue', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const rv = store.addReceivable({
        amount: 50000,
        receivedAmount: 50000,
        dueDate: pastDate.toISOString().slice(0, 10)
      })
      /* 手动设为completed */
      const idx = store.receivables.findIndex(r => r.id === rv.id)
      store.receivables[idx].status = 'completed'
      store.refreshOverdueStatus()
      expect(store.receivables[idx].status).toBe('completed')
    })

    it('getOverdueReceivables 返回逾期列表', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addReceivable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.addReceivable({ amount: 30000, dueDate: '2026-12-31' })
      const overdue = store.getOverdueReceivables()
      expect(overdue.length).toBeGreaterThanOrEqual(1)
    })

    it('未到期的不标记为overdue', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const rv = store.addReceivable({
        amount: 50000,
        dueDate: futureDate.toISOString().slice(0, 10)
      })
      store.refreshOverdueStatus()
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('pending')
    })
  })

  /* ========== 业务逻辑：账龄分析 ========== */
  describe('业务逻辑 - 账龄分析', () => {
    it('getAgingAnalysis 返回账龄分析结果', () => {
      store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      const aging = store.getAgingAnalysis()
      expect(aging).toHaveProperty('current')
      expect(aging).toHaveProperty('days30')
      expect(aging).toHaveProperty('days60')
      expect(aging).toHaveProperty('days90')
      expect(aging).toHaveProperty('days180')
      expect(aging).toHaveProperty('over180')
    })

    it('已完成的不计入账龄', () => {
      const rv = store.addReceivable({ amount: 50000, receivedAmount: 50000, dueDate: '2026-12-31' })
      /* 手动设为completed */
      const idx = store.receivables.findIndex(r => r.id === rv.id)
      store.receivables[idx].status = 'completed'
      const aging = store.getAgingAnalysis()
      const totalAging = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.days180 + aging.over180
      expect(totalAging).toBe(0)
    })

    it('逾期应收归入对应账龄区间', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 45)
      store.addReceivable({ amount: 80000, dueDate: pastDate.toISOString().slice(0, 10) })
      const aging = store.getAgingAnalysis()
      expect(aging.days60).toBeGreaterThan(0)
    })
  })

  /* ========== 计算属性 ========== */
  describe('计算属性', () => {
    it('totalAmount - 应收总额', () => {
      store.addReceivable({ amount: 50000 })
      store.addReceivable({ amount: 30000 })
      expect(store.totalAmount).toBe(80000)
    })

    it('totalReceived - 已收总额', () => {
      const rv = store.addReceivable({ amount: 100000, receivedAmount: 30000, dueDate: '2026-12-31' })
      expect(store.totalReceived).toBe(30000)
    })

    it('totalRemaining - 剩余总额', () => {
      store.addReceivable({ amount: 100000, receivedAmount: 30000 })
      expect(store.totalRemaining).toBe(70000)
    })

    it('totalOverdue - 逾期总额', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addReceivable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.refreshOverdueStatus()
      expect(store.totalOverdue).toBe(50000)
    })

    it('空数据时各项为0', () => {
      expect(store.totalAmount).toBe(0)
      expect(store.totalReceived).toBe(0)
      expect(store.totalRemaining).toBe(0)
      expect(store.totalOverdue).toBe(0)
    })
  })

  /* ========== 边界条件 ========== */
  describe('边界条件', () => {
    it('金额为0的应收', () => {
      const item = store.addReceivable({ amount: 0 })
      expect(item.amount).toBe(0)
      expect(item.remainingAmount).toBe(0)
    })

    it('大金额应收', () => {
      const item = store.addReceivable({ amount: 999999999.99 })
      expect(item.amount).toBe(999999999.99)
    })

    it('无到期日的应收', () => {
      const item = store.addReceivable({ amount: 50000 })
      expect(item.dueDate).toBe('')
    })

    it('收款金额恰好等于余额', () => {
      const rv = store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      store.addReceipt({ receivableId: rv.id, amount: 50000 })
      const updated = store.receivables.find(r => r.id === rv.id)
      expect(updated.status).toBe('completed')
      expect(updated.remainingAmount).toBe(0)
    })

    it('按不存在的客户查询返回空数组', () => {
      store.addReceivable({ customerId: 'c1', amount: 50000 })
      const result = store.getReceivablesByCustomer('non_existent')
      expect(result).toHaveLength(0)
    })
  })

  /* ========== 异常情况 ========== */
  describe('异常情况', () => {
    it('负数金额仍可添加', () => {
      const item = store.addReceivable({ amount: -5000 })
      expect(item.amount).toBe(-5000)
    })

    it('非数字金额的remainingAmount默认为0', () => {
      const item = store.addReceivable({ amount: 'abc' })
      expect(item.remainingAmount).toBe(0)
    })

    it('收款金额为负数返回错误', () => {
      const rv = store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      const result = store.addReceipt({ receivableId: rv.id, amount: -1000 })
      expect(result.success).toBe(false)
    })
  })

  /* ========== 数据持久化 ========== */
  describe('数据持久化', () => {
    it('新增应收后localStorage已更新', () => {
      store.addReceivable({ amount: 50000 })
      const stored = safeGetJSON('gj_erp_receivables')
      expect(stored).toHaveLength(1)
    })

    it('新增收款后localStorage已更新', () => {
      const rv = store.addReceivable({ amount: 50000, dueDate: '2026-12-31' })
      store.addReceipt({ receivableId: rv.id, amount: 20000 })
      const storedReceivables = safeGetJSON('gj_erp_receivables')
      expect(storedReceivables[0].receivedAmount).toBe(20000)
      const storedReceipts = safeGetJSON('gj_erp_receipts')
      expect(storedReceipts).toHaveLength(1)
    })

    it('逾期刷新后localStorage已更新', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      store.addReceivable({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.refreshOverdueStatus()
      const stored = safeGetJSON('gj_erp_receivables')
      expect(stored[0].status).toBe('overdue')
    })
  })

  /* ========== 种子数据 ========== */
  describe('种子数据', () => {
    it('initSeedData 初始化8条应收和5条收款', () => {
      store.initSeedData()
      expect(store.receivables).toHaveLength(8)
      expect(store.receipts).toHaveLength(5)
    })

    it('种子数据包含不同状态', () => {
      store.initSeedData()
      const statuses = store.receivables.map(r => r.status)
      expect(statuses).toContain('partial')
      expect(statuses).toContain('overdue')
      expect(statuses).toContain('completed')
      expect(statuses).toContain('pending')
    })

    it('重复调用initSeedData不会重复添加', () => {
      store.initSeedData()
      store.initSeedData()
      expect(store.receivables).toHaveLength(8)
    })

    it('清除初始化标记后可重新初始化', () => {
      store.initSeedData()
      localStorage.removeItem('gj_erp_gj_erp_receivables_initialized')
      store.initSeedData()
      expect(store.receivables).toHaveLength(8)
    })

    it('种子数据中收款记录与应收关联正确', () => {
      store.initSeedData()
      for (const receipt of store.receipts) {
        const rv = store.receivables.find(r => r.id === receipt.receivableId)
        expect(rv).toBeDefined()
      }
    })
  })
})
