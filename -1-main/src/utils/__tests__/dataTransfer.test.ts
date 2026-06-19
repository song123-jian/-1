/**
 * DataTransfer 测试
 * 测试 CSV/JSON 导入导出的核心逻辑
 */
import { describe, it, expect, beforeEach } from 'vitest'
import dataTransfer from '../dataTransfer'

/* Mock localStorage 用于 dataCenter */
const mockLocalStorage: Record<string, string> = {}

beforeEach(() => {
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  // 确保 dataCenter 初始化
  mockLocalStorage['gj_erp_customers_initialized'] = '1'
  mockLocalStorage['gj_erp_customers'] = JSON.stringify([])
})

describe('DataTransfer', () => {
  /* ===== CSV 解析 ===== */
  describe('CSV parsing', () => {
    it('应正确解析简单CSV', () => {
      const csv = 'name,phone,email\n张三,13800138000,zhang@test.com'
      const result = dataTransfer.previewImport(csv, 'csv', 'customer')

      expect(result.count).toBe(1)
      expect(result.fields).toContain('name')
      expect(result.sample[0].name).toBe('张三')
    })

    it('应处理逗号在引号中的情况', () => {
      const csv = 'name,address\n"某某公司, 有限公司","上海市, 浦东新区"'
      const result = dataTransfer.previewImport(csv, 'csv', 'customer')

      expect(result.count).toBe(1)
      expect(result.sample[0].name).toBe('某某公司, 有限公司')
    })

    it('应处理双引号转义', () => {
      const csv = 'name,description\n"公司A","描述包含""引号"""'
      const result = dataTransfer.previewImport(csv, 'csv', 'customer')

      expect(result.count).toBe(1)
      expect(result.sample[0].description).toContain('"引号"')
    })

    it('空CSV应返回警告', () => {
      const result = dataTransfer.previewImport('', 'csv', 'customer')

      expect(result.count).toBe(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('单行（只有表头）应返回空数据', () => {
      const csv = 'name,phone,email'
      const result = dataTransfer.previewImport(csv, 'csv', 'customer')

      expect(result.count).toBe(0)
    })
  })

  /* ===== CSV 导出 ===== */
  describe('CSV export', () => {
    it('空数据时应返回空字符串', () => {
      // dataCenter.store没有数据时应返回空字符串
      const result = dataTransfer.exportCSV('customer')
      expect(result).toBe('')
    })
  })

  /* ===== JSON 预览 ===== */
  describe('JSON preview', () => {
    it('应正确预览JSON数组', () => {
      const json = JSON.stringify([{ id: '1', name: 'Test' }])
      const result = dataTransfer.previewImport(json, 'json')

      expect(result.count).toBe(1)
      expect(result.fields).toContain('id')
    })

    it('空JSON应返回警告', () => {
      const result = dataTransfer.previewImport('[]', 'json')

      expect(result.count).toBe(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('格式错误JSON应返回警告', () => {
      const result = dataTransfer.previewImport('not valid json', 'json')

      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  /* ===== 模块字段定义 ===== */
  describe('getModuleFields', () => {
    it('应返回已知模块的字段定义', () => {
      const fields = dataTransfer.getModuleFields('customer')
      expect(fields).not.toBeNull()
      expect(fields?.required).toContain('name')
    })

    it('未知模块应返回 null', () => {
      const fields = dataTransfer.getModuleFields('nonexistent')
      expect(fields).toBeNull()
    })
  })

  /* ===== 支持的模块列表 ===== */
  describe('getSupportedModules', () => {
    it('应返回支持的模块列表', () => {
      const modules = dataTransfer.getSupportedModules()
      expect(modules.length).toBeGreaterThan(0)
      expect(modules[0]).toHaveProperty('key')
    })
  })

  /* ===== 模板生成 ===== */
  describe('generateTemplate', () => {
    it('应为已知模块生成CSV模板', () => {
      const template = dataTransfer.generateTemplate('customer')
      expect(template).toContain('客户名称')
      expect(template.charCodeAt(0)).toBe(0xFEFF) // BOM header
    })

    it('未知模块应返回空字符串', () => {
      const template = dataTransfer.generateTemplate('nonexistent')
      expect(template).toBe('')
    })
  })

  /* ===== 字段名映射 ===== */
  describe('previewImport field mapping', () => {
    it('应将中文字段名映射为英文字段名', () => {
      const csv = '客户名称,电话\n李四,13900001111'
      const result = dataTransfer.previewImport(csv, 'csv', 'customer')

      expect(result.count).toBe(1)
      expect(result.fields).toContain('name')
      expect(result.fields).toContain('phone')
      expect(result.sample[0].name).toBe('李四')
    })
  })
})