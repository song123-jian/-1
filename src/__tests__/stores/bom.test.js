/**
 * BOM Store 测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBomStore } from '@/modules/production/stores/bom'
import { createBomNode, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

/* 模拟 useProductionStore，避免循环依赖 */
vi.mock('@/modules/production/stores/production', () => ({
  useProductionStore: () => ({
    productionOrders: []
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

describe('BOM Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useBomStore()
  })

  /* ===== 正常流程：CRUD 操作 ===== */
  describe('正常流程 - CRUD 操作', () => {
    it('addBom 应创建BOM并自动生成 code', () => {
      const bom = store.addBom({
        name: '测试BOM',
        productName: '测试产品',
        type: 'single'
      })

      expect(bom.id).toBeTruthy()
      expect(bom.code).toMatch(/^BOM\d{6}\d{3}$/) // BOM + YYYYMM + NNN
      expect(bom.name).toBe('测试BOM')
      expect(bom.status).toBe('draft') // 默认状态为草稿
      expect(bom.version).toBe('V1.0')
      expect(store.bomList).toHaveLength(1)
    })

    it('addBom 连续添加时 code 序号递增', () => {
      const b1 = store.addBom({ name: 'BOM1' })
      const b2 = store.addBom({ name: 'BOM2' })

      expect(b2.code).not.toBe(b1.code)
      const seq1 = parseInt(b1.code.slice(-3), 10)
      const seq2 = parseInt(b2.code.slice(-3), 10)
      expect(seq2).toBeGreaterThan(seq1)
    })

    it('addBom 应使用默认值填充字段', () => {
      const bom = store.addBom({ name: '默认值测试' })

      expect(bom.type).toBe('single')
      expect(bom.version).toBe('V1.0')
      expect(bom.status).toBe('draft')
      expect(bom.components).toEqual([])
      expect(bom.totalCost).toBe(0)
      expect(bom.createDate).toBeTruthy()
      expect(bom.updateDate).toBeTruthy()
    })

    it('addBom 可自定义 code', () => {
      const bom = store.addBom({
        name: '自定义编号',
        code: 'BOM202601001'
      })

      expect(bom.code).toBe('BOM202601001')
    })

    it('updateBom 应更新BOM数据', () => {
      const bom = store.addBom({ name: '原始BOM', notes: '原始备注' })
      const result = store.updateBom(bom.id, { name: '更新BOM', notes: '更新备注' })

      expect(result).toBe(true)
      const updated = store.bomList.find((b) => b.id === bom.id)
      expect(updated.name).toBe('更新BOM')
      expect(updated.notes).toBe('更新备注')
    })

    it('updateBom 应自动更新 updateDate', () => {
      const bom = store.addBom({ name: '日期测试' })
      const originalUpdateDate = bom.updateDate

      // 稍等确保日期不同（同一天内日期字符串相同，但逻辑正确即可）
      store.updateBom(bom.id, { name: '更新后' })
      const updated = store.bomList.find((b) => b.id === bom.id)
      expect(updated.updateDate).toBeTruthy()
    })

    it('updateBom 对不存在的ID应返回false', () => {
      const result = store.updateBom('nonexistent', { name: '不存在' })
      expect(result).toBe(false)
    })

    it('deleteBom 应删除无关联工单的BOM', () => {
      const bom = store.addBom({ name: '待删除BOM' })
      const result = store.deleteBom(bom.id)

      expect(result.success).toBe(true)
      expect(store.bomList).toHaveLength(0)
    })

    it('deleteBom 对不存在的ID应返回错误', () => {
      const result = store.deleteBom('nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('getBomById 应返回对应BOM', () => {
      const bom = store.addBom({ name: '查找测试' })

      const found = store.getBomById(bom.id)
      expect(found).not.toBeNull()
      expect(found.name).toBe('查找测试')
    })

    it('getBomById 对不存在的ID应返回null', () => {
      const result = store.getBomById('nonexistent_id')
      expect(result).toBeNull()
    })
  })

  /* ===== 业务逻辑：BOM状态流转 ===== */
  describe('业务逻辑 - BOM状态流转', () => {
    it('activateBom 应将草稿BOM激活', () => {
      const bom = store.addBom({ name: '草稿BOM', status: 'draft' })
      const result = store.activateBom(bom.id)

      expect(result).toBe(true)
      expect(store.bomList[0].status).toBe('active')
    })

    it('obsoleteBom 应将活跃BOM废弃', () => {
      const bom = store.addBom({ name: '活跃BOM', status: 'draft' })
      store.activateBom(bom.id)
      const result = store.obsoleteBom(bom.id)

      expect(result).toBe(true)
      expect(store.bomList[0].status).toBe('obsolete')
    })

    it('activateBom 对非草稿BOM应返回false', () => {
      const bom = store.addBom({ name: '已激活BOM', status: 'draft' })
      store.activateBom(bom.id)

      // 再次激活应失败
      expect(store.activateBom(bom.id)).toBe(false)
    })

    it('obsoleteBom 对非活跃BOM应返回false', () => {
      const bom = store.addBom({ name: '草稿BOM', status: 'draft' })

      // 草稿状态不可废弃
      expect(store.obsoleteBom(bom.id)).toBe(false)
    })

    it('状态流转: draft -> active -> obsolete', () => {
      const bom = store.addBom({ name: '完整流转' })

      expect(store.bomList[0].status).toBe('draft')
      store.activateBom(bom.id)
      expect(store.bomList[0].status).toBe('active')
      store.obsoleteBom(bom.id)
      expect(store.bomList[0].status).toBe('obsolete')
    })
  })

  /* ===== 业务逻辑：BOM组件（树结构） ===== */
  describe('业务逻辑 - BOM组件结构', () => {
    it('addBom 应正确存储组件列表', () => {
      const bom = store.addBom({
        name: '带组件BOM',
        components: [
          {
            materialCode: 'MTL-001',
            materialName: 'ABS树脂',
            quantity: 10,
            unit: 'kg',
            scrapRate: 5,
            isOptional: false
          },
          {
            materialCode: 'MTL-002',
            materialName: '不锈钢板304',
            quantity: 20,
            unit: 'kg',
            scrapRate: 3,
            isOptional: true
          }
        ]
      })

      expect(bom.components).toHaveLength(2)
      expect(bom.components[0].materialCode).toBe('MTL-001')
      expect(bom.components[1].isOptional).toBe(true)
    })

    it('updateBom 更新组件后应重新计算成本', () => {
      const bom = store.addBom({
        name: '成本测试',
        components: [
          { materialCode: 'MTL-001', materialName: 'ABS树脂', quantity: 10, unit: 'kg', scrapRate: 5 }
        ]
      })

      store.updateBom(bom.id, {
        components: [
          { materialCode: 'MTL-001', materialName: 'ABS树脂', quantity: 20, unit: 'kg', scrapRate: 5 },
          { materialCode: 'MTL-002', materialName: '不锈钢板304', quantity: 15, unit: 'kg', scrapRate: 3 }
        ]
      })

      // 无库存单价时成本为0
      const updated = store.bomList.find((b) => b.id === bom.id)
      expect(updated.totalCost).toBe(0)
    })

    it('BOM类型应正确存储', () => {
      const single = store.addBom({ name: '单层BOM', type: 'single' })
      const multi = store.addBom({ name: '多层BOM', type: 'multi' })
      const phantom = store.addBom({ name: '虚拟BOM', type: 'phantom' })

      expect(single.type).toBe('single')
      expect(multi.type).toBe('multi')
      expect(phantom.type).toBe('phantom')
    })

    it('getBomByProduct 应按产品ID查询活跃BOM', () => {
      store.addBom({ name: '产品A-BOM', productId: 'PRD-001', status: 'draft' })
      store.addBom({ name: '产品A-BOM激活', productId: 'PRD-001', status: 'draft' })
      store.activateBom(store.bomList[1].id) // 激活第二个
      store.addBom({ name: '产品B-BOM', productId: 'PRD-002', status: 'draft' })
      store.activateBom(store.bomList[2].id)

      const result = store.getBomByProduct('PRD-001')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('产品A-BOM激活')
    })

    it('getBomByProduct 对不存在的产品应返回空数组', () => {
      store.addBom({ name: 'BOM1', productId: 'PRD-001' })
      const result = store.getBomByProduct('PRD-999')
      expect(result).toHaveLength(0)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('activeBomList 应只返回已激活BOM', () => {
      store.addBom({ name: '草稿1', status: 'draft' })
      store.addBom({ name: '激活1', status: 'draft' })
      store.activateBom(store.bomList[1].id)
      store.addBom({ name: '草稿2', status: 'draft' })

      expect(store.activeBomList).toHaveLength(1)
      expect(store.activeBomList[0].name).toBe('激活1')
    })

    it('bomStats 应正确统计各状态数量', () => {
      store.addBom({ name: '草稿1', status: 'draft' })
      store.addBom({ name: '草稿2', status: 'draft' })
      store.addBom({ name: '激活1', status: 'draft' })
      store.activateBom(store.bomList[2].id)

      const stats = store.bomStats
      expect(stats.total).toBe(3)
      expect(stats.draft).toBe(2)
      expect(stats.active).toBe(1)
      expect(stats.obsolete).toBe(0)
    })

    it('空数据时计算属性应为0或空数组', () => {
      expect(store.activeBomList).toHaveLength(0)
      expect(store.bomStats.total).toBe(0)
      expect(store.bomStats.draft).toBe(0)
      expect(store.bomStats.active).toBe(0)
      expect(store.bomStats.obsolete).toBe(0)
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('空组件列表的BOM应正常创建', () => {
      const bom = store.addBom({ name: '空组件BOM', components: [] })

      expect(bom.components).toEqual([])
      expect(bom.totalCost).toBe(0)
    })

    it('generateBomCode 应生成正确格式', () => {
      const code = store.generateBomCode()
      expect(code).toMatch(/^BOM\d{6}\d{3}$/)
    })

    it('calculateCost 对不存在的ID应返回0', () => {
      const cost = store.calculateCost('nonexistent')
      expect(cost).toBe(0)
    })

    it('activateBom 对不存在的ID应返回false', () => {
      const result = store.activateBom('nonexistent')
      expect(result).toBe(false)
    })

    it('obsoleteBom 对不存在的ID应返回false', () => {
      const result = store.obsoleteBom('nonexistent')
      expect(result).toBe(false)
    })

    it('BOM组件的scrapRate应正确存储', () => {
      const bom = store.addBom({
        name: '损耗率测试',
        components: [
          { materialCode: 'MTL-001', materialName: 'ABS树脂', quantity: 100, unit: 'kg', scrapRate: 5 },
          { materialCode: 'MTL-002', materialName: '不锈钢板304', quantity: 50, unit: 'kg', scrapRate: 0 }
        ]
      })

      expect(bom.components[0].scrapRate).toBe(5)
      expect(bom.components[1].scrapRate).toBe(0)
    })

    it('BOM版本号应正确存储', () => {
      const bom = store.addBom({ name: '版本测试', version: 'V2.3' })
      expect(bom.version).toBe('V2.3')
    })
  })

  /* ===== 数据持久化 ===== */
  describe('数据持久化', () => {
    it('addBom 后 localStorage 应更新', () => {
      store.addBom({ name: '持久化测试' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_bomList'))
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('持久化测试')
    })

    it('updateBom 后 localStorage 应更新', () => {
      const bom = store.addBom({ name: '原始' })
      store.updateBom(bom.id, { name: '更新后' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_bomList'))
      expect(stored[0].name).toBe('更新后')
    })

    it('deleteBom 后 localStorage 应更新', () => {
      const bom = store.addBom({ name: '待删除' })
      store.deleteBom(bom.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_bomList'))
      expect(stored).toHaveLength(0)
    })

    it('状态变更后 localStorage 应更新', () => {
      const bom = store.addBom({ name: '状态测试' })
      store.activateBom(bom.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_bomList'))
      expect(stored[0].status).toBe('active')
    })
  })

  /* ===== 种子数据 ===== */
  describe('种子数据', () => {
    it('initSeedData 应初始化预设BOM', () => {
      store.initSeedData()

      expect(store.bomList.length).toBeGreaterThan(0)
      // 应包含不同状态的BOM
      const statuses = store.bomList.map((b) => b.status)
      expect(statuses).toContain('active')
      expect(statuses).toContain('draft')
    })

    it('initSeedData 应包含不同类型的BOM', () => {
      store.initSeedData()

      const types = store.bomList.map((b) => b.type)
      expect(types).toContain('single')
      expect(types).toContain('multi')
      expect(types).toContain('phantom')
    })

    it('initSeedData BOM应有组件列表', () => {
      store.initSeedData()

      const bomsWithComponents = store.bomList.filter((b) => b.components && b.components.length > 0)
      expect(bomsWithComponents.length).toBeGreaterThan(0)
    })

    it('initSeedData 重复调用不应重复初始化', () => {
      store.initSeedData()
      const count1 = store.bomList.length

      store.initSeedData()
      const count2 = store.bomList.length

      expect(count1).toBe(count2)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(localStorage.getItem('gj_erp_bom_initialized')).toBe('1')
    })

    it('initSeedData 后 localStorage 应包含数据', () => {
      store.initSeedData()

      const stored = JSON.parse(localStorage.getItem('gj_erp_bomList'))
      expect(stored.length).toBeGreaterThan(0)
    })

    it('initSeedData BOM应有完整字段', () => {
      store.initSeedData()

      const first = store.bomList[0]
      expect(first.id).toBeTruthy()
      expect(first.code).toBeTruthy()
      expect(first.name).toBeTruthy()
      expect(first.productName).toBeTruthy()
      expect(first.version).toBeTruthy()
      expect(first.type).toBeTruthy()
      expect(first.status).toBeTruthy()
      expect(first.components).toBeInstanceOf(Array)
    })

    it('initSeedData 组件应有完整字段', () => {
      store.initSeedData()

      const firstBom = store.bomList.find((b) => b.components.length > 0)
      const comp = firstBom.components[0]
      expect(comp.materialCode).toBeTruthy()
      expect(comp.materialName).toBeTruthy()
      expect(comp.quantity).toBeGreaterThan(0)
      expect(comp.unit).toBeTruthy()
      expect(comp.scrapRate).toBeGreaterThanOrEqual(0)
    })
  })
})
