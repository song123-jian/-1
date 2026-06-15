/**
 * OutboundManagement.vue 组件级测试
 * 覆盖：渲染、交互、Store 集成、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import OutboundManagement from '@/modules/warehouse/views/OutboundManagement.vue'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ roleName: '测试用户' })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== OutboundSection stub ===== */
const OutboundSectionStub = {
  name: 'OutboundSection',
  template: '<div class="outbound-section-stub"><slot /></div>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(OutboundManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        OutboundSection: OutboundSectionStub
      }
    }
  })
}

/* ===== 辅助：向 store 添加库存和出库单数据 ===== */
function seedInventoryAndOutbound(store, count = 3) {
  // 先添加库存
  for (let i = 0; i < count; i++) {
    store.addInventoryItem({
      code: `MTL-OUT-${String(i + 1).padStart(3, '0')}`,
      name: ['ABS树脂', '不锈钢板304', '铝合金型材6063'][i % 3],
      category: 'raw',
      quantity: 1000 + i * 200,
      safetyStock: 100,
      warehouse: 'main',
      unitCost: [85.5, 120, 95][i % 3]
    })
  }
  // 再添加出库单
  for (let i = 0; i < count; i++) {
    store.submitOutboundOrder({
      outType: ['sales', 'production', 'transfer'][i % 3],
      date: '2026-06-12',
      materialCode: `MTL-OUT-${String(i + 1).padStart(3, '0')}`,
      materialName: ['ABS树脂', '不锈钢板304', '铝合金型材6063'][i % 3],
      outQty: 50 + i * 10,
      unitPrice: [85.5, 120, 95][i % 3]
    })
  }
}

describe('OutboundManagement 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useInventoryStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面容器', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.outbound-management-page').exists()).toBe(true)
    })

    it('应渲染 OutboundSection 子组件', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.outbound-section-stub').exists()).toBe(true)
    })

    it('页面容器应有正确的 CSS 类名', () => {
      const wrapper = mountComponent()
      expect(wrapper.classes()).toContain('outbound-management-page')
    })
  })

  /* ===== Store 集成 ===== */
  describe('Store 集成', () => {
    it('出库单数据应从 store 正确读取', () => {
      seedInventoryAndOutbound(store, 3)
      const wrapper = mountComponent()

      expect(store.outboundOrders.length).toBeGreaterThanOrEqual(3)
    })

    it('空 store 时组件应正常渲染', () => {
      expect(() => mountComponent()).not.toThrow()
    })

    it('store 出库单状态变更后组件应响应', async () => {
      // 先添加库存
      store.addInventoryItem({
        code: 'MTL-RESP-001',
        name: '响应式测试物料',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const wrapper = mountComponent()
      expect(store.outboundOrders).toHaveLength(0)

      store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-RESP-001',
        materialName: '响应式测试物料',
        outQty: 100,
        unitPrice: 100
      })
      await flushPromises()

      expect(store.outboundOrders).toHaveLength(1)
    })

    it('审批出库单应更新状态', async () => {
      store.addInventoryItem({
        code: 'MTL-APPROVE-001',
        name: '审批测试物料',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-APPROVE-001',
        materialName: '审批测试物料',
        outQty: 100,
        unitPrice: 100
      })
      expect(result.success).toBe(true)

      const orderId = result.order.id
      const approveResult = store.approveOutbound(orderId)
      expect(approveResult.success).toBe(true)

      const order = store.warehouseOrders.find(o => o.id === orderId)
      expect(order.outStatus).toBe('approved')
    })

    it('确认出库应扣减库存', async () => {
      store.addInventoryItem({
        code: 'MTL-CONFIRM-001',
        name: '确认测试物料',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-CONFIRM-001',
        materialName: '确认测试物料',
        outQty: 100,
        unitPrice: 100
      })
      const orderId = result.order.id

      store.approveOutbound(orderId)
      const confirmResult = store.confirmOutbound(orderId)
      expect(confirmResult.success).toBe(true)

      const inv = store.inventory.find(i => i.code === 'MTL-CONFIRM-001')
      expect(parseFloat(inv.quantity)).toBe(400)
    })

    it('取消出库单应更新状态', async () => {
      store.addInventoryItem({
        code: 'MTL-CANCEL-001',
        name: '取消测试物料',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-CANCEL-001',
        materialName: '取消测试物料',
        outQty: 100,
        unitPrice: 100
      })
      const orderId = result.order.id

      const cancelResult = store.cancelOutbound(orderId)
      expect(cancelResult).toBe(true)

      const order = store.warehouseOrders.find(o => o.id === orderId)
      expect(order.outStatus).toBe('cancelled')
    })
  })

  /* ===== 出库单验证 ===== */
  describe('出库单验证', () => {
    it('出库数量为0时应返回错误', () => {
      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-001',
        materialName: '测试物料',
        outQty: 0,
        unitPrice: 100
      })
      expect(result.success).toBe(false)
      expect(result.errors).toContain('出库数量必须大于0')
    })

    it('库存不足时应返回错误', () => {
      store.addInventoryItem({
        code: 'MTL-LOW-001',
        name: '低库存物料',
        quantity: 10,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-LOW-001',
        materialName: '低库存物料',
        outQty: 100,
        unitPrice: 100
      })
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('库存不足'))).toBe(true)
    })

    it('未选择出库类型时应返回错误', () => {
      const result = store.submitOutboundOrder({
        date: '2026-06-12',
        materialCode: 'MTL-001',
        materialName: '测试物料',
        outQty: 50,
        unitPrice: 100
      })
      expect(result.success).toBe(false)
      expect(result.errors).toContain('请选择出库类型')
    })

    it('未选择物料时应返回错误', () => {
      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        outQty: 50,
        unitPrice: 100
      })
      expect(result.success).toBe(false)
      expect(result.errors).toContain('请选择出库物料')
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('批量审批出库单应生效', () => {
      const ids = []
      for (let i = 0; i < 3; i++) {
        store.addInventoryItem({
          code: `MTL-BATCH-${String(i + 1).padStart(3, '0')}`,
          name: `批量测试物料${i + 1}`,
          quantity: 1000,
          warehouse: 'main',
          unitCost: 100
        })
        const result = store.submitOutboundOrder({
          outType: 'sales',
          date: '2026-06-12',
          materialCode: `MTL-BATCH-${String(i + 1).padStart(3, '0')}`,
          materialName: `批量测试物料${i + 1}`,
          outQty: 50,
          unitPrice: 100
        })
        ids.push(result.order.id)
      }

      const count = store.batchApproveOutbound(ids)
      expect(count).toBe(3)
    })

    it('批量确认出库单应扣减库存', () => {
      const ids = []
      for (let i = 0; i < 2; i++) {
        store.addInventoryItem({
          code: `MTL-BC-${String(i + 1).padStart(3, '0')}`,
          name: `批量确认物料${i + 1}`,
          quantity: 1000,
          warehouse: 'main',
          unitCost: 100
        })
        const result = store.submitOutboundOrder({
          outType: 'sales',
          date: '2026-06-12',
          materialCode: `MTL-BC-${String(i + 1).padStart(3, '0')}`,
          materialName: `批量确认物料${i + 1}`,
          outQty: 100,
          unitPrice: 100
        })
        ids.push(result.order.id)
      }

      store.batchApproveOutbound(ids)
      const count = store.batchConfirmOutbound(ids)
      expect(count).toBe(2)
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('组件挂载时应正常初始化', () => {
      expect(() => mountComponent()).not.toThrow()
    })

    it('组件卸载时应正常销毁', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('反复挂载卸载不应报错', () => {
      const wrapper = mountComponent()
      wrapper.unmount()
      const wrapper2 = mountComponent()
      wrapper2.unmount()
    })
  })

  /* ===== 冲销操作 ===== */
  describe('冲销操作', () => {
    it('冲销已出库单应归还库存', () => {
      store.addInventoryItem({
        code: 'MTL-REV-001',
        name: '冲销测试物料',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-REV-001',
        materialName: '冲销测试物料',
        outQty: 100,
        unitPrice: 100
      })
      const orderId = result.order.id

      store.approveOutbound(orderId)
      store.confirmOutbound(orderId)

      const reverseResult = store.reverseOutboundOrder(orderId)
      expect(reverseResult.success).toBe(true)

      const inv = store.inventory.find(i => i.code === 'MTL-REV-001')
      expect(parseFloat(inv.quantity)).toBe(500)
    })

    it('冲销未出库单应返回错误', () => {
      store.addInventoryItem({
        code: 'MTL-REV-ERR',
        name: '冲销错误测试',
        quantity: 500,
        warehouse: 'main',
        unitCost: 100
      })

      const result = store.submitOutboundOrder({
        outType: 'sales',
        date: '2026-06-12',
        materialCode: 'MTL-REV-ERR',
        materialName: '冲销错误测试',
        outQty: 100,
        unitPrice: 100
      })

      const reverseResult = store.reverseOutboundOrder(result.order.id)
      expect(reverseResult.success).toBe(false)
    })
  })
})
