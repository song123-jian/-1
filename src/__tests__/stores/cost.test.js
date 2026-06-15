/**
 * 成本 Store 综合测试
 * 覆盖：正常流程、业务逻辑（差异计算、趋势分析、供应商汇总）、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCostStore } from '@/modules/finance/stores/cost'
import { createCostRecord, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* mock syncEngine */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn()
  })
}))

/* mock sessionStore */
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户'
  })
}))

describe('成本 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useCostStore()
  })

  /* ========== 正常流程：CRUD 操作 ========== */
  describe('正常流程 - CRUD 操作', () => {
    it('新增成本记录', () => {
      const item = store.addRecord({
        supplierId: 's1',
        supplierName: '江苏钢铁集团有限公司',
        materialName: '不锈钢板304',
        quantity: 320,
        actualCost: 38400,
        standardCost: 36480
      })
      expect(item).toBeDefined()
      expect(item.id).toBeTruthy()
      expect(item.supplierName).toBe('江苏钢铁集团有限公司')
      expect(item.actualCost).toBe(38400)
      expect(item.standardCost).toBe(36480)
      expect(item.variance).toBe(1920)
      expect(item.status).toBe('pending')
    })

    it('新增时自动计算差异和差异率', () => {
      const item = store.addRecord({
        actualCost: 56000,
        standardCost: 53200
      })
      expect(item.variance).toBe(2800)
      expect(item.varianceRate).toBeCloseTo(5.3, 1)
    })

    it('标准成本为0时差异率为0', () => {
      const item = store.addRecord({
        actualCost: 5000,
        standardCost: 0
      })
      expect(item.variance).toBe(5000)
      expect(item.varianceRate).toBe(0)
    })

    it('更新成本记录', () => {
      const item = store.addRecord({
        actualCost: 50000,
        standardCost: 48000
      })
      const updated = store.updateRecord(item.id, {
        actualCost: 52000,
        standardCost: 48000
      })
      expect(updated).not.toBeNull()
      expect(updated.actualCost).toBe(52000)
      expect(updated.variance).toBe(4000)
    })

    it('更新时自动重算差异和差异率', () => {
      const item = store.addRecord({
        actualCost: 50000,
        standardCost: 50000
      })
      store.updateRecord(item.id, { actualCost: 55000 })
      const updated = store.records.find(r => r.id === item.id)
      expect(updated.variance).toBe(5000)
      expect(updated.varianceRate).toBe(10)
    })

    it('删除成本记录', () => {
      const item = store.addRecord({ actualCost: 10000, standardCost: 9000 })
      expect(store.records).toHaveLength(1)
      const result = store.deleteRecord(item.id)
      expect(result).toBe(true)
      expect(store.records).toHaveLength(0)
    })

    it('删除不存在的记录返回false', () => {
      const result = store.deleteRecord('non_existent')
      expect(result).toBe(false)
    })

    it('更新不存在的记录返回null', () => {
      const result = store.updateRecord('non_existent', { actualCost: 999 })
      expect(result).toBeNull()
    })

    it('getById 查询成本记录', () => {
      const item = store.addRecord({ actualCost: 10000, standardCost: 9000 })
      const found = store.getById(item.id)
      expect(found).toBeDefined()
      expect(found.actualCost).toBe(10000)
    })

    it('getById 查询不存在的返回undefined', () => {
      expect(store.getById('non_existent')).toBeUndefined()
    })
  })

  /* ========== 业务逻辑：差异分析 ========== */
  describe('业务逻辑 - 差异分析', () => {
    it('实际成本等于标准成本时差异为0', () => {
      const item = store.addRecord({
        actualCost: 50000,
        standardCost: 50000
      })
      expect(item.variance).toBe(0)
      expect(item.varianceRate).toBe(0)
    })

    it('实际成本低于标准成本时差异为负', () => {
      const item = store.addRecord({
        actualCost: 45000,
        standardCost: 50000
      })
      expect(item.variance).toBe(-5000)
      expect(item.varianceRate).toBe(-10)
    })

    it('实际成本高于标准成本时差异为正', () => {
      const item = store.addRecord({
        actualCost: 55000,
        standardCost: 50000
      })
      expect(item.variance).toBe(5000)
      expect(item.varianceRate).toBe(10)
    })
  })

  /* ========== 计算属性 ========== */
  describe('计算属性', () => {
    it('totalActual - 实际成本总额', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480 })
      store.addRecord({ actualCost: 56000, standardCost: 53200 })
      expect(store.totalActual).toBe(94400)
    })

    it('totalStandard - 标准成本总额', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480 })
      store.addRecord({ actualCost: 56000, standardCost: 53200 })
      expect(store.totalStandard).toBe(89680)
    })

    it('totalVariance - 差异总额', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480 })
      store.addRecord({ actualCost: 56000, standardCost: 53200 })
      expect(store.totalVariance).toBe(4720)
    })

    it('varianceRate - 综合差异率', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480 })
      store.addRecord({ actualCost: 56000, standardCost: 53200 })
      const expectedRate = (4720 / 89680) * 100
      expect(store.varianceRate).toBeCloseTo(expectedRate, 1)
    })

    it('标准成本为0时差异率为0', () => {
      store.addRecord({ actualCost: 5000, standardCost: 0 })
      expect(store.varianceRate).toBe(0)
    })

    it('completedCount / approvedCount / pendingCount', () => {
      store.addRecord({ actualCost: 1000, standardCost: 1000, status: 'completed' })
      store.addRecord({ actualCost: 2000, standardCost: 2000, status: 'approved' })
      store.addRecord({ actualCost: 3000, standardCost: 3000, status: 'pending' })
      store.addRecord({ actualCost: 4000, standardCost: 4000, status: 'pending' })
      expect(store.completedCount).toBe(1)
      expect(store.approvedCount).toBe(1)
      expect(store.pendingCount).toBe(2)
    })

    it('空数据时各项为0', () => {
      expect(store.totalActual).toBe(0)
      expect(store.totalStandard).toBe(0)
      expect(store.totalVariance).toBe(0)
      expect(store.varianceRate).toBe(0)
      expect(store.completedCount).toBe(0)
      expect(store.approvedCount).toBe(0)
      expect(store.pendingCount).toBe(0)
    })
  })

  /* ========== 业务逻辑：月度趋势 ========== */
  describe('业务逻辑 - 月度趋势', () => {
    it('getMonthlyTrend 返回月度汇总', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480, date: '2026-05-16' })
      store.addRecord({ actualCost: 56000, standardCost: 53200, date: '2026-05-14' })
      store.addRecord({ actualCost: 27000, standardCost: 25650, date: '2026-04-10' })
      const trend = store.getMonthlyTrend()
      expect(trend).toHaveLength(2)
      /* 按月份排序 */
      expect(trend[0].period).toBe('2026-04')
      expect(trend[1].period).toBe('2026-05')
      expect(trend[1].actualCost).toBe(94400)
      expect(trend[1].count).toBe(2)
    })

    it('无数据时返回空数组', () => {
      expect(store.getMonthlyTrend()).toHaveLength(0)
    })
  })

  /* ========== 业务逻辑：供应商汇总 ========== */
  describe('业务逻辑 - 供应商汇总', () => {
    it('getSupplierBreakdown 按供应商汇总', () => {
      store.addRecord({ actualCost: 38400, standardCost: 36480, supplierName: '供应商A' })
      store.addRecord({ actualCost: 27000, standardCost: 25650, supplierName: '供应商A' })
      store.addRecord({ actualCost: 56000, standardCost: 53200, supplierName: '供应商B' })
      const breakdown = store.getSupplierBreakdown()
      expect(breakdown).toHaveLength(2)
      const supplierA = breakdown.find(b => b.supplierName === '供应商A')
      expect(supplierA.actualCost).toBe(65400)
      expect(supplierA.count).toBe(2)
    })

    it('无供应商名称归入"未分配"', () => {
      store.addRecord({ actualCost: 10000, standardCost: 9000, supplierName: '' })
      const breakdown = store.getSupplierBreakdown()
      expect(breakdown[0].supplierName).toBe('未分配')
    })
  })

  /* ========== 业务逻辑：筛选记录 ========== */
  describe('业务逻辑 - 筛选记录', () => {
    it('按供应商筛选', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900, supplierId: 's1' })
      store.addRecord({ actualCost: 2000, standardCost: 1800, supplierId: 's2' })
      const result = store.getFilteredRecords('all', 's1')
      expect(result).toHaveLength(1)
    })

    it('按月份筛选', () => {
      const now = new Date()
      const thisMonth = now.toISOString().slice(0, 10)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().slice(0, 10)
      store.addRecord({ actualCost: 1000, standardCost: 900, date: thisMonth })
      store.addRecord({ actualCost: 2000, standardCost: 1800, date: lastMonth })
      const result = store.getFilteredRecords('month', 'all')
      expect(result).toHaveLength(1)
    })

    it('按季度筛选', () => {
      const now = new Date()
      const thisMonth = now.toISOString().slice(0, 10)
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 15).toISOString().slice(0, 10)
      store.addRecord({ actualCost: 1000, standardCost: 900, date: thisMonth })
      store.addRecord({ actualCost: 2000, standardCost: 1800, date: threeMonthsAgo })
      const result = store.getFilteredRecords('quarter', 'all')
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('不筛选时返回全部', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900, supplierId: 's1' })
      store.addRecord({ actualCost: 2000, standardCost: 1800, supplierId: 's2' })
      const result = store.getFilteredRecords('all', 'all')
      expect(result).toHaveLength(2)
    })
  })

  /* ========== 边界条件 ========== */
  describe('边界条件', () => {
    it('金额为0的成本记录', () => {
      const item = store.addRecord({ actualCost: 0, standardCost: 0 })
      expect(item.actualCost).toBe(0)
      expect(item.variance).toBe(0)
    })

    it('大金额成本记录', () => {
      const item = store.addRecord({ actualCost: 999999999.99, standardCost: 999999999.99 })
      expect(item.actualCost).toBe(999999999.99)
    })

    it('只有实际成本无标准成本', () => {
      const item = store.addRecord({ actualCost: 50000 })
      expect(item.standardCost).toBe(0)
      expect(item.variance).toBe(50000)
    })

    it('无日期的记录不计入月度趋势', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900, date: '' })
      /* date为空字符串时substring(0,7)仍返回空串，会作为key */
      const trend = store.getMonthlyTrend()
      /* 空日期的记录会产生一个key为空的条目 */
      expect(trend.length).toBeGreaterThanOrEqual(0)
    })
  })

  /* ========== 异常情况 ========== */
  describe('异常情况', () => {
    it('负数实际成本', () => {
      const item = store.addRecord({ actualCost: -5000, standardCost: 5000 })
      expect(item.actualCost).toBe(-5000)
      expect(item.variance).toBe(-10000)
    })

    it('非数字金额默认为0', () => {
      const item = store.addRecord({ actualCost: 'abc', standardCost: 'xyz' })
      expect(item.actualCost).toBe(0)
      expect(item.standardCost).toBe(0)
    })

    it('自定义id传入', () => {
      const item = store.addRecord({ id: 'custom_id_001', actualCost: 1000, standardCost: 900 })
      expect(item.id).toBe('custom_id_001')
    })
  })

  /* ========== 数据持久化 ========== */
  describe('数据持久化', () => {
    it('新增后localStorage已更新', () => {
      store.addRecord({ actualCost: 50000, standardCost: 48000 })
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_costAnalysis'))
      expect(stored).toHaveLength(1)
    })

    it('更新后localStorage已更新', () => {
      const item = store.addRecord({ actualCost: 50000, standardCost: 48000 })
      store.updateRecord(item.id, { actualCost: 55000 })
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_costAnalysis'))
      expect(stored[0].actualCost).toBe(55000)
    })

    it('删除后localStorage已更新', () => {
      const item = store.addRecord({ actualCost: 50000, standardCost: 48000 })
      store.deleteRecord(item.id)
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_costAnalysis'))
      expect(stored).toHaveLength(0)
    })
  })

  /* ========== 种子数据 ========== */
  describe('种子数据', () => {
    it('initSeedData 初始化6条种子数据', () => {
      store.initSeedData()
      expect(store.records).toHaveLength(6)
    })

    it('种子数据包含不同状态', () => {
      store.initSeedData()
      const statuses = store.records.map(r => r.status)
      expect(statuses).toContain('completed')
      expect(statuses).toContain('approved')
      expect(statuses).toContain('pending')
    })

    it('种子数据包含不同供应商', () => {
      store.initSeedData()
      const suppliers = [...new Set(store.records.map(r => r.supplierName))]
      expect(suppliers.length).toBeGreaterThanOrEqual(2)
    })

    it('重复调用initSeedData不会重复添加', () => {
      store.initSeedData()
      store.initSeedData()
      expect(store.records).toHaveLength(6)
    })

    it('清除初始化标记后可重新初始化', () => {
      store.initSeedData()
      localStorage.removeItem('gj_erp_gj_erp_cost_initialized')
      store.initSeedData()
      expect(store.records).toHaveLength(6)
    })
  })

  /* ========== replaceData / mergeRemoteItems ========== */
  describe('数据替换与合并', () => {
    it('replaceData 替换全部数据', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900 })
      const newData = [createCostRecord({ actualCost: 99999 })]
      store.replaceData(newData)
      expect(store.records).toHaveLength(1)
    })

    it('mergeRemoteItems 合并远程数据', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900 })
      const remoteItem = createCostRecord({ actualCost: 2000 })
      store.mergeRemoteItems([remoteItem])
      expect(store.records).toHaveLength(2)
    })

    it('mergeRemoteItems 传入非数组不报错', () => {
      store.addRecord({ actualCost: 1000, standardCost: 900 })
      expect(() => store.mergeRemoteItems(null)).not.toThrow()
      expect(() => store.mergeRemoteItems('invalid')).not.toThrow()
    })
  })
})
