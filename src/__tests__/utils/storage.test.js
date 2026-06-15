/**
 * 存储工具测试
 * 覆盖 StorageManager 所有方法：getItem, setItem, removeItem, getJSON, setJSON, setWithTTL, getWithTTL, namespace
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import storage, { safeGetItem, safeSetItem, safeGetJSON, safeSetJSON, safeRemoveItem } from '@/utils/storage'

describe('storage.js - 存储工具', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /* ===== 基础方法 ===== */
  describe('基础方法', () => {
    it('setItem/getItem 应正确存储和读取字符串', () => {
      storage.setItem('test_key', 'hello')
      expect(storage.getItem('test_key')).toBe('hello')
    })

    it('getItem 不存在的key应返回null', () => {
      expect(storage.getItem('nonexistent')).toBeNull()
    })

    it('removeItem 应删除存储项', () => {
      storage.setItem('test_key', 'value')
      storage.removeItem('test_key')
      expect(storage.getItem('test_key')).toBeNull()
    })

    it('应自动添加前缀 gj_erp_', () => {
      storage.setItem('mykey', 'myvalue')
      expect(localStorage.getItem('gj_erp_mykey')).toBe('myvalue')
    })
  })

  /* ===== JSON 方法 ===== */
  describe('JSON方法', () => {
    it('setJSON/getJSON 应正确存储和读取JSON对象', () => {
      const data = { name: '测试', value: 123, items: [1, 2, 3] }
      storage.setJSON('test_obj', data)
      expect(storage.getJSON('test_obj')).toEqual(data)
    })

    it('getJSON 不存在的key应返回null', () => {
      expect(storage.getJSON('nonexistent')).toBeNull()
    })

    it('getJSON 损坏的JSON应返回null', () => {
      localStorage.setItem('gj_erp_bad_json', '{invalid json}')
      expect(storage.getJSON('bad_json')).toBeNull()
    })

    it('setJSON 应正确存储数组', () => {
      const arr = [{ id: 1 }, { id: 2 }]
      storage.setJSON('test_arr', arr)
      expect(storage.getJSON('test_arr')).toEqual(arr)
    })

    it('setJSON 应正确存储null值', () => {
      storage.setJSON('test_null', null)
      expect(storage.getJSON('test_null')).toBeNull()
    })
  })

  /* ===== TTL 方法 ===== */
  describe('TTL方法', () => {
    it('setWithTTL/getWithTTL 应在有效期内返回值', () => {
      storage.setWithTTL('ttl_key', 'ttl_value', 60000) // 60秒
      expect(storage.getWithTTL('ttl_key')).toBe('ttl_value')
    })

    it('getWithTTL 过期后应返回null并清除', () => {
      storage.setWithTTL('expired_key', 'expired_value', -1) // 已过期
      expect(storage.getWithTTL('expired_key')).toBeNull()
    })

    it('getWithTTL 不存在的key应返回null', () => {
      expect(storage.getWithTTL('nonexistent')).toBeNull()
    })

    it('setWithTTL 应支持对象值', () => {
      storage.setWithTTL('ttl_obj', { name: 'test' }, 60000)
      expect(storage.getWithTTL('ttl_obj')).toEqual({ name: 'test' })
    })

    it('过期后应自动清除存储项', () => {
      storage.setWithTTL('auto_clean', 'value', -1)
      storage.getWithTTL('auto_clean')
      expect(localStorage.getItem('gj_erp_auto_clean')).toBeNull()
    })
  })

  /* ===== 命名空间 ===== */
  describe('命名空间', () => {
    it('namespace 应创建带前缀的子实例', () => {
      const ns = storage.namespace('user')
      ns.setItem('name', '张三')
      expect(localStorage.getItem('gj_erp_user_name')).toBe('张三')
    })

    it('命名空间实例应独立工作', () => {
      const ns1 = storage.namespace('ns1')
      const ns2 = storage.namespace('ns2')
      ns1.setItem('key', 'value1')
      ns2.setItem('key', 'value2')
      expect(ns1.getItem('key')).toBe('value1')
      expect(ns2.getItem('key')).toBe('value2')
    })

    it('命名空间应支持JSON操作', () => {
      const ns = storage.namespace('data')
      ns.setJSON('items', [1, 2, 3])
      expect(ns.getJSON('items')).toEqual([1, 2, 3])
    })

    it('嵌套命名空间应正确拼接前缀', () => {
      const ns = storage.namespace('module')
      const subNs = ns.namespace('sub')
      subNs.setItem('key', 'nested')
      expect(localStorage.getItem('gj_erp_module_sub_key')).toBe('nested')
    })
  })

  /* ===== 兼容导出函数 ===== */
  describe('兼容导出函数', () => {
    it('safeGetItem/safeSetItem 应正常工作', () => {
      safeSetItem('compat_key', 'compat_value')
      expect(safeGetItem('compat_key')).toBe('compat_value')
    })

    it('safeGetJSON/safeSetJSON 应正常工作', () => {
      safeSetJSON('compat_json', { test: true })
      expect(safeGetJSON('compat_json')).toEqual({ test: true })
    })

    it('safeRemoveItem 应正常工作', () => {
      safeSetItem('compat_remove', 'value')
      safeRemoveItem('compat_remove')
      expect(safeGetItem('compat_remove')).toBeNull()
    })
  })

  /* ===== 异常处理 ===== */
  describe('异常处理', () => {
    it('localStorage异常时getItem应返回null', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('access denied') })
      expect(storage.getItem('error_key')).toBeNull()
      spy.mockRestore()
    })

    it('localStorage异常时setItem不应抛出', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })
      expect(() => storage.setItem('error_key', 'value')).not.toThrow()
      spy.mockRestore()
    })
  })
})
