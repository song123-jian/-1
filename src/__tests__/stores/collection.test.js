/**
 * 回款 Store 综合测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { createCollection, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* mock syncEngine 避免真实同步 */
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

describe('回款 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useCollectionStore()
  })

  /* ========== 正常流程：CRUD 操作 ========== */
  describe('正常流程 - CRUD 操作', () => {
    it('新增回款记录', () => {
      const item = store.addCollection({
        customerId: 'c1',
        customerName: '上海贸易有限公司',
        amount: 50000,
        method: 'bank_transfer'
      })
      expect(item).toBeDefined()
      expect(item.id).toBeTruthy()
      expect(item.collectionNo).toMatch(/^COL-\d{4}-\d{4}$/)
      expect(item.customerId).toBe('c1')
      expect(item.amount).toBe(50000)
      expect(item.status).toBe('pending')
      expect(item.currency).toBe('CNY')
      expect(store.collections).toHaveLength(1)
    })

    it('自动生成回款编号（COL-年份-序号）', () => {
      const item1 = store.addCollection({ amount: 1000 })
      const item2 = store.addCollection({ amount: 2000 })
      expect(item1.collectionNo).toMatch(/^COL-\d{4}-0001$/)
      expect(item2.collectionNo).toMatch(/^COL-\d{4}-0002$/)
    })

    it('更新回款记录', () => {
      const item = store.addCollection({ amount: 10000, customerName: '旧客户' })
      store.updateCollection(item.id, { customerName: '新客户', amount: 20000 })
      const updated = store.collections.find(c => c.id === item.id)
      expect(updated.customerName).toBe('新客户')
      expect(updated.amount).toBe(20000)
      expect(updated.updatedAt).toBeTruthy()
    })

    it('删除回款记录', () => {
      const item = store.addCollection({ amount: 10000 })
      expect(store.collections).toHaveLength(1)
      store.deleteCollection(item.id)
      expect(store.collections).toHaveLength(0)
    })

    it('更新不存在的记录不会报错', () => {
      expect(() => {
        store.updateCollection('non_existent_id', { amount: 999 })
      }).not.toThrow()
    })
  })

  /* ========== 业务逻辑：状态流转 ========== */
  describe('业务逻辑 - 状态流转', () => {
    it('确认回款：pending -> confirmed', () => {
      const item = store.addCollection({ amount: 10000 })
      store.confirmCollection(item.id)
      const confirmed = store.collections.find(c => c.id === item.id)
      expect(confirmed.status).toBe('confirmed')
      expect(confirmed.confirmedAt).toBeTruthy()
    })

    it('作废回款：pending -> voided', () => {
      const item = store.addCollection({ amount: 10000 })
      store.voidCollection(item.id)
      const voided = store.collections.find(c => c.id === item.id)
      expect(voided.status).toBe('voided')
      expect(voided.voidedAt).toBeTruthy()
    })

    it('作废已确认的回款：confirmed -> voided', () => {
      const item = store.addCollection({ amount: 10000 })
      store.confirmCollection(item.id)
      store.voidCollection(item.id)
      const voided = store.collections.find(c => c.id === item.id)
      expect(voided.status).toBe('voided')
    })
  })

  /* ========== 业务逻辑：分期回款 ========== */
  describe('业务逻辑 - 分期回款', () => {
    it('添加分期记录', () => {
      const item = store.addCollection({ amount: 100000 })
      const inst = store.addInstallment(item.id, { amount: 30000, status: 'pending' })
      expect(inst).not.toBeNull()
      expect(inst.amount).toBe(30000)
      expect(inst.period).toBe(1)
    })

    it('分期付款后状态变为confirmed', () => {
      const item = store.addCollection({ amount: 100000 })
      store.addInstallment(item.id, { amount: 30000, status: 'paid' })
      const updated = store.collections.find(c => c.id === item.id)
      expect(updated.status).toBe('confirmed')
    })

    it('分期全部付清后状态变为completed', () => {
      const item = store.addCollection({ amount: 100000 })
      store.addInstallment(item.id, { amount: 60000, status: 'paid' })
      store.addInstallment(item.id, { amount: 40000, status: 'paid' })
      const updated = store.collections.find(c => c.id === item.id)
      expect(updated.status).toBe('completed')
    })

    it('更新分期状态为paid', () => {
      const item = store.addCollection({ amount: 100000 })
      const inst = store.addInstallment(item.id, { amount: 50000, status: 'pending' })
      store.updateInstallmentStatus(item.id, inst.id, 'paid')
      const col = store.collections.find(c => c.id === item.id)
      expect(col.installments[0].status).toBe('paid')
      expect(col.installments[0].paidAt).toBeTruthy()
    })

    it('删除分期记录并重新编号', () => {
      const item = store.addCollection({ amount: 100000 })
      const inst1 = store.addInstallment(item.id, { amount: 30000 })
      const inst2 = store.addInstallment(item.id, { amount: 30000 })
      const inst3 = store.addInstallment(item.id, { amount: 40000 })
      store.deleteInstallment(item.id, inst2.id)
      const col = store.collections.find(c => c.id === item.id)
      expect(col.installments).toHaveLength(2)
      expect(col.installments[0].period).toBe(1)
      expect(col.installments[1].period).toBe(2)
    })

    it('分期金额为0或负数时返回null', () => {
      const item = store.addCollection({ amount: 100000 })
      const result = store.addInstallment(item.id, { amount: 0 })
      expect(result).toBeNull()
    })
  })

  /* ========== 计算属性 ========== */
  describe('计算属性', () => {
    it('totalAmount - 排除已作废的总金额', () => {
      store.addCollection({ amount: 50000 })
      store.addCollection({ amount: 30000 })
      const item = store.addCollection({ amount: 20000 })
      store.voidCollection(item.id)
      expect(store.totalAmount).toBe(80000)
    })

    it('totalCollected - 已确认和已完成的金额', () => {
      const item1 = store.addCollection({ amount: 50000 })
      store.confirmCollection(item1.id)
      store.addCollection({ amount: 30000 }) // pending 不计入
      const item3 = store.addCollection({ amount: 20000 })
      store.voidCollection(item3.id) // voided 不计入
      expect(store.totalCollected).toBe(50000)
    })

    it('totalPending = totalAmount - totalCollected', () => {
      const item1 = store.addCollection({ amount: 100000 })
      store.confirmCollection(item1.id)
      store.addCollection({ amount: 50000 })
      expect(store.totalPending).toBe(50000)
    })

    it('pendingCount - 待确认数量', () => {
      store.addCollection({ amount: 1000 })
      store.addCollection({ amount: 2000 })
      const item3 = store.addCollection({ amount: 3000 })
      store.confirmCollection(item3.id)
      expect(store.pendingCount).toBe(2)
    })

    it('collectionRate - 回款率', () => {
      const item1 = store.addCollection({ amount: 60000 })
      store.confirmCollection(item1.id)
      store.addCollection({ amount: 40000 })
      expect(store.collectionRate).toBe(60)
    })

    it('空数据时回款率为0', () => {
      expect(store.collectionRate).toBe(0)
    })
  })

  /* ========== 业务逻辑：逾期计算 ========== */
  describe('业务逻辑 - 逾期计算', () => {
    it('getOverdueDays - 未到期返回0', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const item = store.addCollection({ amount: 10000, dueDate: futureDate.toISOString().slice(0, 10) })
      expect(store.getOverdueDays(item)).toBe(0)
    })

    it('getOverdueDays - 已到期返回正数', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const item = store.addCollection({ amount: 10000, dueDate: pastDate.toISOString().slice(0, 10) })
      expect(store.getOverdueDays(item)).toBeGreaterThanOrEqual(10)
    })

    it('getOverdueDays - 无到期日返回0', () => {
      const item = store.addCollection({ amount: 10000 })
      expect(store.getOverdueDays(item)).toBe(0)
    })

    it('totalOverdue - 统计逾期金额', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      store.addCollection({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.addCollection({ amount: 30000, dueDate: pastDate.toISOString().slice(0, 10) })
      expect(store.totalOverdue).toBe(80000)
    })

    it('已确认/已完成的记录不计入逾期', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const item = store.addCollection({ amount: 50000, dueDate: pastDate.toISOString().slice(0, 10) })
      store.confirmCollection(item.id)
      expect(store.totalOverdue).toBe(0)
    })
  })

  /* ========== 业务逻辑：进度计算 ========== */
  describe('业务逻辑 - 进度计算', () => {
    it('无分期时，pending状态进度为0', () => {
      const item = store.addCollection({ amount: 10000 })
      expect(store.getProgress(item)).toBe(0)
    })

    it('无分期时，confirmed状态进度为100', () => {
      const item = store.addCollection({ amount: 10000 })
      store.confirmCollection(item.id)
      const updated = store.collections.find(c => c.id === item.id)
      expect(store.getProgress(updated)).toBe(100)
    })

    it('有分期时，按已付比例计算进度', () => {
      const item = store.addCollection({ amount: 100000 })
      store.addInstallment(item.id, { amount: 40000, status: 'paid' })
      store.addInstallment(item.id, { amount: 60000, status: 'pending' })
      const updated = store.collections.find(c => c.id === item.id)
      expect(store.getProgress(updated)).toBe(40)
    })

    it('无效记录返回0', () => {
      expect(store.getProgress(null)).toBe(0)
      expect(store.getProgress({})).toBe(0)
    })
  })

  /* ========== 边界条件 ========== */
  describe('边界条件', () => {
    it('空数据时各项计算为0', () => {
      expect(store.totalAmount).toBe(0)
      expect(store.totalCollected).toBe(0)
      expect(store.totalPending).toBe(0)
      expect(store.totalOverdue).toBe(0)
      expect(store.pendingCount).toBe(0)
      expect(store.collectionRate).toBe(0)
    })

    it('金额为0的回款', () => {
      const item = store.addCollection({ amount: 0 })
      expect(item.amount).toBe(0)
      expect(store.totalAmount).toBe(0)
    })

    it('大金额回款', () => {
      const item = store.addCollection({ amount: 999999999.99 })
      expect(item.amount).toBe(999999999.99)
      expect(store.totalAmount).toBe(999999999.99)
    })

    it('删除不存在的记录不会报错', () => {
      expect(() => {
        store.deleteCollection('non_existent_id')
      }).not.toThrow()
    })

    it('确认不存在的记录不会报错', () => {
      expect(() => {
        store.confirmCollection('non_existent_id')
      }).not.toThrow()
    })

    it('作废不存在的记录不会报错', () => {
      expect(() => {
        store.voidCollection('non_existent_id')
      }).not.toThrow()
    })

    it('给不存在的回款添加分期返回null', () => {
      const result = store.addInstallment('non_existent_id', { amount: 1000 })
      expect(result).toBeNull()
    })
  })

  /* ========== 异常情况 ========== */
  describe('异常情况', () => {
    it('负数金额会被parseFloat处理为负数', () => {
      const item = store.addCollection({ amount: -5000 })
      expect(item.amount).toBe(-5000)
    })

    it('非数字金额默认为0', () => {
      const item = store.addCollection({ amount: 'abc' })
      expect(item.amount).toBe(0)
    })

    it('未提供客户信息时使用默认值', () => {
      const item = store.addCollection({ amount: 1000 })
      expect(item.customerId).toBe('')
      expect(item.customerName).toBe('')
    })

    it('分期总额超过回款总额时仍可添加（仅警告）', () => {
      const item = store.addCollection({ amount: 10000 })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      store.addInstallment(item.id, { amount: 20000 })
      expect(consoleSpy).toHaveBeenCalledWith('分期总额将超过回款总额')
      consoleSpy.mockRestore()
    })
  })

  /* ========== 数据持久化 ========== */
  describe('数据持久化', () => {
    it('新增后localStorage已更新', () => {
      store.addCollection({ amount: 50000, customerName: '测试客户' })
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_collections'))
      expect(stored).toHaveLength(1)
      expect(stored[0].customerName).toBe('测试客户')
    })

    it('更新后localStorage已更新', () => {
      const item = store.addCollection({ amount: 10000 })
      store.updateCollection(item.id, { amount: 20000 })
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_collections'))
      expect(stored[0].amount).toBe(20000)
    })

    it('删除后localStorage已更新', () => {
      const item = store.addCollection({ amount: 10000 })
      store.deleteCollection(item.id)
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_collections'))
      expect(stored).toHaveLength(0)
    })

    it('确认后localStorage已更新', () => {
      const item = store.addCollection({ amount: 10000 })
      store.confirmCollection(item.id)
      const stored = JSON.parse(localStorage.getItem('gj_erp_gj_erp_collections'))
      expect(stored[0].status).toBe('confirmed')
    })
  })

  /* ========== 种子数据 ========== */
  describe('种子数据', () => {
    it('initSeedData 初始化5条种子数据', () => {
      store.initSeedData()
      expect(store.collections).toHaveLength(5)
    })

    it('种子数据包含不同状态', () => {
      store.initSeedData()
      const statuses = store.collections.map(c => c.status)
      expect(statuses).toContain('confirmed')
      expect(statuses).toContain('pending')
      expect(statuses).toContain('completed')
    })

    it('重复调用initSeedData不会重复添加', () => {
      store.initSeedData()
      store.initSeedData()
      expect(store.collections).toHaveLength(5)
    })

    it('清除初始化标记后可重新初始化', () => {
      store.initSeedData()
      localStorage.removeItem('gj_erp_gj_erp_collections_initialized')
      store.initSeedData()
      expect(store.collections).toHaveLength(5)
    })
  })

  /* ========== replaceData / mergeRemoteItems ========== */
  describe('数据替换与合并', () => {
    it('replaceData 替换全部数据', () => {
      store.addCollection({ amount: 1000 })
      const newData = [createCollection({ amount: 99999 })]
      store.replaceData(newData)
      expect(store.collections).toHaveLength(1)
      expect(store.collections[0].amount).toBe(99999)
    })

    it('mergeRemoteItems 合并远程数据', () => {
      store.addCollection({ amount: 1000 })
      const remoteItem = createCollection({ amount: 2000 })
      store.mergeRemoteItems([remoteItem])
      expect(store.collections).toHaveLength(2)
    })

    it('mergeRemoteItems 传入非数组不报错', () => {
      store.addCollection({ amount: 1000 })
      expect(() => store.mergeRemoteItems(null)).not.toThrow()
      expect(() => store.mergeRemoteItems('invalid')).not.toThrow()
    })
  })
})
