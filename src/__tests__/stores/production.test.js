/**
 * 生产工单 Store 测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProductionStore } from '@/modules/production/stores/production'
import { createProductionOrder, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* 模拟 useBomStore，避免循环依赖 */
vi.mock('@/modules/production/stores/bom', () => ({
  useBomStore: () => ({
    getBomById: vi.fn(() => null),
    bomList: []
  })
}))

/* 模拟 useInventoryStore，避免依赖真实库存 */
vi.mock('@/modules/warehouse/stores/inventory', () => ({
  useInventoryStore: () => ({
    inventory: [],
    adjustStock: vi.fn(),
    addInventoryItem: vi.fn(),
    updateInventoryItem: vi.fn()
  })
}))

describe('生产工单 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useProductionStore()
  })

  /* ===== 正常流程：CRUD 操作 ===== */
  describe('正常流程 - CRUD 操作', () => {
    it('addProductionOrder 应创建工单并自动生成 orderNo', () => {
      const order = store.addProductionOrder({
        productName: '精密减速器RV-40E',
        quantity: 50,
        unit: '台',
        unitPrice: 8500
      })

      expect(order.id).toBeTruthy()
      expect(order.orderNo).toMatch(/^MO\d{11}$/) // MO + YYYYMMDD + NNN
      expect(order.productName).toBe('精密减速器RV-40E')
      expect(order.status).toBe('planned') // 默认状态为已计划
      expect(order.progress).toBe(0)
      expect(store.productionOrders).toHaveLength(1)
    })

    it('addProductionOrder 连续添加时 orderNo 序号递增', () => {
      const o1 = store.addProductionOrder({ productName: '产品1' })
      const o2 = store.addProductionOrder({ productName: '产品2' })

      expect(o2.orderNo).not.toBe(o1.orderNo)
      const seq1 = parseInt(o1.orderNo.slice(-3), 10)
      const seq2 = parseInt(o2.orderNo.slice(-3), 10)
      expect(seq2).toBeGreaterThan(seq1)
    })

    it('addProductionOrder 应使用默认值填充字段', () => {
      const order = store.addProductionOrder({ productName: '默认值测试' })

      expect(order.unit).toBe('台')
      expect(order.priority).toBe('normal')
      expect(order.progress).toBe(0)
      expect(order.materialRequisitions).toEqual([])
      expect(order.createDate).toBeTruthy()
    })

    it('updateProductionOrder 应更新工单数据', () => {
      const order = store.addProductionOrder({ productName: '原始产品' })
      const result = store.updateProductionOrder(order.id, {
        productName: '更新产品',
        quantity: 100,
        notes: '已更新'
      })

      expect(result).toBe(true)
      const updated = store.productionOrders.find((o) => o.id === order.id)
      expect(updated.productName).toBe('更新产品')
      expect(updated.quantity).toBe(100)
      expect(updated.notes).toBe('已更新')
    })

    it('updateProductionOrder 对不存在的ID应返回false', () => {
      const result = store.updateProductionOrder('nonexistent', { productName: '不存在' })
      expect(result).toBe(false)
    })

    it('getOrderById 应返回对应工单', () => {
      const order = store.addProductionOrder({ productName: '查找测试' })

      const found = store.getOrderById(order.id)
      expect(found).not.toBeNull()
      expect(found.productName).toBe('查找测试')
    })

    it('getOrderById 对不存在的ID应返回null', () => {
      const result = store.getOrderById('nonexistent_id')
      expect(result).toBeNull()
    })
  })

  /* ===== 业务逻辑：生产工单状态流转 ===== */
  describe('业务逻辑 - 生产工单状态流转', () => {
    it('完整正向流程: planned -> released -> in_progress -> quality_check -> completed', () => {
      const order = store.addProductionOrder({
        productName: '完整流程测试',
        quantity: 100,
        unitPrice: 5000
      })
      expect(order.status).toBe('planned')

      // 下达工单
      const releaseResult = store.releaseOrder(order.id)
      expect(releaseResult.success).toBe(true)
      expect(store.productionOrders[0].status).toBe('released')

      // 开始生产
      const startResult = store.startProduction(order.id)
      expect(startResult.success).toBe(true)
      expect(store.productionOrders[0].status).toBe('in_progress')
      expect(store.productionOrders[0].actualStartDate).toBeTruthy()
      expect(store.productionOrders[0].progress).toBe(10)

      // 质检
      const qcResult = store.qualityCheck(order.id)
      expect(qcResult.success).toBe(true)
      expect(store.productionOrders[0].status).toBe('quality_check')
      expect(store.productionOrders[0].progress).toBe(90)

      // 完成生产
      const completeResult = store.completeProduction(order.id)
      expect(completeResult.success).toBe(true)
      expect(store.productionOrders[0].status).toBe('completed')
      expect(store.productionOrders[0].actualEndDate).toBeTruthy()
      expect(store.productionOrders[0].progress).toBe(100)
    })

    it('取消流程: planned/released/in_progress/quality_check -> cancelled', () => {
      // 已计划可取消
      const o1 = store.addProductionOrder({ productName: '取消1' })
      expect(store.cancelProduction(o1.id).success).toBe(true)
      expect(store.productionOrders[0].status).toBe('cancelled')

      // 已下达可取消
      const o2 = store.addProductionOrder({ productName: '取消2' })
      store.releaseOrder(o2.id)
      expect(store.cancelProduction(o2.id).success).toBe(true)

      // 生产中可取消
      const o3 = store.addProductionOrder({ productName: '取消3' })
      store.releaseOrder(o3.id)
      store.startProduction(o3.id)
      expect(store.cancelProduction(o3.id).success).toBe(true)

      // 质检中可取消
      const o4 = store.addProductionOrder({ productName: '取消4' })
      store.releaseOrder(o4.id)
      store.startProduction(o4.id)
      store.qualityCheck(o4.id)
      expect(store.cancelProduction(o4.id).success).toBe(true)
    })

    it('已完成的工单不可取消', () => {
      const order = store.addProductionOrder({ productName: '完成不可取消' })
      store.releaseOrder(order.id)
      store.startProduction(order.id)
      store.qualityCheck(order.id)
      store.completeProduction(order.id)

      const result = store.cancelProduction(order.id)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('已取消的工单不可再次取消', () => {
      const order = store.addProductionOrder({ productName: '已取消' })
      store.cancelProduction(order.id)

      const result = store.cancelProduction(order.id)
      expect(result.success).toBe(false)
    })
  })

  /* ===== 异常情况：非法状态转换 ===== */
  describe('异常情况 - 非法状态转换', () => {
    it('下达非已计划工单应失败', () => {
      const order = store.addProductionOrder({ productName: '测试' })
      store.releaseOrder(order.id) // planned -> released

      const result = store.releaseOrder(order.id) // 再次下达应失败
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('开始生产非已下达工单应失败', () => {
      const order = store.addProductionOrder({ productName: '测试' })
      const result = store.startProduction(order.id)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('质检非生产中工单应失败', () => {
      const order = store.addProductionOrder({ productName: '测试' })
      const result = store.qualityCheck(order.id)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('完成非质检中工单应失败', () => {
      const order = store.addProductionOrder({ productName: '测试' })
      const result = store.completeProduction(order.id)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('对不存在的工单操作应返回错误', () => {
      expect(store.releaseOrder('nonexistent').success).toBe(false)
      expect(store.startProduction('nonexistent').success).toBe(false)
      expect(store.qualityCheck('nonexistent').success).toBe(false)
      expect(store.completeProduction('nonexistent').success).toBe(false)
      expect(store.cancelProduction('nonexistent').success).toBe(false)
    })
  })

  /* ===== 进度更新 ===== */
  describe('进度更新', () => {
    it('updateProgress 应更新工单进度', () => {
      const order = store.addProductionOrder({ productName: '进度测试' })
      const result = store.updateProgress(order.id, 50)

      expect(result).toBe(true)
      expect(store.productionOrders[0].progress).toBe(50)
    })

    it('updateProgress 进度上限为100', () => {
      const order = store.addProductionOrder({ productName: '上限测试' })
      store.updateProgress(order.id, 150)

      expect(store.productionOrders[0].progress).toBe(100)
    })

    it('updateProgress 进度下限为0', () => {
      const order = store.addProductionOrder({ productName: '下限测试' })
      store.updateProgress(order.id, -10)

      expect(store.productionOrders[0].progress).toBe(0)
    })

    it('updateProgress 对不存在的ID应返回false', () => {
      const result = store.updateProgress('nonexistent', 50)
      expect(result).toBe(false)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('activeOrders 应排除已取消工单', () => {
      store.addProductionOrder({ productName: '活跃1', status: 'planned' })
      store.addProductionOrder({ productName: '取消', status: 'cancelled' })
      store.addProductionOrder({ productName: '活跃2', status: 'in_progress' })

      expect(store.activeOrders).toHaveLength(2)
    })

    it('inProgressOrders 应只返回生产中工单', () => {
      store.addProductionOrder({ productName: '计划', status: 'planned' })
      store.addProductionOrder({ productName: '生产中', status: 'in_progress' })
      store.addProductionOrder({ productName: '生产中2', status: 'in_progress' })

      expect(store.inProgressOrders).toHaveLength(2)
    })

    it('orderStats 应正确统计各状态数量', () => {
      store.addProductionOrder({ productName: '计划1', status: 'planned' })
      store.addProductionOrder({ productName: '下达1', status: 'released' })
      store.addProductionOrder({ productName: '生产1', status: 'in_progress' })
      store.addProductionOrder({ productName: '完成1', status: 'completed' })
      store.addProductionOrder({ productName: '取消1', status: 'cancelled' })

      const stats = store.orderStats
      expect(stats.total).toBe(5)
      expect(stats.planned).toBe(1)
      expect(stats.released).toBe(1)
      expect(stats.inProgress).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.cancelled).toBe(1)
    })

    it('空数据时计算属性应为0或空数组', () => {
      expect(store.activeOrders).toHaveLength(0)
      expect(store.inProgressOrders).toHaveLength(0)
      expect(store.monthlyCompletedOrders).toHaveLength(0)
      expect(store.monthlyOutputValue).toBe(0)
      expect(store.orderStats.total).toBe(0)
    })

    it('monthlyOutputValue 应计算本月完成工单产值', () => {
      const now = new Date()
      const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

      store.addProductionOrder({
        productName: '本月完成',
        quantity: 10,
        unitPrice: 5000,
        status: 'completed',
        actualEndDate: ym + '-05'
      })
      store.addProductionOrder({
        productName: '上月完成',
        quantity: 20,
        unitPrice: 3000,
        status: 'completed',
        actualEndDate: '2024-05-10'
      })

      expect(store.monthlyOutputValue).toBe(50000) // 10 * 5000
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('addProductionOrder 可自定义 orderNo', () => {
      const order = store.addProductionOrder({
        productName: '自定义编号',
        orderNo: 'MO20260101001'
      })

      expect(order.orderNo).toBe('MO20260101001')
    })

    it('generateOrderNo 应生成正确格式', () => {
      const orderNo = store.generateOrderNo()
      expect(orderNo).toMatch(/^MO\d{11}$/)
    })

    it('空物料需求清单的工单应正常创建', () => {
      const order = store.addProductionOrder({
        productName: '无物料工单',
        materialRequisitions: []
      })

      expect(order.materialRequisitions).toEqual([])
    })

    it('releaseOrder 应返回物料短缺信息', () => {
      const order = store.addProductionOrder({
        productName: '物料检查',
        materialRequisitions: [
          { materialCode: 'MTL-001', materialName: 'ABS树脂', requiredQty: 1000, issuedQty: 0, unit: 'kg' }
        ]
      })

      const result = store.releaseOrder(order.id)
      // 即使库存不足，工单仍会下达（返回短缺信息）
      expect(result.success).toBe(true)
      expect(result.shortages).toBeDefined()
    })
  })

  /* ===== 数据持久化 ===== */
  describe('数据持久化', () => {
    it('addProductionOrder 后 localStorage 应更新', () => {
      store.addProductionOrder({ productName: '持久化测试' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_productionOrders'))
      expect(stored).toHaveLength(1)
      expect(stored[0].productName).toBe('持久化测试')
    })

    it('updateProductionOrder 后 localStorage 应更新', () => {
      const order = store.addProductionOrder({ productName: '原始' })
      store.updateProductionOrder(order.id, { productName: '更新后' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_productionOrders'))
      expect(stored[0].productName).toBe('更新后')
    })

    it('状态变更后 localStorage 应更新', () => {
      const order = store.addProductionOrder({ productName: '状态测试' })
      store.releaseOrder(order.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_productionOrders'))
      expect(stored[0].status).toBe('released')
    })

    it('进度更新后 localStorage 应更新', () => {
      const order = store.addProductionOrder({ productName: '进度持久化' })
      store.updateProgress(order.id, 75)

      const stored = JSON.parse(localStorage.getItem('gj_erp_productionOrders'))
      expect(stored[0].progress).toBe(75)
    })
  })

  /* ===== 种子数据 ===== */
  describe('种子数据', () => {
    it('initSeedData 应初始化预设生产工单', () => {
      store.initSeedData()

      expect(store.productionOrders.length).toBeGreaterThan(0)
      // 应包含不同状态的工单
      const statuses = store.productionOrders.map((o) => o.status)
      expect(statuses).toContain('in_progress')
      expect(statuses).toContain('completed')
    })

    it('initSeedData 应包含物料需求清单', () => {
      store.initSeedData()

      const ordersWithMaterials = store.productionOrders.filter((o) => o.materialRequisitions && o.materialRequisitions.length > 0)
      expect(ordersWithMaterials.length).toBeGreaterThan(0)
    })

    it('initSeedData 重复调用不应重复初始化', () => {
      store.initSeedData()
      const count1 = store.productionOrders.length

      store.initSeedData()
      const count2 = store.productionOrders.length

      expect(count1).toBe(count2)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(localStorage.getItem('gj_erp_production_initialized')).toBe('1')
    })

    it('initSeedData 后 localStorage 应包含数据', () => {
      store.initSeedData()

      const stored = JSON.parse(localStorage.getItem('gj_erp_productionOrders'))
      expect(stored.length).toBeGreaterThan(0)
    })

    it('initSeedData 工单应有完整字段', () => {
      store.initSeedData()

      const first = store.productionOrders[0]
      expect(first.id).toBeTruthy()
      expect(first.orderNo).toBeTruthy()
      expect(first.productName).toBeTruthy()
      expect(first.quantity).toBeGreaterThan(0)
      expect(first.status).toBeTruthy()
      expect(first.priority).toBeTruthy()
    })
  })
})
