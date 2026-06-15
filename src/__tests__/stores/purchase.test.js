/**
 * 采购单 Store 测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePurchaseStore } from '@/modules/purchase/stores/purchase'
import { createPurchaseOrder, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* 模拟 useSessionStore，避免依赖真实 session */
vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ roleName: '测试用户' })
}))

/* 模拟 useInventoryStore，避免依赖真实库存 */
vi.mock('@/modules/warehouse/stores/inventory', () => ({
  useInventoryStore: () => ({
    submitInboundOrder: vi.fn(),
    adjustStock: vi.fn(),
    inventory: []
  })
}))

describe('采购单 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = usePurchaseStore()
  })

  /* ===== 正常流程：CRUD 操作 ===== */
  describe('正常流程 - CRUD 操作', () => {
    it('addPurchaseOrder 应创建采购单并自动生成 orderNo', () => {
      const order = store.addPurchaseOrder({
        title: '测试采购单',
        supplierId: 's1',
        supplierName: '供应商A',
        items: [
          { materialCode: 'MTL-001', materialName: 'ABS树脂', quantity: 100, unitPrice: 85, amount: 8500 }
        ]
      })

      expect(order.id).toBeTruthy()
      expect(order.orderNo).toMatch(/^PO\d{11}$/) // PO + YYYYMMDD + NNN
      expect(order.title).toBe('测试采购单')
      expect(order.status).toBe('draft') // 默认状态为草稿
      expect(order.totalAmount).toBe(8500)
      expect(store.purchaseOrders).toHaveLength(1)
    })

    it('addPurchaseOrder 应自动计算总金额', () => {
      const order = store.addPurchaseOrder({
        items: [
          { materialCode: 'MTL-001', amount: 10000 },
          { materialCode: 'MTL-002', amount: 20000 },
          { materialCode: 'MTL-003', amount: 30000 }
        ]
      })

      expect(order.totalAmount).toBe(60000)
    })

    it('addPurchaseOrder 连续添加时 orderNo 序号递增', () => {
      const o1 = store.addPurchaseOrder({ title: '采购1' })
      const o2 = store.addPurchaseOrder({ title: '采购2' })

      expect(o2.orderNo).not.toBe(o1.orderNo)
      // 序号部分应递增
      const seq1 = parseInt(o1.orderNo.slice(-3), 10)
      const seq2 = parseInt(o2.orderNo.slice(-3), 10)
      expect(seq2).toBeGreaterThan(seq1)
    })

    it('updatePurchaseOrder 应更新采购单数据', () => {
      const order = store.addPurchaseOrder({ title: '原始标题' })
      store.updatePurchaseOrder(order.id, { title: '更新标题', notes: '已更新' })

      const updated = store.purchaseOrders.find((o) => o.id === order.id)
      expect(updated.title).toBe('更新标题')
      expect(updated.notes).toBe('已更新')
    })

    it('updatePurchaseOrder 更新 items 时应重新计算总金额', () => {
      const order = store.addPurchaseOrder({
        items: [{ materialCode: 'MTL-001', amount: 5000 }]
      })

      store.updatePurchaseOrder(order.id, {
        items: [
          { materialCode: 'MTL-001', amount: 8000 },
          { materialCode: 'MTL-002', amount: 12000 }
        ]
      })

      const updated = store.purchaseOrders.find((o) => o.id === order.id)
      expect(updated.totalAmount).toBe(20000)
    })

    it('deletePurchaseOrder 应删除草稿状态的采购单', () => {
      const order = store.addPurchaseOrder({ title: '草稿单' })
      expect(store.purchaseOrders).toHaveLength(1)

      const result = store.deletePurchaseOrder(order.id)
      expect(result).toBe(true)
      expect(store.purchaseOrders).toHaveLength(0)
    })

    it('deletePurchaseOrder 不应删除非草稿状态的采购单', () => {
      const order = store.addPurchaseOrder({ title: '待审批单' })
      store.submitPurchaseOrder(order.id) // draft -> pending

      const result = store.deletePurchaseOrder(order.id)
      expect(result).toBe(false)
      expect(store.purchaseOrders).toHaveLength(1)
    })

    it('deletePurchaseOrder 对不存在的ID应返回false', () => {
      const result = store.deletePurchaseOrder('nonexistent_id')
      expect(result).toBe(false)
    })
  })

  /* ===== 业务逻辑：采购单状态流转 ===== */
  describe('业务逻辑 - 采购单状态流转', () => {
    it('完整正向流程: draft -> pending -> approved -> ordered -> receiving -> inspecting -> completed', () => {
      const order = store.addPurchaseOrder({ title: '完整流程测试' })
      expect(order.status).toBe('draft')

      // 提交审批
      expect(store.submitPurchaseOrder(order.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('pending')

      // 审批通过
      expect(store.approvePurchaseOrder(order.id, '李总')).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('approved')
      expect(store.purchaseOrders[0].approver).toBe('李总')
      expect(store.purchaseOrders[0].approveDate).toBeTruthy()

      // 下单
      expect(store.orderPurchaseOrder(order.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('ordered')

      // 收货
      expect(store.receivePurchaseOrder(order.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('receiving')

      // 质检
      expect(store.inspectPurchaseOrder(order.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('inspecting')

      // 完成
      expect(store.completePurchaseOrder(order.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('completed')
      expect(store.purchaseOrders[0].actualDate).toBeTruthy()
    })

    it('取消流程: draft/pending/approved -> cancelled', () => {
      // 草稿可取消
      const o1 = store.addPurchaseOrder({ title: '取消1' })
      expect(store.cancelPurchaseOrder(o1.id)).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('cancelled')

      // 待审批可取消
      const o2 = store.addPurchaseOrder({ title: '取消2' })
      store.submitPurchaseOrder(o2.id)
      expect(store.cancelPurchaseOrder(o2.id)).toBe(true)
      expect(store.purchaseOrders[1].status).toBe('cancelled')

      // 已审批可取消
      const o3 = store.addPurchaseOrder({ title: '取消3' })
      store.submitPurchaseOrder(o3.id)
      store.approvePurchaseOrder(o3.id, '李总')
      expect(store.cancelPurchaseOrder(o3.id)).toBe(true)
      expect(store.purchaseOrders[2].status).toBe('cancelled')
    })

    it('审批拒绝: pending -> draft', () => {
      const order = store.addPurchaseOrder({ title: '拒绝测试', notes: '原始备注' })
      store.submitPurchaseOrder(order.id)

      expect(store.rejectPurchaseOrder(order.id, '价格过高')).toBe(true)
      expect(store.purchaseOrders[0].status).toBe('draft')
      expect(store.purchaseOrders[0].notes).toContain('审批拒绝')
      expect(store.purchaseOrders[0].notes).toContain('价格过高')
    })

    it('退货流程: ordered/receiving/inspecting/completed -> 创建退货单', () => {
      const order = store.addPurchaseOrder({
        title: '退货测试',
        items: [{ materialCode: 'MTL-001', amount: 10000 }],
        totalAmount: 10000
      })
      store.submitPurchaseOrder(order.id)
      store.approvePurchaseOrder(order.id, '李总')
      store.orderPurchaseOrder(order.id)

      const returnOrder = store.returnPurchaseOrder(order.id)
      expect(returnOrder).not.toBeNull()
      expect(returnOrder.type).toBe('return')
      expect(returnOrder.totalAmount).toBe(-10000)
      expect(returnOrder.title).toContain('退货')
      expect(returnOrder.status).toBe('completed')
      expect(store.purchaseOrders).toHaveLength(2)
    })
  })

  /* ===== 异常情况：非法状态转换 ===== */
  describe('异常情况 - 非法状态转换', () => {
    it('提交非草稿单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      store.submitPurchaseOrder(order.id) // draft -> pending
      expect(store.submitPurchaseOrder(order.id)).toBe(false) // 再次提交应失败
    })

    it('审批非待审批单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      // 草稿状态不能审批
      expect(store.approvePurchaseOrder(order.id, '李总')).toBe(false)
    })

    it('下单非已审批单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.orderPurchaseOrder(order.id)).toBe(false)
    })

    it('收货非已下单单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.receivePurchaseOrder(order.id)).toBe(false)
    })

    it('质检非收货中单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.inspectPurchaseOrder(order.id)).toBe(false)
    })

    it('完成非质检中单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.completePurchaseOrder(order.id)).toBe(false)
    })

    it('已下单/收货中/质检中/已完成状态不可取消', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      store.submitPurchaseOrder(order.id)
      store.approvePurchaseOrder(order.id, '李总')
      store.orderPurchaseOrder(order.id)

      expect(store.cancelPurchaseOrder(order.id)).toBe(false)
    })

    it('草稿/已完成状态不可退货', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.returnPurchaseOrder(order.id)).toBeNull()
    })

    it('拒绝非待审批单应失败', () => {
      const order = store.addPurchaseOrder({ title: '测试' })
      expect(store.rejectPurchaseOrder(order.id, '理由')).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('pendingCount 应正确统计待审批数量', () => {
      store.addPurchaseOrder({ title: '草稿1' })
      store.addPurchaseOrder({ title: '草稿2' })
      expect(store.pendingCount).toBe(0)

      store.submitPurchaseOrder(store.purchaseOrders[0].id)
      expect(store.pendingCount).toBe(1)

      store.submitPurchaseOrder(store.purchaseOrders[1].id)
      expect(store.pendingCount).toBe(2)
    })

    it('inProgressCount 应统计进行中数量(approved/ordered/receiving/inspecting)', () => {
      const o1 = store.addPurchaseOrder({ title: '审批中' })
      store.submitPurchaseOrder(o1.id)
      store.approvePurchaseOrder(o1.id, '李总')
      expect(store.inProgressCount).toBe(1) // approved

      const o2 = store.addPurchaseOrder({ title: '已下单' })
      store.submitPurchaseOrder(o2.id)
      store.approvePurchaseOrder(o2.id, '李总')
      store.orderPurchaseOrder(o2.id)
      expect(store.inProgressCount).toBe(2) // approved + ordered
    })

    it('totalCount 应统计全部采购单数量', () => {
      store.addPurchaseOrder({ title: '单1' })
      store.addPurchaseOrder({ title: '单2' })
      store.addPurchaseOrder({ title: '单3' })
      expect(store.totalCount).toBe(3)
    })

    it('returnOrders 应只返回退货类型采购单', () => {
      store.addPurchaseOrder({ title: '采购1', type: 'purchase' })
      store.addPurchaseOrder({ title: '退货1', type: 'return' })
      store.addPurchaseOrder({ title: '采购2', type: 'purchase' })

      expect(store.returnOrders).toHaveLength(1)
      expect(store.returnOrders[0].type).toBe('return')
    })

    it('thisMonthAmount 应统计本月采购类型采购单金额', () => {
      const now = new Date()
      const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

      store.addPurchaseOrder({
        title: '本月采购',
        type: 'purchase',
        items: [{ amount: 50000 }],
        createDate: ym + '-01'
      })
      store.addPurchaseOrder({
        title: '上月采购',
        type: 'purchase',
        items: [{ amount: 30000 }],
        createDate: '2024-01-15'
      })
      store.addPurchaseOrder({
        title: '本月退货',
        type: 'return',
        items: [{ amount: 10000 }],
        createDate: ym + '-05'
      })

      // 仅统计本月且类型为purchase的金额
      expect(store.thisMonthAmount).toBe(50000)
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('空数据时计算属性应为0', () => {
      expect(store.pendingCount).toBe(0)
      expect(store.inProgressCount).toBe(0)
      expect(store.totalCount).toBe(0)
      expect(store.thisMonthAmount).toBe(0)
      expect(store.returnOrders).toHaveLength(0)
    })

    it('getPurchaseOrdersBySupplier 应按供应商筛选', () => {
      store.addPurchaseOrder({ supplierId: 's1', supplierName: '供应商A' })
      store.addPurchaseOrder({ supplierId: 's2', supplierName: '供应商B' })
      store.addPurchaseOrder({ supplierId: 's1', supplierName: '供应商A' })

      const s1Orders = store.getPurchaseOrdersBySupplier('s1')
      expect(s1Orders).toHaveLength(2)

      const s3Orders = store.getPurchaseOrdersBySupplier('s3')
      expect(s3Orders).toHaveLength(0)
    })

    it('items 为空时 totalAmount 应为0', () => {
      const order = store.addPurchaseOrder({ title: '空明细' })
      expect(order.totalAmount).toBe(0)
    })

    it('items 中 amount 为非数字时应忽略', () => {
      const order = store.addPurchaseOrder({
        items: [
          { materialCode: 'MTL-001', amount: 1000 },
          { materialCode: 'MTL-002', amount: NaN },
          { materialCode: 'MTL-003', amount: undefined },
          { materialCode: 'MTL-004', amount: 'abc' }
        ]
      })
      expect(order.totalAmount).toBe(1000)
    })

    it('updatePurchaseOrder 对不存在的ID应静默忽略', () => {
      store.addPurchaseOrder({ title: '存在' })
      store.updatePurchaseOrder('nonexistent', { title: '不存在' })
      expect(store.purchaseOrders).toHaveLength(1)
      expect(store.purchaseOrders[0].title).toBe('存在')
    })
  })

  /* ===== 数据持久化 ===== */
  describe('数据持久化', () => {
    it('addPurchaseOrder 后 localStorage 应更新', () => {
      store.addPurchaseOrder({ title: '持久化测试' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_purchaseOrders'))
      expect(stored).toHaveLength(1)
      expect(stored[0].title).toBe('持久化测试')
    })

    it('updatePurchaseOrder 后 localStorage 应更新', () => {
      const order = store.addPurchaseOrder({ title: '原始' })
      store.updatePurchaseOrder(order.id, { title: '更新后' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_purchaseOrders'))
      expect(stored[0].title).toBe('更新后')
    })

    it('deletePurchaseOrder 后 localStorage 应更新', () => {
      const order = store.addPurchaseOrder({ title: '待删除' })
      store.deletePurchaseOrder(order.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_purchaseOrders'))
      expect(stored).toHaveLength(0)
    })

    it('状态变更后 localStorage 应更新', () => {
      const order = store.addPurchaseOrder({ title: '状态测试' })
      store.submitPurchaseOrder(order.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_purchaseOrders'))
      expect(stored[0].status).toBe('pending')
    })
  })

  /* ===== 种子数据 ===== */
  describe('种子数据', () => {
    it('initSeedData 应初始化预设采购单', () => {
      store.initSeedData()

      expect(store.purchaseOrders.length).toBeGreaterThan(0)
      // 应包含不同状态的采购单
      const statuses = store.purchaseOrders.map((o) => o.status)
      expect(statuses).toContain('completed')
      expect(statuses).toContain('pending')
      expect(statuses).toContain('draft')
    })

    it('initSeedData 应包含退货类型采购单', () => {
      store.initSeedData()

      const returnOrders = store.purchaseOrders.filter((o) => o.type === 'return')
      expect(returnOrders.length).toBeGreaterThan(0)
    })

    it('initSeedData 重复调用不应重复初始化', () => {
      store.initSeedData()
      const count1 = store.purchaseOrders.length

      store.initSeedData()
      const count2 = store.purchaseOrders.length

      expect(count1).toBe(count2)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(localStorage.getItem('gj_erp_purchase_initialized')).toBe('1')
    })

    it('initSeedData 后 localStorage 应包含数据', () => {
      store.initSeedData()

      const stored = JSON.parse(localStorage.getItem('gj_erp_purchaseOrders'))
      expect(stored.length).toBeGreaterThan(0)
    })
  })
})
