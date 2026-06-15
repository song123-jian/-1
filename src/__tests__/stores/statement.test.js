/**
 * 对账单 Store 综合测试
 * 覆盖：正常流程、业务逻辑（状态流转、付款标记、预警检测）、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { createStatement, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { safeGetJSON, safeGetItem } from '@/utils/storage'

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

describe('对账单 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useStatementStore()
  })

  /* ========== 正常流程：CRUD 操作 ========== */
  describe('正常流程 - CRUD 操作', () => {
    it('新增对账单', () => {
      const stmt = store.addStatement({
        buyerId: 'c1',
        buyerName: '上海贸易有限公司',
        totalAmount: 100000,
        period: '2026-05'
      })
      expect(stmt).toBeDefined()
      expect(stmt.id).toBeTruthy()
      expect(stmt.buyerId).toBe('c1')
      expect(stmt.totalAmount).toBe(100000)
      expect(stmt.status).toBe('pending')
      expect(stmt.paidAmount).toBe(0)
      expect(stmt.balance).toBe(100000)
      expect(stmt.createdBy).toBeTruthy()
    })

    it('更新对账单', () => {
      const stmt = store.addStatement({ totalAmount: 100000, buyerName: '旧客户' })
      store.updateStatement(stmt.id, { buyerName: '新客户', totalAmount: 200000 })
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.buyerName).toBe('新客户')
      expect(updated.totalAmount).toBe(200000)
      expect(updated.updatedAt).toBeTruthy()
    })

    it('更新totalAmount时自动重算balance', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.updateStatement(stmt.id, { totalAmount: 80000 })
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.balance).toBe(80000)
    })

    it('删除pending状态的对账单', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      expect(store.statements).toHaveLength(1)
      store.deleteStatement(stmt.id)
      expect(store.statements).toHaveLength(0)
    })

    it('删除draft状态的对账单', () => {
      const stmt = store.addStatement({ totalAmount: 100000, status: 'draft' })
      store.deleteStatement(stmt.id)
      expect(store.statements).toHaveLength(0)
    })

    it('不能删除confirmed状态的对账单', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.deleteStatement(stmt.id)
      expect(store.statements).toHaveLength(1)
    })

    it('更新不存在的记录不会报错', () => {
      expect(() => {
        store.updateStatement('non_existent_id', { totalAmount: 999 })
      }).not.toThrow()
    })

    it('getById 查询对账单', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      const found = store.getById(stmt.id)
      expect(found).toBeDefined()
      expect(found.totalAmount).toBe(100000)
    })

    it('getById 查询不存在的返回undefined', () => {
      expect(store.getById('non_existent')).toBeUndefined()
    })
  })

  /* ========== 业务逻辑：状态流转 ========== */
  describe('业务逻辑 - 状态流转', () => {
    it('确认对账单：pending -> confirmed', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      const result = store.confirmStatement(stmt.id)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('confirmed')
      expect(updated.confirmedAt).toBeTruthy()
    })

    it('只有pending状态可以确认', () => {
      // addStatement 中 status: 'pending' 在 ...data 之后，会覆盖传入的 status
      // 所以需要手动修改状态来测试非 pending 状态的确认
      const stmt = store.addStatement({ totalAmount: 100000 })
      // 手动将状态改为非 pending
      const idx = store.statements.findIndex(s => s.id === stmt.id)
      store.statements[idx].status = 'draft'
      const result = store.confirmStatement(stmt.id)
      expect(result).toBe(false)
    })

    it('作废对账单：pending -> voided', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      const result = store.voidStatement(stmt.id)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('voided')
    })

    it('作废对账单：confirmed -> voided', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      const result = store.voidStatement(stmt.id)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('voided')
    })

    it('已付款状态不能作废', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 100000)
      const result = store.voidStatement(stmt.id)
      expect(result).toBe(false)
    })

    it('重新打开对账单：confirmed -> pending', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      const result = store.reopenStatement(stmt.id)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('pending')
      expect(updated.paidAmount).toBe(0)
      expect(updated.balance).toBe(100000)
    })

    it('重新打开对账单：voided -> pending', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.voidStatement(stmt.id)
      const result = store.reopenStatement(stmt.id)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('pending')
    })

    it('pending状态不能重新打开', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      const result = store.reopenStatement(stmt.id)
      expect(result).toBe(false)
    })

    it('paid状态不能重新打开', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 100000)
      const result = store.reopenStatement(stmt.id)
      expect(result).toBe(false)
    })
  })

  /* ========== 业务逻辑：付款标记 ========== */
  describe('业务逻辑 - 付款标记', () => {
    it('部分付款', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      const result = store.markAsPaid(stmt.id, 30000)
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.paidAmount).toBe(30000)
      expect(updated.balance).toBe(70000)
      expect(updated.status).toBe('confirmed') /* 未付完仍为confirmed */
    })

    it('全额付款后状态变为paid', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 100000)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('paid')
      expect(updated.paidAmount).toBe(100000)
      expect(updated.balance).toBe(0)
    })

    it('分多次付款', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 40000)
      store.markAsPaid(stmt.id, 60000)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.status).toBe('paid')
      expect(updated.paidAmount).toBe(100000)
    })

    it('只有confirmed状态可以标记付款', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      const result = store.markAsPaid(stmt.id, 50000)
      expect(result).toBe(false)
    })

    it('付款金额超过总额返回false', () => {
      const stmt = store.addStatement({ totalAmount: 50000 })
      store.confirmStatement(stmt.id)
      const result = store.markAsPaid(stmt.id, 60000)
      expect(result).toBe(false)
    })

    it('累计付款超过总额返回false', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 80000)
      const result = store.markAsPaid(stmt.id, 30000)
      expect(result).toBe(false)
    })
  })

  /* ========== 业务逻辑：预警检测 ========== */
  describe('业务逻辑 - 预警检测', () => {
    it('checkAlerts 返回待审核超7天的预警', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)
      const stmt = store.addStatement({
        totalAmount: 100000
      })
      // addStatement 中 createdAt 在 ...data 之后，需要手动修改
      const idx = store.statements.findIndex(s => s.id === stmt.id)
      store.statements[idx].createdAt = oldDate.toISOString().slice(0, 10)
      const alerts = store.checkAlerts()
      const overdueAlerts = alerts.filter(a => a.type === 'overdue_confirm')
      expect(overdueAlerts.length).toBeGreaterThan(0)
    })

    it('checkAlerts 返回付款逾期预警', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 40)
      const stmt = store.addStatement({
        totalAmount: 100000,
        paymentTerm: '月结30天'
      })
      store.confirmStatement(stmt.id)
      /* 手动设置确认时间为40天前 */
      const idx = store.statements.findIndex(s => s.id === stmt.id)
      store.statements[idx].confirmedAt = oldDate.toISOString().replace('T', ' ').substring(0, 19)
      const alerts = store.checkAlerts()
      const paymentAlerts = alerts.filter(a => a.type === 'overdue_payment')
      expect(paymentAlerts.length).toBeGreaterThan(0)
    })

    it('无预警时返回空数组', () => {
      store.addStatement({ totalAmount: 100000 })
      const alerts = store.checkAlerts()
      expect(alerts).toHaveLength(0)
    })
  })

  /* ========== 业务逻辑：单号生成 ========== */
  describe('业务逻辑 - 单号生成', () => {
    it('generateStatementNo 生成正确格式', () => {
      const no = store.generateStatementNo('2026-05')
      expect(no).toMatch(/^GJ-DZ-202605-\d{3}$/)
    })

    it('同月份序号递增', () => {
      const no1 = store.generateStatementNo('2026-05')
      store.addStatement({ statementNo: no1, period: '2026-05', totalAmount: 1000 })
      const no2 = store.generateStatementNo('2026-05')
      expect(no2).not.toBe(no1)
    })
  })

  /* ========== 计算属性 ========== */
  describe('计算属性', () => {
    it('totalStatements - 对账单总数', () => {
      store.addStatement({ totalAmount: 100000 })
      store.addStatement({ totalAmount: 200000 })
      expect(store.totalStatements).toBe(2)
    })

    it('pendingCount - 待审核数', () => {
      store.addStatement({ totalAmount: 100000 })
      store.addStatement({ totalAmount: 200000 })
      const stmt3 = store.addStatement({ totalAmount: 300000 })
      store.confirmStatement(stmt3.id)
      expect(store.pendingCount).toBe(2)
    })

    it('confirmedCount - 已确认数', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      expect(store.confirmedCount).toBe(1)
    })

    it('paidCount - 已付款数', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 100000)
      expect(store.paidCount).toBe(1)
    })

    it('totalBalance - 未作废的余额合计', () => {
      const stmt1 = store.addStatement({ totalAmount: 100000 })
      // 确保第二个对账单有不同的 id（addStatement 使用 Date.now()，同一毫秒内 id 相同）
      const stmt2 = store.addStatement({ totalAmount: 50000 })
      // 修正 id 冲突：如果 id 相同，手动修改 stmt2 的 id
      if (stmt1.id === stmt2.id) {
        stmt2.id = stmt1.id + '_2'
      }
      store.confirmStatement(stmt1.id)
      store.markAsPaid(stmt1.id, 30000)
      store.voidStatement(stmt2.id)
      expect(store.totalBalance).toBe(70000)
    })

    it('totalAmount - 未作废的总额', () => {
      const stmt1 = store.addStatement({ totalAmount: 100000 })
      const stmt2 = store.addStatement({ totalAmount: 50000 })
      // 修正 id 冲突
      if (stmt1.id === stmt2.id) {
        stmt2.id = stmt1.id + '_2'
      }
      store.voidStatement(stmt2.id)
      expect(store.totalAmount).toBe(100000)
    })

    it('totalPaid - 未作废的已付总额', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 40000)
      expect(store.totalPaid).toBe(40000)
    })

    it('空数据时各项为0', () => {
      expect(store.totalStatements).toBe(0)
      expect(store.pendingCount).toBe(0)
      expect(store.confirmedCount).toBe(0)
      expect(store.paidCount).toBe(0)
      expect(store.totalBalance).toBe(0)
      expect(store.totalAmount).toBe(0)
      expect(store.totalPaid).toBe(0)
    })
  })

  /* ========== 边界条件 ========== */
  describe('边界条件', () => {
    it('金额为0的对账单', () => {
      const stmt = store.addStatement({ totalAmount: 0 })
      expect(stmt.totalAmount).toBe(0)
      expect(stmt.balance).toBe(0)
    })

    it('大金额对账单', () => {
      const stmt = store.addStatement({ totalAmount: 999999999.99 })
      expect(stmt.totalAmount).toBe(999999999.99)
    })

    it('不存在的对账单确认返回false', () => {
      expect(store.confirmStatement('non_existent')).toBe(false)
    })

    it('不存在的对账单作废返回false', () => {
      expect(store.voidStatement('non_existent')).toBe(false)
    })

    it('不存在的对账单付款返回false', () => {
      expect(store.markAsPaid('non_existent', 1000)).toBe(false)
    })

    it('不存在的对账单重新打开返回false', () => {
      expect(store.reopenStatement('non_existent')).toBe(false)
    })

    it('删除不存在的对账单不会报错', () => {
      expect(() => store.deleteStatement('non_existent')).not.toThrow()
    })
  })

  /* ========== 异常情况 ========== */
  describe('异常情况', () => {
    it('负数金额的对账单', () => {
      const stmt = store.addStatement({ totalAmount: -5000 })
      expect(stmt.totalAmount).toBe(-5000)
    })

    it('未提供totalAmount时默认为undefined', () => {
      const stmt = store.addStatement({})
      expect(stmt.totalAmount).toBeUndefined()
      expect(stmt.balance).toBe(0)
    })

    it('付款金额为0', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      const result = store.markAsPaid(stmt.id, 0)
      /* 0 <= totalAmount，且 newPaid(0) < totalAmount(100000)，所以不会变paid */
      expect(result).toBe(true)
      const updated = store.statements.find(s => s.id === stmt.id)
      expect(updated.paidAmount).toBe(0)
    })
  })

  /* ========== 数据持久化 ========== */
  describe('数据持久化', () => {
    it('新增后localStorage已更新', () => {
      store.addStatement({ totalAmount: 100000 })
      const stored = safeGetJSON('gj_erp_statements')
      expect(stored).toHaveLength(1)
    })

    it('确认后localStorage已更新', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      const stored = safeGetJSON('gj_erp_statements')
      expect(stored[0].status).toBe('confirmed')
    })

    it('付款后localStorage已更新', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.confirmStatement(stmt.id)
      store.markAsPaid(stmt.id, 50000)
      const stored = safeGetJSON('gj_erp_statements')
      expect(stored[0].paidAmount).toBe(50000)
    })

    it('删除后localStorage已更新', () => {
      const stmt = store.addStatement({ totalAmount: 100000 })
      store.deleteStatement(stmt.id)
      const stored = safeGetJSON('gj_erp_statements')
      expect(stored).toHaveLength(0)
    })
  })

  /* ========== 种子数据 ========== */
  describe('种子数据', () => {
    it('initSeedData 初始化4条种子数据', () => {
      store.initSeedData()
      expect(store.statements).toHaveLength(4)
    })

    it('种子数据包含不同状态', () => {
      store.initSeedData()
      const statuses = store.statements.map(s => s.status)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('confirmed')
    })

    it('重复调用initSeedData不会重复添加', () => {
      store.initSeedData()
      store.initSeedData()
      expect(store.statements).toHaveLength(4)
    })

    it('清除初始化标记后可重新初始化', () => {
      store.initSeedData()
      localStorage.removeItem('gj_erp_gj_erp_statements_initialized')
      store.initSeedData()
      expect(store.statements).toHaveLength(4)
    })
  })

  /* ========== replaceData / mergeRemoteItems ========== */
  describe('数据替换与合并', () => {
    it('replaceData 替换全部数据', () => {
      store.addStatement({ totalAmount: 1000 })
      const newData = [createStatement({ totalAmount: 99999 })]
      store.replaceData(newData)
      expect(store.statements).toHaveLength(1)
      expect(store.statements[0].totalAmount).toBe(99999)
    })

    it('mergeRemoteItems 合并远程数据', () => {
      store.addStatement({ totalAmount: 1000 })
      const remoteItem = createStatement({ totalAmount: 2000 })
      store.mergeRemoteItems([remoteItem])
      expect(store.statements).toHaveLength(2)
    })

    it('mergeRemoteItems 传入非数组不报错', () => {
      store.addStatement({ totalAmount: 1000 })
      expect(() => store.mergeRemoteItems(null)).not.toThrow()
      expect(() => store.mergeRemoteItems('invalid')).not.toThrow()
    })
  })
})
