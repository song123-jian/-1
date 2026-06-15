/**
 * 供应商 Store 测试
 * 覆盖：正常流程、业务逻辑、边界条件、异常情况、数据持久化、种子数据
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'
import { createSupplier, createSuppliers, resetCounter } from '@/__tests__/mockData'
import { setupPinia, clearStorage } from '@/__tests__/setup'

describe('供应商 Store', () => {
  let store

  beforeEach(() => {
    clearStorage()
    resetCounter()
    setupPinia()
    store = useSupplierStore()
  })

  /* ===== 正常流程：CRUD 操作 ===== */
  describe('正常流程 - CRUD 操作', () => {
    it('addSupplier 应创建供应商并自动生成 code', () => {
      const supplier = store.addSupplier({
        name: '测试供应商有限公司',
        shortName: '测试供应',
        category: '原材料',
        contact: '张经理',
        phone: '0512-12345678'
      })

      expect(supplier.id).toBeTruthy()
      expect(supplier.code).toMatch(/^SUP\d{6}\d{3}$/) // SUP + YYYYMM + NNN
      expect(supplier.name).toBe('测试供应商有限公司')
      expect(supplier.status).toBe('active') // 默认状态
      expect(supplier.rating).toBe(3) // 默认评分
      expect(store.suppliers).toHaveLength(1)
    })

    it('addSupplier 连续添加时 code 序号递增', () => {
      const s1 = store.addSupplier({ name: '供应商1' })
      const s2 = store.addSupplier({ name: '供应商2' })

      expect(s2.code).not.toBe(s1.code)
      const seq1 = parseInt(s1.code.slice(-3), 10)
      const seq2 = parseInt(s2.code.slice(-3), 10)
      expect(seq2).toBeGreaterThan(seq1)
    })

    it('addSupplier 应使用默认值填充未提供的字段', () => {
      const supplier = store.addSupplier({ name: '最小字段' })

      expect(supplier.category).toBe('原材料')
      expect(supplier.deliveryScore).toBe(70)
      expect(supplier.qualityScore).toBe(70)
      expect(supplier.priceScore).toBe(70)
      expect(supplier.serviceScore).toBe(70)
      expect(supplier.createDate).toBeTruthy()
    })

    it('updateSupplier 应更新供应商数据', () => {
      const supplier = store.addSupplier({ name: '原始名称', contact: '张经理' })
      store.updateSupplier(supplier.id, { name: '更新名称', contact: '李经理' })

      const updated = store.suppliers.find((s) => s.id === supplier.id)
      expect(updated.name).toBe('更新名称')
      expect(updated.contact).toBe('李经理')
    })

    it('deleteSupplier 应删除指定供应商', () => {
      const s1 = store.addSupplier({ name: '供应商1' })
      const s2 = store.addSupplier({ name: '供应商2' })

      store.deleteSupplier(s1.id)
      expect(store.suppliers).toHaveLength(1)
      expect(store.suppliers[0].id).toBe(s2.id)
    })

    it('getSupplierById 应返回对应供应商', () => {
      const supplier = store.addSupplier({ name: '查找测试' })

      const found = store.getSupplierById(supplier.id)
      expect(found).not.toBeNull()
      expect(found.name).toBe('查找测试')
    })

    it('getSupplierById 对不存在的ID应返回null', () => {
      const result = store.getSupplierById('nonexistent_id')
      expect(result).toBeNull()
    })
  })

  /* ===== 业务逻辑：供应商评级与状态 ===== */
  describe('业务逻辑 - 供应商评级与状态', () => {
    it('toggleBlacklist 应将活跃供应商加入黑名单', () => {
      const supplier = store.addSupplier({ name: '正常供应商', status: 'active' })
      store.toggleBlacklist(supplier.id)

      expect(store.suppliers[0].status).toBe('blacklist')
    })

    it('toggleBlacklist 应将黑名单供应商恢复为活跃', () => {
      const supplier = store.addSupplier({ name: '黑名单供应商', status: 'blacklist' })
      store.toggleBlacklist(supplier.id)

      expect(store.suppliers[0].status).toBe('active')
    })

    it('toggleBlacklist 应来回切换状态', () => {
      const supplier = store.addSupplier({ name: '切换测试', status: 'active' })

      store.toggleBlacklist(supplier.id)
      expect(store.suppliers[0].status).toBe('blacklist')

      store.toggleBlacklist(supplier.id)
      expect(store.suppliers[0].status).toBe('active')
    })

    it('供应商评分应在1-5范围内', () => {
      const supplier = store.addSupplier({ name: '评分测试', rating: 5 })
      expect(supplier.rating).toBe(5)

      const supplier2 = store.addSupplier({ name: '低评分', rating: 1 })
      expect(supplier2.rating).toBe(1)
    })

    it('各维度评分应正确存储', () => {
      const supplier = store.addSupplier({
        name: '多维评分',
        deliveryScore: 95,
        qualityScore: 88,
        priceScore: 72,
        serviceScore: 90
      })

      expect(supplier.deliveryScore).toBe(95)
      expect(supplier.qualityScore).toBe(88)
      expect(supplier.priceScore).toBe(72)
      expect(supplier.serviceScore).toBe(90)
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('activeSuppliers 应只返回活跃供应商', () => {
      store.addSupplier({ name: '活跃1', status: 'active' })
      store.addSupplier({ name: '黑名单', status: 'blacklist' })
      store.addSupplier({ name: '活跃2', status: 'active' })

      expect(store.activeSuppliers).toHaveLength(2)
      store.activeSuppliers.forEach((s) => expect(s.status).toBe('active'))
    })

    it('pendingSuppliers 应只返回待审核供应商', () => {
      store.addSupplier({ name: '活跃', status: 'active' })
      store.addSupplier({ name: '待审核', status: 'pending' })
      store.addSupplier({ name: '待审核2', status: 'pending' })

      expect(store.pendingSuppliers).toHaveLength(2)
    })

    it('blacklistSuppliers 应只返回黑名单供应商', () => {
      store.addSupplier({ name: '活跃', status: 'active' })
      store.addSupplier({ name: '黑名单', status: 'blacklist' })

      expect(store.blacklistSuppliers).toHaveLength(1)
      expect(store.blacklistSuppliers[0].status).toBe('blacklist')
    })

    it('totalCount 应返回供应商总数', () => {
      store.addSupplier({ name: '供应商1' })
      store.addSupplier({ name: '供应商2' })
      store.addSupplier({ name: '供应商3' })

      expect(store.totalCount).toBe(3)
    })

    it('空数据时计算属性应为0或空数组', () => {
      expect(store.activeSuppliers).toHaveLength(0)
      expect(store.pendingSuppliers).toHaveLength(0)
      expect(store.blacklistSuppliers).toHaveLength(0)
      expect(store.totalCount).toBe(0)
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('deleteSupplier 对不存在的ID应静默处理', () => {
      store.addSupplier({ name: '存在' })
      store.deleteSupplier('nonexistent_id')
      expect(store.suppliers).toHaveLength(1)
    })

    it('updateSupplier 对不存在的ID应静默忽略', () => {
      store.addSupplier({ name: '存在' })
      store.updateSupplier('nonexistent_id', { name: '不存在' })
      expect(store.suppliers[0].name).toBe('存在')
    })

    it('toggleBlacklist 对不存在的ID应静默忽略', () => {
      store.addSupplier({ name: '存在', status: 'active' })
      store.toggleBlacklist('nonexistent_id')
      expect(store.suppliers[0].status).toBe('active')
    })

    it('importSuppliers 批量导入应正确添加', () => {
      const newSuppliers = createSuppliers(5)
      for (const s of newSuppliers) {
        store.addSupplier(s)
      }

      expect(store.suppliers).toHaveLength(5)
    })

    it('导入重复名称供应商应允许（由业务层判断）', () => {
      store.addSupplier({ name: '重复供应商', phone: '0512-11111111' })
      store.addSupplier({ name: '重复供应商', phone: '0512-22222222' })

      // store层不做唯一性校验，允许同名
      expect(store.suppliers).toHaveLength(2)
    })

    it('供应商资质到期日应正确存储', () => {
      const supplier = store.addSupplier({
        name: '资质测试',
        qualification: 'ISO9001',
        qualificationExpiry: '2027-06-30'
      })

      expect(supplier.qualification).toBe('ISO9001')
      expect(supplier.qualificationExpiry).toBe('2027-06-30')
    })
  })

  /* ===== 数据持久化 ===== */
  describe('数据持久化', () => {
    it('addSupplier 后 localStorage 应更新', () => {
      store.addSupplier({ name: '持久化测试' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_suppliers'))
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('持久化测试')
    })

    it('updateSupplier 后 localStorage 应更新', () => {
      const supplier = store.addSupplier({ name: '原始' })
      store.updateSupplier(supplier.id, { name: '更新后' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_suppliers'))
      expect(stored[0].name).toBe('更新后')
    })

    it('deleteSupplier 后 localStorage 应更新', () => {
      const supplier = store.addSupplier({ name: '待删除' })
      store.deleteSupplier(supplier.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_suppliers'))
      expect(stored).toHaveLength(0)
    })

    it('toggleBlacklist 后 localStorage 应更新', () => {
      const supplier = store.addSupplier({ name: '黑名单测试', status: 'active' })
      store.toggleBlacklist(supplier.id)

      const stored = JSON.parse(localStorage.getItem('gj_erp_suppliers'))
      expect(stored[0].status).toBe('blacklist')
    })
  })

  /* ===== 种子数据 ===== */
  describe('种子数据', () => {
    it('initSeedData 应初始化预设供应商', () => {
      store.initSeedData()

      expect(store.suppliers.length).toBeGreaterThan(0)
      // 应包含不同状态的供应商
      const statuses = store.suppliers.map((s) => s.status)
      expect(statuses).toContain('active')
    })

    it('initSeedData 应包含黑名单供应商', () => {
      store.initSeedData()

      const blacklist = store.suppliers.filter((s) => s.status === 'blacklist')
      expect(blacklist.length).toBeGreaterThan(0)
    })

    it('initSeedData 应包含待审核供应商', () => {
      store.initSeedData()

      const pending = store.suppliers.filter((s) => s.status === 'pending')
      expect(pending.length).toBeGreaterThan(0)
    })

    it('initSeedData 重复调用不应重复初始化', () => {
      store.initSeedData()
      const count1 = store.suppliers.length

      store.initSeedData()
      const count2 = store.suppliers.length

      expect(count1).toBe(count2)
    })

    it('initSeedData 应设置初始化标记', () => {
      store.initSeedData()
      expect(localStorage.getItem('gj_erp_supplier_initialized')).toBe('1')
    })

    it('initSeedData 后 localStorage 应包含数据', () => {
      store.initSeedData()

      const stored = JSON.parse(localStorage.getItem('gj_erp_suppliers'))
      expect(stored.length).toBeGreaterThan(0)
    })

    it('initSeedData 供应商应有完整字段', () => {
      store.initSeedData()

      const first = store.suppliers[0]
      expect(first.id).toBeTruthy()
      expect(first.code).toBeTruthy()
      expect(first.name).toBeTruthy()
      expect(first.contact).toBeTruthy()
      expect(first.phone).toBeTruthy()
      expect(first.rating).toBeGreaterThanOrEqual(1)
      expect(first.rating).toBeLessThanOrEqual(5)
    })
  })
})
