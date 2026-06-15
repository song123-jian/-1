/**
 * 库存 Store 深度测试
 * 覆盖安全库存预警、超卖防护、批次追踪、审计日志完整性、回收站恢复
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* ===== Mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn(),
    isDeletedId: vi.fn(() => false)
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '管理员'
  })
}))

describe('库存 Store 深度测试', () => {
  let store

  beforeEach(() => {
    clearStorage()
    setupPinia()
    store = useInventoryStore()
  })

  /* ==================== WH-01: 安全库存预警 ==================== */
  describe('WH-01: 安全库存预警', () => {
    it('库存量低于安全库存时状态为 low', () => {
      const item = store.addInventoryItem({
        code: 'MTL-LOW-001',
        name: '低库存物料',
        quantity: 30,
        safetyStock: 50,
        unitCost: 100
      })
      expect(item.status).toBe('low')
    })

    it('库存量等于安全库存时状态为 low', () => {
      const item = store.addInventoryItem({
        code: 'MTL-EQUAL-001',
        name: '临界库存物料',
        quantity: 50,
        safetyStock: 50,
        unitCost: 100
      })
      expect(item.status).toBe('low')
    })

    it('库存量为0时状态为 exhausted', () => {
      const item = store.addInventoryItem({
        code: 'MTL-ZERO-001',
        name: '耗尽物料',
        quantity: 0,
        safetyStock: 50,
        unitCost: 100
      })
      expect(item.status).toBe('exhausted')
    })

    it('库存量高于安全库存时状态为 normal', () => {
      const item = store.addInventoryItem({
        code: 'MTL-OK-001',
        name: '正常物料',
        quantity: 200,
        safetyStock: 50,
        unitCost: 100
      })
      expect(item.status).toBe('normal')
    })

    it('enrichedInventory 正确标记 alertStatus', () => {
      store.addInventoryItem({ code: 'MTL-A1', name: '低库存', quantity: 10, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-A2', name: '耗尽', quantity: 0, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-A3', name: '正常', quantity: 200, safetyStock: 50, unitCost: 100 })

      const lowItems = store.enrichedInventory.filter(i => i.alertStatus === 'low')
      const exhaustedItems = store.enrichedInventory.filter(i => i.alertStatus === 'exhausted')
      const okItems = store.enrichedInventory.filter(i => i.alertStatus === 'ok')

      expect(lowItems).toHaveLength(1)
      expect(exhaustedItems).toHaveLength(1)
      expect(okItems).toHaveLength(1)
    })

    it('lowStockCount 和 exhaustedCount 计算正确', () => {
      store.addInventoryItem({ code: 'MTL-C1', name: '低1', quantity: 10, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-C2', name: '低2', quantity: 30, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-C3', name: '耗尽', quantity: 0, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-C4', name: '正常', quantity: 200, safetyStock: 50, unitCost: 100 })

      expect(store.lowStockCount).toBe(2)
      expect(store.exhaustedCount).toBe(1)
    })

    it('alertItems 返回低库存和耗尽物料', () => {
      store.addInventoryItem({ code: 'MTL-D1', name: '低', quantity: 10, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-D2', name: '耗尽', quantity: 0, safetyStock: 50, unitCost: 100 })
      store.addInventoryItem({ code: 'MTL-D3', name: '正常', quantity: 200, safetyStock: 50, unitCost: 100 })

      expect(store.alertItems).toHaveLength(2)
    })

    it('库存调整后状态自动更新', () => {
      const item = store.addInventoryItem({
        code: 'MTL-ADJ-001',
        name: '调整物料',
        quantity: 200,
        safetyStock: 50,
        unitCost: 100
      })
      expect(item.status).toBe('normal')

      /* 调整库存到低于安全库存 */
      store.adjustStock('MTL-ADJ-001', -180, 'out', '测试调整')
      const updated = store.inventory.find(i => i.code === 'MTL-ADJ-001')
      expect(updated.quantity).toBe(20)
      expect(updated.status).toBe('low')
    })
  })

  /* ==================== WH-02: 超卖防护 ==================== */
  describe('WH-02: 超卖防护', () => {
    it('出库数量超过当前库存时提交失败', () => {
      store.addInventoryItem({
        code: 'MTL-OVERSELL-001',
        name: '超卖测试物料',
        quantity: 100,
        safetyStock: 10,
        unitCost: 50
      })

      const result = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-OVERSELL-001',
        materialName: '超卖测试物料',
        outQty: 200
      })
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('库存不足'))).toBe(true)
    })

    it('出库数量等于当前库存时提交成功', () => {
      store.addInventoryItem({
        code: 'MTL-EXACT-001',
        name: '精确出库物料',
        quantity: 100,
        safetyStock: 10,
        unitCost: 50
      })

      const result = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-EXACT-001',
        materialName: '精确出库物料',
        outQty: 100
      })
      expect(result.success).toBe(true)
    })

    it('确认出库时再次检查库存不足', () => {
      store.addInventoryItem({
        code: 'MTL-CONFIRM-001',
        name: '确认出库物料',
        quantity: 100,
        safetyStock: 10,
        unitCost: 50
      })

      /* 提交出库单 */
      const submitResult = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-CONFIRM-001',
        materialName: '确认出库物料',
        outQty: 80
      })
      expect(submitResult.success).toBe(true)

      /* 审核通过 */
      const approveResult = store.approveOutbound(submitResult.order.id)
      expect(approveResult.success).toBe(true)

      /* 在确认出库前手动减少库存 */
      store.adjustStock('MTL-CONFIRM-001', -50, 'out', '手动扣减')

      /* 确认出库时应因库存不足而失败 */
      const confirmResult = store.confirmOutbound(submitResult.order.id)
      expect(confirmResult.success).toBe(false)
      expect(confirmResult.error).toContain('库存不足')
    })

    it('确认出库后库存正确减少', () => {
      store.addInventoryItem({
        code: 'MTL-OUT-001',
        name: '正常出库物料',
        quantity: 500,
        safetyStock: 50,
        unitCost: 100
      })

      /* 提交 -> 审核 -> 确认 */
      const submitResult = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-OUT-001',
        materialName: '正常出库物料',
        outQty: 200
      })
      store.approveOutbound(submitResult.order.id)
      store.confirmOutbound(submitResult.order.id)

      const item = store.inventory.find(i => i.code === 'MTL-OUT-001')
      expect(item.quantity).toBe(300)
    })
  })

  /* ==================== WH-03: 批次追踪 ==================== */
  describe('WH-03: 批次追踪', () => {
    it('同一物料3批次入库', () => {
      const materialCode = 'MTL-BATCH-001'

      /* 创建初始库存物料 */
      store.addInventoryItem({
        code: materialCode,
        name: '批次测试物料',
        quantity: 0,
        safetyStock: 10,
        unitCost: 100
      })

      /* 批次1：入库100 */
      const batch1 = store.submitInboundOrder({
        date: '2026-06-01',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: materialCode, name: '批次测试物料', qty: 100, cost: 100 }]
      })
      expect(batch1.success).toBe(true)
      store.confirmInbound(batch1.order.id)

      let item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(100)

      /* 批次2：入库200 */
      const batch2 = store.submitInboundOrder({
        date: '2026-06-05',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: materialCode, name: '批次测试物料', qty: 200, cost: 100 }]
      })
      expect(batch2.success).toBe(true)
      store.confirmInbound(batch2.order.id)

      item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(300)

      /* 批次3：入库150 */
      const batch3 = store.submitInboundOrder({
        date: '2026-06-10',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: materialCode, name: '批次测试物料', qty: 150, cost: 100 }]
      })
      expect(batch3.success).toBe(true)
      store.confirmInbound(batch3.order.id)

      item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(450)
    })

    it('同一物料3批次出库', () => {
      const materialCode = 'MTL-BATCH-OUT-001'

      /* 创建初始库存 */
      store.addInventoryItem({
        code: materialCode,
        name: '批次出库物料',
        quantity: 500,
        safetyStock: 10,
        unitCost: 100
      })

      /* 出库批次1：100 */
      const out1 = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode,
        materialName: '批次出库物料',
        outQty: 100
      })
      store.approveOutbound(out1.order.id)
      store.confirmOutbound(out1.order.id)

      let item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(400)

      /* 出库批次2：150 */
      const out2 = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode,
        materialName: '批次出库物料',
        outQty: 150
      })
      store.approveOutbound(out2.order.id)
      store.confirmOutbound(out2.order.id)

      item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(250)

      /* 出库批次3：200 */
      const out3 = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode,
        materialName: '批次出库物料',
        outQty: 200
      })
      store.approveOutbound(out3.order.id)
      store.confirmOutbound(out3.order.id)

      item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(50)
    })

    it('3批次入库后3批次出库，最终库存正确', () => {
      const materialCode = 'MTL-FULL-BATCH-001'

      store.addInventoryItem({
        code: materialCode,
        name: '全批次物料',
        quantity: 0,
        safetyStock: 10,
        unitCost: 80
      })

      /* 入库3批次 */
      const quantities = [100, 200, 300]
      for (const qty of quantities) {
        const order = store.submitInboundOrder({
          date: '2026-06-15',
          type: 'purchase',
          counterpartyId: 's1',
          counterpartyName: '供应商1',
          _items: [{ code: materialCode, name: '全批次物料', qty, cost: 80 }]
        })
        store.confirmInbound(order.order.id)
      }

      let item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(600)

      /* 出库3批次 */
      const outQuantities = [50, 100, 200]
      for (const qty of outQuantities) {
        const order = store.submitOutboundOrder({
          date: '2026-06-15',
          outType: 'sales',
          materialCode,
          materialName: '全批次物料',
          outQty: qty
        })
        store.approveOutbound(order.order.id)
        store.confirmOutbound(order.order.id)
      }

      item = store.inventory.find(i => i.code === materialCode)
      expect(item.quantity).toBe(250)
    })
  })

  /* ==================== WH-04: 审计日志完整性 ==================== */
  describe('WH-04: 审计日志完整性', () => {
    it('500次连续调整均产生审计日志', () => {
      store.addInventoryItem({
        code: 'MTL-AUDIT-001',
        name: '审计测试物料',
        quantity: 10000,
        safetyStock: 10,
        unitCost: 50
      })

      for (let i = 0; i < 500; i++) {
        store.addAuditLog('adjust', 'inventory', `调整库存 #${i + 1}`, { delta: -1, seq: i + 1 })
      }

      expect(store.auditLogs).toHaveLength(500)
    })

    it('审计日志按时间倒序排列', () => {
      store.addInventoryItem({
        code: 'MTL-AUDIT-002',
        name: '审计排序物料',
        quantity: 1000,
        safetyStock: 10,
        unitCost: 50
      })

      store.addAuditLog('adjust', 'inventory', '第一条日志')
      store.addAuditLog('adjust', 'inventory', '第二条日志')
      store.addAuditLog('adjust', 'inventory', '第三条日志')

      /* addAuditLog 使用 unshift，最新在前 */
      expect(store.auditLogs[0].detail).toBe('第三条日志')
      expect(store.auditLogs[2].detail).toBe('第一条日志')
    })

    it('审计日志超过500条时自动截断', () => {
      store.addInventoryItem({
        code: 'MTL-AUDIT-003',
        name: '截断测试物料',
        quantity: 100000,
        safetyStock: 10,
        unitCost: 1
      })

      for (let i = 0; i < 600; i++) {
        store.addAuditLog('adjust', 'inventory', `日志 #${i + 1}`)
      }

      /* 超过500条时截断为500 */
      expect(store.auditLogs).toHaveLength(500)
    })

    it('审计日志包含必要字段', () => {
      store.addAuditLog('create', 'inbound', '创建入库单', { orderNo: 'RK001' })

      const log = store.auditLogs[0]
      expect(log.id).toBeTruthy()
      expect(log.time).toBeTruthy()
      expect(log.user).toBe('管理员')
      expect(log.action).toBe('create')
      expect(log.module).toBe('inbound')
      expect(log.detail).toBe('创建入库单')
      expect(log.orderNo).toBe('RK001')
    })
  })

  /* ==================== WH-05: 回收站恢复 ==================== */
  describe('WH-05: 回收站恢复', () => {
    it('删除入库单后进入回收站', () => {
      const order = store.submitInboundOrder({
        date: '2026-06-15',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: 'MTL-RECYCLE-001', name: '回收测试物料', qty: 100, cost: 50 }]
      })
      expect(order.success).toBe(true)

      store.deleteInboundOrder(order.order.id)
      expect(store.recycleBin).toHaveLength(1)
      expect(store.recycleBin[0].id).toBe(order.order.id)
      expect(store.recycleBin[0]._type).toBe('inbound')
    })

    it('从回收站恢复入库单', () => {
      const order = store.submitInboundOrder({
        date: '2026-06-15',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: 'MTL-RESTORE-001', name: '恢复测试物料', qty: 100, cost: 50 }]
      })

      store.deleteInboundOrder(order.order.id)
      expect(store.recycleBin).toHaveLength(1)

      const result = store.restoreFromRecycleBin(order.order.id)
      expect(result).toBe(true)
      expect(store.recycleBin).toHaveLength(0)
      /* 恢复后应重新出现在 warehouseOrders 中 */
      const restored = store.warehouseOrders.find(o => o.id === order.order.id)
      expect(restored).toBeDefined()
    })

    it('删除出库单后进入回收站', () => {
      store.addInventoryItem({
        code: 'MTL-OUT-RECYCLE-001',
        name: '出库回收物料',
        quantity: 500,
        safetyStock: 10,
        unitCost: 100
      })

      const order = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-OUT-RECYCLE-001',
        materialName: '出库回收物料',
        outQty: 100
      })
      expect(order.success).toBe(true)

      store.deleteOutboundOrder(order.order.id)
      expect(store.recycleBin).toHaveLength(1)
      expect(store.recycleBin[0]._type).toBe('outbound')
    })

    it('从回收站恢复出库单', () => {
      store.addInventoryItem({
        code: 'MTL-OUT-RESTORE-001',
        name: '出库恢复物料',
        quantity: 500,
        safetyStock: 10,
        unitCost: 100
      })

      const order = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-OUT-RESTORE-001',
        materialName: '出库恢复物料',
        outQty: 100
      })

      store.deleteOutboundOrder(order.order.id)
      const result = store.restoreFromRecycleBin(order.order.id)
      expect(result).toBe(true)
      expect(store.recycleBin).toHaveLength(0)
    })

    it('恢复不存在的回收站项目返回 false', () => {
      const result = store.restoreFromRecycleBin('nonexistent-id')
      expect(result).toBe(false)
    })

    it('永久删除回收站项目', () => {
      const order = store.submitInboundOrder({
        date: '2026-06-15',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: 'MTL-PERM-001', name: '永久删除物料', qty: 50, cost: 30 }]
      })

      store.deleteInboundOrder(order.order.id)
      expect(store.recycleBin).toHaveLength(1)

      store.permanentDeleteFromRecycleBin(order.order.id)
      expect(store.recycleBin).toHaveLength(0)
    })

    it('清空回收站', () => {
      /* 添加入库单和出库单然后删除 */
      store.addInventoryItem({
        code: 'MTL-EMPTY-001',
        name: '清空回收站物料',
        quantity: 1000,
        safetyStock: 10,
        unitCost: 50
      })

      const inOrder = store.submitInboundOrder({
        date: '2026-06-15',
        type: 'purchase',
        counterpartyId: 's1',
        counterpartyName: '供应商1',
        _items: [{ code: 'MTL-EMPTY-001', name: '清空回收站物料', qty: 100, cost: 50 }]
      })
      const outOrder = store.submitOutboundOrder({
        date: '2026-06-15',
        outType: 'sales',
        materialCode: 'MTL-EMPTY-001',
        materialName: '清空回收站物料',
        outQty: 50
      })

      store.deleteInboundOrder(inOrder.order.id)
      store.deleteOutboundOrder(outOrder.order.id)
      expect(store.recycleBin).toHaveLength(2)

      store.emptyRecycleBin()
      expect(store.recycleBin).toHaveLength(0)
    })

    it('批量删除入库单进入回收站', () => {
      const ids = []
      for (let i = 0; i < 5; i++) {
        const order = store.submitInboundOrder({
          date: '2026-06-15',
          type: 'purchase',
          counterpartyId: 's1',
          counterpartyName: '供应商1',
          _items: [{ code: `MTL-BATCH-DEL-${i}`, name: `批量删除物料${i}`, qty: 10, cost: 20 }]
        })
        ids.push(order.order.id)
      }

      const removedCount = store.batchDeleteInboundOrders(ids)
      expect(removedCount).toBe(5)
      expect(store.recycleBin).toHaveLength(5)
    })
  })
})
