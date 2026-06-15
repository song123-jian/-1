/**
 * 调拨管理 Store 综合测试
 * 覆盖：CRUD、状态流转、验证逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTransferStore } from '@/modules/warehouse/stores/transfer'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createTransfer, resetCounter } from '@/__tests__/mockData'

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

describe('调拨管理 Store', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    resetCounter()
    invStore = useInventoryStore()
    store = useTransferStore()
  })

  /* ===== CRUD ===== */
  describe('addTransferOrder', () => {
    it('应创建调拨单并设置初始状态为 draft', () => {
      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'branch',
        toWarehouseName: '分仓库',
        items: [
          { materialCode: 'MTL-001', materialName: '物料A', quantity: 100, unitPrice: 50 },
          { materialCode: 'MTL-002', materialName: '物料B', quantity: 200, unitPrice: 80 }
        ],
        requester: '仓管员',
        expectedDate: '2026-06-20'
      })
      expect(order).toBeDefined()
      expect(order.status).toBe('draft')
      expect(order.type).toBe('same_price')
      expect(order.fromWarehouseId).toBe('main')
      expect(order.toWarehouseId).toBe('branch')
      expect(order.items).toHaveLength(2)
      expect(order.items[0].amount).toBe(5000) // 100 * 50
      expect(order.totalAmount).toBe(21000) // 5000 + 16000
      expect(order.orderNo).toMatch(/^DB/)
    })

    it('不传 items 时应创建空调拨单', () => {
      const order = store.addTransferOrder({
        fromWarehouseId: 'main',
        toWarehouseId: 'branch'
      })
      expect(order.items).toHaveLength(0)
      expect(order.totalAmount).toBe(0)
    })

    it('默认值应正确填充', () => {
      const order = store.addTransferOrder({})
      expect(order.type).toBe('same_price')
      expect(order.fromWarehouseId).toBe('')
      expect(order.toWarehouseId).toBe('')
      expect(order.requester).toBe('')
      expect(order.approver).toBe('')
      expect(order.approveDate).toBeNull()
      expect(order.actualDate).toBeNull()
    })
  })

  /* ===== 状态流转 ===== */
  describe('状态流转', () => {
    let order

    beforeEach(() => {
      order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'branch',
        toWarehouseName: '分仓库',
        items: [
          { materialCode: 'MTL-001', materialName: '物料A', quantity: 100, unitPrice: 50 }
        ]
      })
    })

    describe('submitTransferOrder', () => {
      it('应将 draft 状态变更为 pending', () => {
        const result = store.submitTransferOrder(order.id)
        expect(result).toBe(true)
        expect(store.transferOrders.find(o => o.id === order.id).status).toBe('pending')
      })

      it('非 draft 状态不可提交', () => {
        store.submitTransferOrder(order.id)
        const result = store.submitTransferOrder(order.id)
        expect(result).toBe(false)
      })

      it('不存在的调拨单应返回 false', () => {
        const result = store.submitTransferOrder('non-existent-id')
        expect(result).toBe(false)
      })
    })

    describe('approveTransferOrder', () => {
      it('应将 pending 状态变更为 approved', () => {
        store.submitTransferOrder(order.id)
        const result = store.approveTransferOrder(order.id, '仓库主管')
        expect(result).toBe(true)
        const updated = store.transferOrders.find(o => o.id === order.id)
        expect(updated.status).toBe('approved')
        expect(updated.approver).toBe('仓库主管')
        expect(updated.approveDate).toBeDefined()
      })

      it('非 pending 状态不可审批', () => {
        /* 仍为 draft 状态 */
        const result = store.approveTransferOrder(order.id, '仓库主管')
        expect(result).toBe(false)
      })
    })

    describe('rejectTransferOrder', () => {
      it('应将 pending 状态变更为 cancelled', () => {
        store.submitTransferOrder(order.id)
        const result = store.rejectTransferOrder(order.id)
        expect(result).toBe(true)
        expect(store.transferOrders.find(o => o.id === order.id).status).toBe('cancelled')
      })

      it('非 pending 状态不可拒绝', () => {
        const result = store.rejectTransferOrder(order.id)
        expect(result).toBe(false)
      })
    })

    describe('shipTransferOrder', () => {
      it('应将 approved 状态变更为 in_transit', () => {
        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        const result = store.shipTransferOrder(order.id)
        expect(result).toBe(true)
        expect(store.transferOrders.find(o => o.id === order.id).status).toBe('in_transit')
      })

      it('非 approved 状态不可发货', () => {
        const result = store.shipTransferOrder(order.id)
        expect(result).toBe(false)
      })
    })

    describe('receiveTransferOrder', () => {
      it('应将 in_transit 状态变更为 completed 并调整库存', () => {
        /* 在调出仓库添加库存 */
        invStore.addInventoryItem({
          code: 'MTL-001',
          name: '物料A',
          quantity: 500,
          unitCost: 50,
          warehouse: 'main'
        })

        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        store.shipTransferOrder(order.id)

        const result = store.receiveTransferOrder(order.id)
        expect(result.success).toBe(true)
        expect(result.adjustedCount).toBeGreaterThan(0)

        const updated = store.transferOrders.find(o => o.id === order.id)
        expect(updated.status).toBe('completed')
        expect(updated.actualDate).toBeDefined()

        /* 验证调出仓库库存扣减 */
        const fromItem = invStore.inventory.find(
          i => i.code === 'MTL-001' && i.warehouse === 'main'
        )
        expect(fromItem.quantity).toBe(400) // 500 - 100
      })

      it('调入仓库已有物料时应增加数量', () => {
        /* 在两个仓库都添加库存 */
        invStore.addInventoryItem({
          code: 'MTL-001',
          name: '物料A',
          quantity: 500,
          unitCost: 50,
          warehouse: 'main'
        })
        invStore.addInventoryItem({
          code: 'MTL-001',
          name: '物料A',
          quantity: 200,
          unitCost: 50,
          warehouse: 'branch'
        })

        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        store.shipTransferOrder(order.id)

        const result = store.receiveTransferOrder(order.id)
        expect(result.success).toBe(true)

        /* 验证调入仓库库存增加 */
        const toItem = invStore.inventory.find(
          i => i.code === 'MTL-001' && i.warehouse === 'branch'
        )
        expect(toItem.quantity).toBe(300) // 200 + 100
      })

      it('调入仓库没有该物料时应新增库存记录', () => {
        /* 只在调出仓库添加库存 */
        invStore.addInventoryItem({
          code: 'MTL-001',
          name: '物料A',
          quantity: 500,
          unitCost: 50,
          warehouse: 'main'
        })

        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        store.shipTransferOrder(order.id)

        const result = store.receiveTransferOrder(order.id)
        expect(result.success).toBe(true)

        /* 验证调入仓库新增了库存记录 */
        const toItem = invStore.inventory.find(
          i => i.code === 'MTL-001' && i.warehouse === 'branch'
        )
        expect(toItem).toBeDefined()
        expect(toItem.quantity).toBe(100)
      })

      it('非 in_transit 状态不可收货', () => {
        store.submitTransferOrder(order.id)
        const result = store.receiveTransferOrder(order.id)
        expect(result.success).toBe(false)
        expect(result.error).toBe('仅可在途单据可收货')
      })

      it('不存在的调拨单应返回错误', () => {
        const result = store.receiveTransferOrder('non-existent-id')
        expect(result.success).toBe(false)
        expect(result.error).toBe('未找到调拨单')
      })
    })

    describe('cancelTransferOrder', () => {
      it('应取消 draft 状态的调拨单', () => {
        const result = store.cancelTransferOrder(order.id)
        expect(result).toBe(true)
        expect(store.transferOrders.find(o => o.id === order.id).status).toBe('cancelled')
      })

      it('应取消 pending 状态的调拨单', () => {
        store.submitTransferOrder(order.id)
        const result = store.cancelTransferOrder(order.id)
        expect(result).toBe(true)
        expect(store.transferOrders.find(o => o.id === order.id).status).toBe('cancelled')
      })

      it('应取消 approved 状态的调拨单', () => {
        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        const result = store.cancelTransferOrder(order.id)
        expect(result).toBe(true)
      })

      it('in_transit 状态不可取消', () => {
        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        store.shipTransferOrder(order.id)
        const result = store.cancelTransferOrder(order.id)
        expect(result).toBe(false)
      })

      it('completed 状态不可取消', () => {
        invStore.addInventoryItem({
          code: 'MTL-001', name: '物料A', quantity: 500, unitCost: 50, warehouse: 'main'
        })
        store.submitTransferOrder(order.id)
        store.approveTransferOrder(order.id, '仓库主管')
        store.shipTransferOrder(order.id)
        store.receiveTransferOrder(order.id)
        const result = store.cancelTransferOrder(order.id)
        expect(result).toBe(false)
      })
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('应正确统计各状态数量', () => {
      const o1 = store.addTransferOrder({ fromWarehouseId: 'main', toWarehouseId: 'branch' })
      const o2 = store.addTransferOrder({ fromWarehouseId: 'main', toWarehouseId: 'branch' })
      const o3 = store.addTransferOrder({ fromWarehouseId: 'main', toWarehouseId: 'branch' })

      store.submitTransferOrder(o1.id)
      store.submitTransferOrder(o2.id)
      store.approveTransferOrder(o1.id, '主管')
      store.shipTransferOrder(o1.id)

      expect(store.totalOrders).toBe(3)
      expect(store.pendingCount).toBe(1) // o2
      expect(store.inTransitCount).toBe(1) // o1
      expect(store.completedCount).toBe(0)
    })

    it('monthlyAmount 应统计当月已完成的调拨金额（需 completeDate 字段）', () => {
      const order = store.addTransferOrder({
        fromWarehouseId: 'main',
        toWarehouseId: 'branch',
        items: [{ materialCode: 'MTL-001', materialName: '物料A', quantity: 100, unitPrice: 50 }]
      })
      /* 手动设置为已完成，当月完成 */
      store.submitTransferOrder(order.id)
      store.approveTransferOrder(order.id, '主管')
      store.shipTransferOrder(order.id)
      /* 直接修改状态和完成日期来模拟 */
      const idx = store.transferOrders.findIndex(o => o.id === order.id)
      store.transferOrders[idx].status = 'completed'
      /* monthlyAmount 计算属性检查 completeDate 字段，
         注意：receiveTransferOrder 设置的是 actualDate 而非 completeDate，
         此处手动设置 completeDate 以验证计算属性逻辑 */
      store.transferOrders[idx].completeDate = new Date().toISOString().slice(0, 10)

      expect(store.completedCount).toBe(1)
      expect(store.monthlyAmount).toBe(5000)
    })
  })

  /* ===== 完整流程验证 ===== */
  describe('完整流程', () => {
    it('完整状态流转: draft -> pending -> approved -> in_transit -> completed', () => {
      invStore.addInventoryItem({
        code: 'MTL-FLOW',
        name: '流程物料',
        quantity: 500,
        unitCost: 50,
        warehouse: 'main'
      })

      const order = store.addTransferOrder({
        type: 'same_price',
        fromWarehouseId: 'main',
        fromWarehouseName: '主仓库',
        toWarehouseId: 'branch',
        toWarehouseName: '分仓库',
        items: [
          { materialCode: 'MTL-FLOW', materialName: '流程物料', quantity: 100, unitPrice: 50 }
        ],
        requester: '仓管员'
      })
      expect(order.status).toBe('draft')

      expect(store.submitTransferOrder(order.id)).toBe(true)
      expect(store.transferOrders[0].status).toBe('pending')

      expect(store.approveTransferOrder(order.id, '仓库主管')).toBe(true)
      expect(store.transferOrders[0].status).toBe('approved')

      expect(store.shipTransferOrder(order.id)).toBe(true)
      expect(store.transferOrders[0].status).toBe('in_transit')

      const result = store.receiveTransferOrder(order.id)
      expect(result.success).toBe(true)
      expect(store.transferOrders[0].status).toBe('completed')

      /* 验证库存变动 */
      const fromItem = invStore.inventory.find(
        i => i.code === 'MTL-FLOW' && i.warehouse === 'main'
      )
      expect(fromItem.quantity).toBe(400)
    })

    it('拒绝流程: draft -> pending -> cancelled', () => {
      const order = store.addTransferOrder({
        fromWarehouseId: 'main',
        toWarehouseId: 'branch',
        items: [{ materialCode: 'MTL-001', materialName: '物料A', quantity: 100, unitPrice: 50 }]
      })
      store.submitTransferOrder(order.id)
      store.rejectTransferOrder(order.id)
      expect(store.transferOrders[0].status).toBe('cancelled')
    })
  })
})
