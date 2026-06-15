/**
 * 盘点管理 Store 综合测试
 * 覆盖：CRUD、状态流转、验证逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStocktakingStore } from '@/modules/warehouse/stores/stocktaking'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createStocktaking, createInventoryItem, resetCounter } from '@/__tests__/mockData'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户'
  })
}))

describe('盘点管理 Store', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    resetCounter()
    invStore = useInventoryStore()
    store = useStocktakingStore()
  })

  /* ===== CRUD ===== */
  describe('addStocktakingOrder', () => {
    it('应创建盘点单并设置初始状态为 planned', () => {
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        warehouseName: '主仓库',
        plannedDate: '2026-06-15',
        executor: '仓管员',
        items: [
          { code: 'MTL-001', name: '物料A', quantity: 100, unit: 'kg' },
          { code: 'MTL-002', name: '物料B', quantity: 200, unit: 'kg' }
        ]
      })
      expect(order).toBeDefined()
      expect(order.status).toBe('planned')
      expect(order.type).toBe('full')
      expect(order.warehouseId).toBe('main')
      expect(order.items).toHaveLength(2)
      expect(order.items[0].status).toBe('pending')
      expect(order.items[0].systemQty).toBe(100)
      expect(order.items[0].actualQty).toBeNull()
      expect(order.summary.totalItems).toBe(2)
      expect(order.summary.countedItems).toBe(0)
      expect(order.orderNo).toMatch(/^PD/)
    })

    it('不传 items 时应创建空盘点单', () => {
      const order = store.addStocktakingOrder({
        type: 'partial',
        warehouseId: 'main'
      })
      expect(order.items).toHaveLength(0)
      expect(order.summary.totalItems).toBe(0)
    })

    it('默认值应正确填充', () => {
      const order = store.addStocktakingOrder({})
      expect(order.type).toBe('full')
      expect(order.warehouseId).toBe('main')
      expect(order.warehouseName).toBe('主仓库')
      expect(order.executor).toBe('')
      expect(order.notes).toBe('')
    })
  })

  /* ===== 状态流转 ===== */
  describe('状态流转', () => {
    let order

    beforeEach(() => {
      order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        items: [
          { code: 'MTL-001', name: '物料A', quantity: 100, unit: 'kg' },
          { code: 'MTL-002', name: '物料B', quantity: 200, unit: 'kg' }
        ]
      })
    })

    describe('startStocktaking', () => {
      it('应将 planned 状态变更为 executing', () => {
        const result = store.startStocktaking(order.id)
        expect(result).toBe(true)
        expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('executing')
      })

      it('非 planned 状态不可开始盘点', () => {
        store.startStocktaking(order.id)
        /* 已是 executing，再次开始应失败 */
        const result = store.startStocktaking(order.id)
        expect(result).toBe(false)
      })

      it('不存在的盘点单应返回 false', () => {
        const result = store.startStocktaking('non-existent-id')
        expect(result).toBe(false)
      })
    })

    describe('updateItemCount', () => {
      it('应更新实盘数量并计算差异', () => {
        store.startStocktaking(order.id)
        const itemId = order.items[0].id
        const result = store.updateItemCount(order.id, itemId, 95)
        expect(result).toBe(true)

        const updated = store.stocktakingOrders.find(o => o.id === order.id)
        const item = updated.items.find(i => i.id === itemId)
        expect(item.actualQty).toBe(95)
        expect(item.diffQty).toBe(-5) // 95 - 100
        expect(item.status).toBe('diff')
      })

      it('实盘数量等于系统数量时状态应为 counted', () => {
        store.startStocktaking(order.id)
        const itemId = order.items[0].id
        store.updateItemCount(order.id, itemId, 100)
        const updated = store.stocktakingOrders.find(o => o.id === order.id)
        const item = updated.items.find(i => i.id === itemId)
        expect(item.diffQty).toBe(0)
        expect(item.status).toBe('counted')
      })

      it('应重新计算汇总信息', () => {
        store.startStocktaking(order.id)
        /* 添加库存物料用于计算盈亏金额 */
        invStore.addInventoryItem({ code: 'MTL-001', name: '物料A', quantity: 100, unitCost: 50 })
        invStore.addInventoryItem({ code: 'MTL-002', name: '物料B', quantity: 200, unitCost: 80 })

        store.updateItemCount(order.id, order.items[0].id, 95) // 亏5个 * 50 = 250
        store.updateItemCount(order.id, order.items[1].id, 210) // 盈10个 * 80 = 800

        const updated = store.stocktakingOrders.find(o => o.id === order.id)
        expect(updated.summary.countedItems).toBe(2)
        expect(updated.summary.diffItems).toBe(2)
        expect(updated.summary.profitAmount).toBe(800)
        expect(updated.summary.lossAmount).toBe(250)
      })

      it('不存在的盘点单应返回 false', () => {
        const result = store.updateItemCount('non-existent-id', 'item-id', 100)
        expect(result).toBe(false)
      })

      it('不存在的明细项应返回 false', () => {
        store.startStocktaking(order.id)
        const result = store.updateItemCount(order.id, 'non-existent-item', 100)
        expect(result).toBe(false)
      })
    })

    describe('completeStocktaking', () => {
      it('全部盘点完成后应进入 diff_review 状态', () => {
        store.startStocktaking(order.id)
        store.updateItemCount(order.id, order.items[0].id, 100)
        store.updateItemCount(order.id, order.items[1].id, 200)
        const result = store.completeStocktaking(order.id)
        expect(result).toBe(true)
        expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('diff_review')
      })

      it('未全部盘点完成不可完成', () => {
        store.startStocktaking(order.id)
        store.updateItemCount(order.id, order.items[0].id, 100)
        /* 第二个物料未盘点 */
        const result = store.completeStocktaking(order.id)
        expect(result).toBe(false)
      })

      it('非 executing 状态不可完成', () => {
        /* 仍为 planned 状态 */
        const result = store.completeStocktaking(order.id)
        expect(result).toBe(false)
      })
    })

    describe('reviewDiff', () => {
      it('审批通过应进入 completed 状态', () => {
        store.startStocktaking(order.id)
        store.updateItemCount(order.id, order.items[0].id, 100)
        store.updateItemCount(order.id, order.items[1].id, 200)
        store.completeStocktaking(order.id)
        const result = store.reviewDiff(order.id, true)
        expect(result).toBe(true)
        expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('completed')
      })

      it('审批拒绝应进入 cancelled 状态', () => {
        store.startStocktaking(order.id)
        store.updateItemCount(order.id, order.items[0].id, 100)
        store.updateItemCount(order.id, order.items[1].id, 200)
        store.completeStocktaking(order.id)
        const result = store.reviewDiff(order.id, false)
        expect(result).toBe(true)
        expect(store.stocktakingOrders.find(o => o.id === order.id).status).toBe('cancelled')
      })

      it('非 diff_review 状态不可审批', () => {
        const result = store.reviewDiff(order.id, true)
        expect(result).toBe(false)
      })
    })
  })

  /* ===== 库存调整 ===== */
  describe('adjustInventory', () => {
    it('已完成的盘点单应调整库存', () => {
      /* 添加库存物料 */
      invStore.addInventoryItem({
        id: 'inv-001',
        code: 'MTL-ADJ',
        name: '调整物料',
        quantity: 100,
        unitCost: 50
      })

      /* 创建并完成盘点 */
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        items: [{ code: 'MTL-ADJ', name: '调整物料', quantity: 100, unit: 'kg' }]
      })
      store.startStocktaking(order.id)
      store.updateItemCount(order.id, order.items[0].id, 95) // 亏5
      store.completeStocktaking(order.id)
      store.reviewDiff(order.id, true)

      /* 调整库存 */
      const result = store.adjustInventory(order.id)
      expect(result.success).toBe(true)
      expect(result.adjustedCount).toBe(1)

      const invItem = invStore.inventory.find(i => i.code === 'MTL-ADJ')
      expect(invItem.quantity).toBe(95)
    })

    it('未完成的盘点单不可调整库存', () => {
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        items: [{ code: 'MTL-ADJ2', name: '调整物料2', quantity: 100, unit: 'kg' }]
      })
      const result = store.adjustInventory(order.id)
      expect(result.success).toBe(false)
      expect(result.error).toBe('仅已完成的盘点单可调整库存')
    })

    it('不存在的盘点单应返回错误', () => {
      const result = store.adjustInventory('non-existent-id')
      expect(result.success).toBe(false)
      expect(result.error).toBe('未找到盘点单')
    })

    it('差异为0的物料不应调整', () => {
      invStore.addInventoryItem({
        id: 'inv-002',
        code: 'MTL-NO-DIFF',
        name: '无差异物料',
        quantity: 100,
        unitCost: 50
      })
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        items: [{ code: 'MTL-NO-DIFF', name: '无差异物料', quantity: 100, unit: 'kg' }]
      })
      store.startStocktaking(order.id)
      store.updateItemCount(order.id, order.items[0].id, 100) // 无差异
      store.completeStocktaking(order.id)
      store.reviewDiff(order.id, true)
      const result = store.adjustInventory(order.id)
      expect(result.success).toBe(true)
      expect(result.adjustedCount).toBe(0)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('应正确统计各状态数量', () => {
      store.addStocktakingOrder({ type: 'full', warehouseId: 'main', items: [] })
      /* 默认 planned */
      expect(store.plannedCount).toBe(1)
      expect(store.totalOrders).toBe(1)

      const order2 = store.addStocktakingOrder({ type: 'partial', warehouseId: 'main', items: [] })
      store.startStocktaking(order2.id)
      expect(store.executingCount).toBe(1)

      expect(store.totalOrders).toBe(2)
    })
  })

  /* ===== 验证 ===== */
  describe('验证逻辑', () => {
    it('完整的状态流转应正常工作: planned -> executing -> diff_review -> completed', () => {
      invStore.addInventoryItem({ code: 'MTL-FLOW', name: '流程物料', quantity: 100, unitCost: 50 })
      const order = store.addStocktakingOrder({
        type: 'full',
        warehouseId: 'main',
        items: [{ code: 'MTL-FLOW', name: '流程物料', quantity: 100, unit: 'kg' }]
      })
      expect(order.status).toBe('planned')

      expect(store.startStocktaking(order.id)).toBe(true)
      expect(store.stocktakingOrders[0].status).toBe('executing')

      store.updateItemCount(order.id, order.items[0].id, 98)
      expect(store.completeStocktaking(order.id)).toBe(true)
      expect(store.stocktakingOrders[0].status).toBe('diff_review')

      expect(store.reviewDiff(order.id, true)).toBe(true)
      expect(store.stocktakingOrders[0].status).toBe('completed')

      const result = store.adjustInventory(order.id)
      expect(result.success).toBe(true)
      expect(invStore.inventory.find(i => i.code === 'MTL-FLOW').quantity).toBe(98)
    })
  })
})
