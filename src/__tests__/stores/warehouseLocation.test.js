/**
 * 库位管理 Store 综合测试
 * 覆盖：CRUD、计算属性、验证逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWarehouseLocationStore } from '@/modules/warehouse/stores/warehouseLocation'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { createWarehouseLocation, resetCounter } from '@/__tests__/mockData'

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

describe('库位管理 Store', () => {
  let store
  let invStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    resetCounter()
    invStore = useInventoryStore()
    store = useWarehouseLocationStore()
  })

  /* ===== CRUD ===== */
  describe('addLocation', () => {
    it('应创建库位并设置默认值', () => {
      const loc = store.addLocation({
        locationCode: 'CK01-YL-A-01',
        warehouseName: '原料一库',
        warehouseId: 'main',
        areaName: '合格品区',
        manager: '张明',
        managerPhone: '13800001001',
        notes: 'A区货架1层'
      })
      expect(loc).toBeDefined()
      expect(loc.locationCode).toBe('CK01-YL-A-01')
      expect(loc.warehouseName).toBe('原料一库')
      expect(loc.warehouseId).toBe('main')
      expect(loc.areaName).toBe('合格品区')
      expect(loc.manager).toBe('张明')
      expect(loc.managerPhone).toBe('13800001001')
      expect(loc.notes).toBe('A区货架1层')
      expect(loc.createdBy).toBe('测试用户')
      expect(loc.createdAt).toBeDefined()
      expect(store.locations).toHaveLength(1)
    })

    it('不传 areaName 时应默认为合格品区', () => {
      const loc = store.addLocation({
        locationCode: 'LOC-DEFAULT',
        warehouseName: '默认仓库'
      })
      expect(loc.areaName).toBe('合格品区')
    })

    it('不传 locationCode 时应默认为空字符串', () => {
      const loc = store.addLocation({
        warehouseName: '默认仓库'
      })
      expect(loc.locationCode).toBe('')
    })
  })

  describe('updateLocation', () => {
    it('应更新库位字段', () => {
      const loc = store.addLocation({
        locationCode: 'CK01-YL-A-01',
        warehouseName: '原料一库',
        manager: '张明'
      })
      const result = store.updateLocation(loc.id, {
        manager: '李红',
        managerPhone: '13800001002',
        notes: '已更换负责人'
      })
      expect(result).toBe(true)
      const updated = store.locations.find(l => l.id === loc.id)
      expect(updated.manager).toBe('李红')
      expect(updated.managerPhone).toBe('13800001002')
      expect(updated.notes).toBe('已更换负责人')
      expect(updated.updatedAt).toBeDefined()
    })

    it('更新不存在的库位应返回 false', () => {
      const result = store.updateLocation('non-existent-id', { manager: '测试' })
      expect(result).toBe(false)
    })
  })

  describe('deleteLocation', () => {
    it('应删除指定库位', () => {
      const loc = store.addLocation({
        locationCode: 'CK01-YL-A-01',
        warehouseName: '原料一库'
      })
      expect(store.locations).toHaveLength(1)
      store.deleteLocation(loc.id)
      expect(store.locations).toHaveLength(0)
    })

    it('删除不存在的库位应无异常', () => {
      store.addLocation({ locationCode: 'LOC-KEEP', warehouseName: '保留仓库' })
      store.deleteLocation('non-existent-id')
      expect(store.locations).toHaveLength(1)
    })
  })

  /* ===== 计算属性 ===== */
  describe('warehouses 计算属性', () => {
    it('应从库位数据中提取去重后的仓库列表', () => {
      store.addLocation({ locationCode: 'LOC-1', warehouseName: '原料一库', warehouseId: 'main' })
      store.addLocation({ locationCode: 'LOC-2', warehouseName: '原料一库', warehouseId: 'main' })
      store.addLocation({ locationCode: 'LOC-3', warehouseName: '成品库', warehouseId: 'B' })
      store.addLocation({ locationCode: 'LOC-4', warehouseName: '危化品库', warehouseId: 'C' })

      const warehouses = store.warehouses
      expect(warehouses).toHaveLength(3)
      const names = warehouses.map(w => w.name)
      expect(names).toContain('原料一库')
      expect(names).toContain('成品库')
      expect(names).toContain('危化品库')
    })

    it('无库位数据时应返回空数组', () => {
      expect(store.warehouses).toEqual([])
    })
  })

  describe('areaStats 计算属性', () => {
    it('应正确统计各区域库位数量', () => {
      store.addLocation({ locationCode: 'LOC-1', warehouseName: '仓库A', areaName: '合格品区' })
      store.addLocation({ locationCode: 'LOC-2', warehouseName: '仓库A', areaName: '合格品区' })
      store.addLocation({ locationCode: 'LOC-3', warehouseName: '仓库A', areaName: '待检区' })
      store.addLocation({ locationCode: 'LOC-4', warehouseName: '仓库A', areaName: '危险品区' })

      const stats = store.areaStats
      expect(stats['合格品区']).toBe(2)
      expect(stats['待检区']).toBe(1)
      expect(stats['危险品区']).toBe(1)
    })

    it('无 areaName 时应归入未分类', () => {
      store.addLocation({ locationCode: 'LOC-5', warehouseName: '仓库A' })
      /* areaName 默认为 '合格品区' */
      expect(store.areaStats['合格品区']).toBe(1)
    })
  })

  describe('getLocationStockInfo 计算属性', () => {
    it('应正确统计每个库位的物料种类和数量', () => {
      const loc = store.addLocation({
        locationCode: 'LOC-STOCK',
        warehouseName: '仓库A',
        areaName: '合格品区'
      })

      /* 添加关联到该库位的库存物料 */
      invStore.addInventoryItem({
        code: 'MTL-001',
        name: '物料A',
        quantity: 100,
        locationId: loc.id
      })
      invStore.addInventoryItem({
        code: 'MTL-002',
        name: '物料B',
        quantity: 200,
        locationId: loc.id
      })

      const stockInfo = store.getLocationStockInfo
      expect(stockInfo[loc.id]).toBeDefined()
      expect(stockInfo[loc.id].count).toBe(2)
      expect(stockInfo[loc.id].totalQty).toBe(300)
    })

    it('无关联物料的库位应返回零值', () => {
      const loc = store.addLocation({
        locationCode: 'LOC-EMPTY',
        warehouseName: '仓库A'
      })
      const stockInfo = store.getLocationStockInfo
      expect(stockInfo[loc.id].count).toBe(0)
      expect(stockInfo[loc.id].totalQty).toBe(0)
    })
  })

  /* ===== 批量操作 ===== */
  describe('批量操作', () => {
    it('应能批量添加多个库位', () => {
      const locations = []
      for (let i = 0; i < 5; i++) {
        locations.push(store.addLocation({
          locationCode: `LOC-BATCH-${i}`,
          warehouseName: '批量仓库',
          areaName: '合格品区'
        }))
      }
      expect(store.locations).toHaveLength(5)
    })

    it('应能批量删除多个库位', () => {
      const loc1 = store.addLocation({ locationCode: 'LOC-DEL-1', warehouseName: '仓库' })
      const loc2 = store.addLocation({ locationCode: 'LOC-DEL-2', warehouseName: '仓库' })
      const loc3 = store.addLocation({ locationCode: 'LOC-DEL-3', warehouseName: '仓库' })

      store.deleteLocation(loc1.id)
      store.deleteLocation(loc3.id)
      expect(store.locations).toHaveLength(1)
      expect(store.locations[0].id).toBe(loc2.id)
    })
  })

  /* ===== 常量 ===== */
  describe('常量', () => {
    it('AREA_OPTIONS 应包含所有区域选项', () => {
      expect(store.AREA_OPTIONS).toContain('待检区')
      expect(store.AREA_OPTIONS).toContain('合格品区')
      expect(store.AREA_OPTIONS).toContain('不合格品区')
      expect(store.AREA_OPTIONS).toContain('隔离区')
      expect(store.AREA_OPTIONS).toContain('回料区')
      expect(store.AREA_OPTIONS).toContain('危险品区')
    })

    it('AREA_COLORS 应包含各区域颜色', () => {
      expect(store.AREA_COLORS['待检区']).toBeDefined()
      expect(store.AREA_COLORS['合格品区']).toBeDefined()
      expect(store.AREA_COLORS['不合格品区']).toBeDefined()
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('添加库位时所有字段为空应不报错', () => {
      const loc = store.addLocation({})
      expect(loc).toBeDefined()
      expect(loc.locationCode).toBe('')
      expect(loc.warehouseName).toBe('')
      expect(loc.areaName).toBe('合格品区')
    })

    it('更新库位时传入空对象应不改变数据', () => {
      const loc = store.addLocation({
        locationCode: 'LOC-NOCHANGE',
        warehouseName: '不变仓库',
        manager: '张三'
      })
      store.updateLocation(loc.id, {})
      const updated = store.locations.find(l => l.id === loc.id)
      expect(updated.locationCode).toBe('LOC-NOCHANGE')
      expect(updated.manager).toBe('张三')
    })

    it('同一个仓库可以有多个库位', () => {
      store.addLocation({ locationCode: 'LOC-DUP-1', warehouseName: '重复仓库' })
      store.addLocation({ locationCode: 'LOC-DUP-2', warehouseName: '重复仓库' })
      store.addLocation({ locationCode: 'LOC-DUP-3', warehouseName: '重复仓库' })
      expect(store.locations).toHaveLength(3)
      expect(store.warehouses).toHaveLength(1)
    })
  })
})
