/**
 * 数据服务层测试
 * 覆盖 DataResult, registerStore, query, _validate, _checkPermission, _computeChanges, getSelectOptions, batchDelete
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataResult } from '@/services/dataService'

// Mock 依赖
vi.mock('@/utils/eventBus', () => ({
  default: {
    emit: vi.fn(),
    emitDataChange: vi.fn()
  },
  DataModules: {}
}))

vi.mock('@/utils/dataCache', () => ({
  default: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidateNamespace: vi.fn()
  }
}))

vi.mock('@/utils/versionControl', () => ({
  default: {
    recordVersion: vi.fn(),
    _config: {}
  }
}))

vi.mock('@/utils/uid', () => ({
  generateId: vi.fn((prefix) => `${prefix}_test_${Date.now()}`)
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: vi.fn(() => ({
    currentRole: '管理员',
    isLoggedIn: true
  }))
}))

vi.mock('@/stores/permission', () => ({
  usePermissionStore: vi.fn(() => ({
    getPerm: vi.fn(() => true)
  }))
}))

import dataService from '@/services/dataService'

describe('dataService.js - 数据服务层', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    dataService._storeCache.clear()
  })

  /* ===== DataResult ===== */
  describe('DataResult', () => {
    it('ok 应返回成功结果', () => {
      const result = DataResult.ok({ id: '1' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: '1' })
      expect(result.error).toBeNull()
      expect(result.timestamp).toBeGreaterThan(0)
    })

    it('fail 应返回失败结果', () => {
      const result = DataResult.fail('出错了')
      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBe('出错了')
    })
  })

  /* ===== registerStore / getStore ===== */
  describe('registerStore / getStore', () => {
    it('应注册和获取Store', () => {
      const mockStore = { customers: [] }
      dataService.registerStore('customer', mockStore)
      expect(dataService.getStore('customer')).toBe(mockStore)
    })

    it('未注册的模块应返回null', () => {
      expect(dataService.getStore('unknown')).toBeNull()
    })
  })

  /* ===== _validate ===== */
  describe('_validate', () => {
    it('customer 必填name', () => {
      const result = dataService._validate('customer', {})
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('客户名称 不能为空')
    })

    it('customer 有name应通过', () => {
      const result = dataService._validate('customer', { name: '测试客户' })
      expect(result.valid).toBe(true)
    })

    it('customer level必须是A/B/C', () => {
      const result = dataService._validate('customer', { name: '测试', level: 'D' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('等级'))).toBe(true)
    })

    it('customer phone格式不正确', () => {
      const result = dataService._validate('customer', { name: '测试', phone: 'abc' })
      expect(result.valid).toBe(false)
    })

    it('customer email格式不正确', () => {
      const result = dataService._validate('customer', { name: '测试', email: 'invalid' })
      expect(result.valid).toBe(false)
    })

    it('customer creditLimit不能为负', () => {
      const result = dataService._validate('customer', { name: '测试', creditLimit: -100 })
      expect(result.valid).toBe(false)
    })

    it('quotation 必填quoteNo', () => {
      const result = dataService._validate('quotation', {})
      expect(result.valid).toBe(false)
    })

    it('inventory 必填code和name', () => {
      const result = dataService._validate('inventory', {})
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('supplier 必填name', () => {
      const result = dataService._validate('supplier', {})
      expect(result.valid).toBe(false)
    })

    it('supplier rating必须是A/B/C', () => {
      const result = dataService._validate('supplier', { name: '测试', rating: 'D' })
      expect(result.valid).toBe(false)
    })

    it('无验证规则的模块应通过', () => {
      const result = dataService._validate('unknown_module', { anything: true })
      expect(result.valid).toBe(true)
    })

    it('name超长应报错', () => {
      const result = dataService._validate('customer', { name: 'A'.repeat(101) })
      expect(result.valid).toBe(false)
    })

    it('collection 必填collectionNo', () => {
      const result = dataService._validate('collection', {})
      expect(result.valid).toBe(false)
    })

    it('delivery 必填deliveryNo和customerName', () => {
      const result = dataService._validate('delivery', {})
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  /* ===== _computeChanges ===== */
  describe('_computeChanges', () => {
    it('应计算变更差异', () => {
      const oldData = { name: '旧名称', level: 'A', status: 'active' }
      const updates = { name: '新名称', level: 'B' }
      const changes = dataService._computeChanges(oldData, updates)
      expect(changes).toHaveLength(2)
      expect(changes.find(c => c.field === 'name')).toEqual({ field: 'name', oldValue: '旧名称', newValue: '新名称' })
      expect(changes.find(c => c.field === 'level')).toEqual({ field: 'level', oldValue: 'A', newValue: 'B' })
    })

    it('应忽略updatedAt和updatedBy', () => {
      const oldData = { name: '测试' }
      const updates = { name: '测试', updatedAt: '2024-01-01', updatedBy: 'admin' }
      const changes = dataService._computeChanges(oldData, updates)
      expect(changes).toHaveLength(0)
    })

    it('无变更应返回空数组', () => {
      const oldData = { name: '测试', level: 'A' }
      const updates = { name: '测试', level: 'A' }
      const changes = dataService._computeChanges(oldData, updates)
      expect(changes).toHaveLength(0)
    })

    it('null输入应返回空数组', () => {
      expect(dataService._computeChanges(null, {})).toEqual([])
      expect(dataService._computeChanges({}, null)).toEqual([])
    })
  })

  /* ===== query ===== */
  describe('query', () => {
    it('未注册的模块应返回失败', () => {
      const result = dataService.query('unknown')
      expect(result.success).toBe(false)
      expect(result.error).toContain('未注册')
    })

    it('应按ID查询', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '客户1' },
          { id: '2', name: '客户2' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', { id: '1' })
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('客户1')
    })

    it('ID不存在应返回null', () => {
      const mockStore = { customers: [{ id: '1', name: '客户1' }] }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', { id: '999' })
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('应支持过滤', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '客户1', level: 'A' },
          { id: '2', name: '客户2', level: 'B' },
          { id: '3', name: '客户3', level: 'A' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        filters: [{ field: 'level', value: 'A' }]
      })
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })

    it('应支持搜索', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '上海贸易' },
          { id: '2', name: '北京科技' },
          { id: '3', name: '上海精密' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', { search: '上海' })
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })

    it('应支持排序', () => {
      const mockStore = {
        customers: [
          { id: '1', name: 'C客户' },
          { id: '2', name: 'A客户' },
          { id: '3', name: 'B客户' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        orderBy: { field: 'name', ascending: true }
      })
      expect(result.data[0].name).toBe('A客户')
    })

    it('应支持限制条数', () => {
      const mockStore = {
        customers: Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `客户${i}` }))
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', { limit: 3 })
      expect(result.data).toHaveLength(3)
    })

    it('数据源不是数组应返回失败', () => {
      const mockStore = { customers: 'not an array' }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer')
      expect(result.success).toBe(false)
    })

    it('应支持neq操作符', () => {
      const mockStore = {
        customers: [
          { id: '1', status: 'active' },
          { id: '2', status: 'dormant' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        filters: [{ field: 'status', value: 'active', operator: 'neq' }]
      })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].status).toBe('dormant')
    })

    it('应支持contains操作符', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '上海贸易有限公司' },
          { id: '2', name: '北京科技' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        filters: [{ field: 'name', value: '贸易', operator: 'contains' }]
      })
      expect(result.data).toHaveLength(1)
    })

    it('应支持gt/gte/lt/lte操作符', () => {
      const mockStore = {
        customers: [
          { id: '1', balance: 100 },
          { id: '2', balance: 200 },
          { id: '3', balance: 300 }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        filters: [{ field: 'balance', value: 150, operator: 'gte' }]
      })
      expect(result.data).toHaveLength(2)
    })

    it('应支持in操作符', () => {
      const mockStore = {
        customers: [
          { id: '1', level: 'A' },
          { id: '2', level: 'B' },
          { id: '3', level: 'C' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.query('customer', {
        filters: [{ field: 'level', value: ['A', 'C'], operator: 'in' }]
      })
      expect(result.data).toHaveLength(2)
    })
  })

  /* ===== _getDataKey ===== */
  describe('_getDataKey', () => {
    it('应返回正确的数据键名', () => {
      expect(dataService._getDataKey('customer')).toBe('customers')
      expect(dataService._getDataKey('quotation')).toBe('quotations')
      expect(dataService._getDataKey('contract')).toBe('contracts')
      expect(dataService._getDataKey('inventory')).toBe('inventory')
    })

    it('未知模块应返回模块名', () => {
      expect(dataService._getDataKey('unknown')).toBe('unknown')
    })
  })

  /* ===== _getAddMethod / _getUpdateMethod / _getDeleteMethod ===== */
  describe('方法名映射', () => {
    it('应返回正确的新增方法名', () => {
      expect(dataService._getAddMethod('customer')).toBe('addCustomer')
      expect(dataService._getAddMethod('quotation')).toBe('addQuotation')
      expect(dataService._getAddMethod('inventory')).toBe('addInventoryItem')
    })

    it('应返回正确的更新方法名', () => {
      expect(dataService._getUpdateMethod('customer')).toBe('updateCustomer')
      expect(dataService._getUpdateMethod('quotation')).toBe('updateQuotation')
    })

    it('应返回正确的删除方法名', () => {
      expect(dataService._getDeleteMethod('customer')).toBe('deleteCustomer')
      expect(dataService._getDeleteMethod('quotation')).toBe('deleteQuotation')
    })

    it('未知模块应返回默认方法名', () => {
      expect(dataService._getAddMethod('unknown')).toBe('addItem')
      expect(dataService._getUpdateMethod('unknown')).toBe('updateItem')
      expect(dataService._getDeleteMethod('unknown')).toBe('deleteItem')
    })
  })

  /* ===== getSelectOptions ===== */
  describe('getSelectOptions', () => {
    it('应返回选项列表', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '客户1' },
          { id: '2', name: '客户2' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.getSelectOptions('customer')
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({ value: '1', label: '客户1', data: { id: '1', name: '客户1' } })
    })

    it('应支持自定义valueField和labelField', () => {
      const mockStore = {
        customers: [
          { id: '1', name: '客户1', customerNo: 'KH-001' }
        ]
      }
      dataService.registerStore('customer', mockStore)
      const result = dataService.getSelectOptions('customer', {
        valueField: 'customerNo',
        labelField: 'name'
      })
      expect(result.data[0].value).toBe('KH-001')
    })
  })
})
