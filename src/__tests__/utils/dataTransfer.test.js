/**
 * 数据导入导出工具测试
 * 覆盖 exportJSON, exportCSV, importJSON, importCSV, generateTemplate, previewImport, getModuleFields, getSupportedModules
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dataCenter store - _getModuleData 访问 dataCenter[dataKeyMap[module]]
vi.mock('@/stores/dataCenter', () => ({
  useDataCenterStore: vi.fn(() => ({
    customers: [
      { id: '1', name: '测试客户1', phone: '021-1111', level: 'A' },
      { id: '2', name: '测试客户2', phone: '021-2222', level: 'B' }
    ],
    suppliers: [
      { id: 's1', name: '测试供应商1', rating: 'A' }
    ],
    inventory: [
      { id: 'i1', code: 'MTL-001', name: 'ABS树脂', quantity: 500, unitCost: 85.5 }
    ],
    quotations: [],
    contracts: [],
    deliveries: [],
    collections: [],
    statements: []
  }))
}))

// Mock dataService
vi.mock('@/services/dataService', () => ({
  default: {
    getStore: vi.fn(() => null)
  }
}))

import dataTransfer from '@/utils/dataTransfer'

describe('dataTransfer.js - 数据导入导出工具', () => {
  let dt

  beforeEach(() => {
    dt = dataTransfer
    vi.clearAllMocks()
  })

  /* ===== getModuleFields ===== */
  describe('getModuleFields', () => {
    it('应返回customer模块字段定义', () => {
      const fields = dt.getModuleFields('customer')
      expect(fields).not.toBeNull()
      expect(fields.required).toContain('name')
      expect(fields.optional).toContain('phone')
      expect(fields.labels).toBeDefined()
    })

    it('应返回supplier模块字段定义', () => {
      const fields = dt.getModuleFields('supplier')
      expect(fields).not.toBeNull()
      expect(fields.required).toContain('name')
    })

    it('应返回inventory模块字段定义', () => {
      const fields = dt.getModuleFields('inventory')
      expect(fields).not.toBeNull()
      expect(fields.required).toContain('code')
      expect(fields.required).toContain('name')
    })

    it('不存在的模块应返回null', () => {
      expect(dt.getModuleFields('unknown')).toBeNull()
    })
  })

  /* ===== getSupportedModules ===== */
  describe('getSupportedModules', () => {
    it('应返回支持的模块列表', () => {
      const modules = dt.getSupportedModules()
      expect(modules.length).toBeGreaterThan(0)
      expect(modules.some(m => m.key === 'customer')).toBe(true)
      expect(modules.some(m => m.key === 'supplier')).toBe(true)
      expect(modules.some(m => m.key === 'inventory')).toBe(true)
    })

    it('每个模块应包含required和optional字段', () => {
      const modules = dt.getSupportedModules()
      for (const mod of modules) {
        expect(mod.required).toBeDefined()
        expect(mod.optional).toBeDefined()
        expect(mod.labels).toBeDefined()
      }
    })
  })

  /* ===== exportJSON ===== */
  describe('exportJSON', () => {
    it('应导出JSON格式数据', () => {
      const result = dt.exportJSON('customer')
      const parsed = JSON.parse(result)
      expect(parsed.version).toBeDefined()
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.modules).toBeDefined()
    })

    it('应支持多模块导出', () => {
      const result = dt.exportJSON(['customer', 'supplier'])
      const parsed = JSON.parse(result)
      expect(Object.keys(parsed.modules).length).toBeGreaterThanOrEqual(2)
    })

    it('应支持pretty格式', () => {
      const compact = dt.exportJSON('customer', { pretty: false })
      const pretty = dt.exportJSON('customer', { pretty: true })
      expect(pretty.length).toBeGreaterThanOrEqual(compact.length)
    })
  })

  /* ===== exportCSV ===== */
  describe('exportCSV', () => {
    it('应导出CSV格式数据', () => {
      const result = dt.exportCSV('customer')
      expect(result).toContain('客户名称')
      expect(typeof result).toBe('string')
    })

    it('CSV应包含BOM头', () => {
      const result = dt.exportCSV('customer')
      expect(result.startsWith('\uFEFF')).toBe(true)
    })

    it('应支持指定字段', () => {
      const result = dt.exportCSV('customer', { fields: ['name', 'phone'] })
      expect(result).toContain('客户名称')
      expect(result).toContain('电话')
    })
  })

  /* ===== generateTemplate ===== */
  describe('generateTemplate', () => {
    it('应生成CSV模板', () => {
      const result = dt.generateTemplate('customer')
      expect(result).toContain('客户名称')
      expect(result.startsWith('\uFEFF')).toBe(true)
    })

    it('模板应包含示例行', () => {
      const result = dt.generateTemplate('customer')
      const lines = result.split('\n')
      expect(lines.length).toBeGreaterThanOrEqual(2) // 表头 + 示例行
    })
  })

  /* ===== previewImport ===== */
  describe('previewImport', () => {
    it('应预览JSON导入数据', () => {
      const jsonData = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        modules: {
          customer: {
            data: [
              { name: '预览客户', phone: '021-1234', level: 'A' }
            ]
          }
        }
      })
      const result = dt.previewImport(jsonData, 'json', 'customer')
      expect(result.count).toBeGreaterThan(0)
      expect(result.fields).toBeDefined()
    })

    it('应预览CSV导入数据', () => {
      const csvData = '\uFEFF客户名称,电话,等级\n预览客户,021-1234,A'
      const result = dt.previewImport(csvData, 'csv', 'customer')
      expect(result.count).toBeGreaterThan(0)
    })

    it('应检测必填字段缺失', () => {
      const csvData = '\uFEFF电话,等级\n021-1234,A' // 缺少name
      const result = dt.previewImport(csvData, 'csv', 'customer')
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  /* ===== _parseCSV ===== */
  describe('_parseCSV', () => {
    it('应正确解析CSV', () => {
      const csv = 'name,phone,level\n客户1,021-1111,A\n客户2,021-2222,B'
      const result = dt._parseCSV(csv)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('客户1')
      expect(result[1].level).toBe('B')
    })

    it('应处理引号内的逗号', () => {
      const csv = 'name,address\n客户1,"地址,包含逗号"'
      const result = dt._parseCSV(csv)
      expect(result).toHaveLength(1)
      expect(result[0].address).toBe('地址,包含逗号')
    })

    it('应处理空行', () => {
      const csv = 'name,phone\n客户1,021-1111\n\n客户2,021-2222'
      const result = dt._parseCSV(csv)
      expect(result).toHaveLength(2)
    })

    it('应处理BOM头', () => {
      const csv = '\uFEFFname,phone\n客户1,021-1111'
      const result = dt._parseCSV(csv)
      expect(result).toHaveLength(1)
    })
  })

  /* ===== 边界条件 ===== */
  describe('边界条件', () => {
    it('空模块数据应正常导出', () => {
      const result = dt.exportJSON('quotation')
      const parsed = JSON.parse(result)
      expect(parsed.modules).toBeDefined()
    })

    it('无效JSON应处理导入错误', async () => {
      const result = await dt.importJSON('invalid json')
      expect(result.success).toBe(false)
    })

    it('空CSV应处理导入', async () => {
      const result = await dt.importCSV('\uFEFF客户名称,电话', 'customer')
      expect(result.imported).toBe(0)
    })
  })
})
