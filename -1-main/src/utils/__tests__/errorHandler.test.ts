/**
 * ErrorHandler 测试
 * 测试错误分类、快照回滚、日志记录等功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import errorHandler, { ErrorTypes, ErrorCodes } from '../errorHandler'

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorHandler.clearErrorLog()
  })

  /* ===== 错误分类 ===== */
  describe('handleError', () => {
    it('应该返回错误信息对象', () => {
      const result = errorHandler.handleError('测试错误', { module: 'customer', action: 'create' })

      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('suggestion')
      expect(result).toHaveProperty('recoverable')
    })

    it('应该识别网络错误', () => {
      const result = errorHandler.handleError(new Error('网络连接失败'))
      expect(result.type).toBe('network')
    })

    it('应该识别权限错误', () => {
      const result = errorHandler.handleError(new Error('您没有权限执行此操作'))
      expect(result.type).toBe('permission')
      expect(result.recoverable).toBe(false)
    })

    it('应该识别验证错误', () => {
      const result = errorHandler.handleError(new Error('名称不能为空'))
      expect(result.type).toBe('validation')
    })

    it('应该识别存储错误', () => {
      const error = new Error('QuotaExceeded')
      const result = errorHandler.handleError(error)
      expect(result.type).toBe('storage')
    })

    it('应该识别业务错误', () => {
      const result = errorHandler.handleError(new Error('库存不足'))
      expect(result.type).toBe('business')
    })

    it('未知错误应返回 unknown 类型', () => {
      const result = errorHandler.handleError(new Error('Something unexpected'))
      expect(result.type).toBe('unknown')
    })

    it('应支持字符串错误', () => {
      const result = errorHandler.handleError('plain string error')
      expect(result.type).toBe('unknown')
      expect(result.originalMessage).toBe('plain string error')
    })

    /* ===== 错误码分类 ===== */
    it('应通过错误码精确分类', () => {
      const error = new Error('Some message') as Error & { code?: string; errorCode?: string }
      error.code = ErrorCodes.PERMISSION_DENIED
      const result = errorHandler.handleError(error)
      expect(result.type).toBe('permission')
      expect(result.code).toBe('permission.denied')
    })

    it('应支持 errorCode 字段', () => {
      const error = new Error('msg') as Error & { code?: string; errorCode?: string }
      error.errorCode = ErrorCodes.VALIDATION_REQUIRED
      const result = errorHandler.handleError(error)
      expect(result.type).toBe('validation')
    })
  })

  /* ===== 操作快照 ===== */
  describe('createSnapshot / rollback', () => {
    it('应创建快照并返回ID', () => {
      const id = errorHandler.createSnapshot('customer', 'create', { id: '1', name: 'New' }, null)
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
    })

    it('应支持回滚新增操作', () => {
      const store = {
        deleteItem: vi.fn()
      }
      const id = errorHandler.createSnapshot('customer', 'create', { id: 'c1', name: 'Test' }, null)

      const result = errorHandler.rollback(id, store)
      expect(result).toBe(true)
      expect(store.deleteItem).toHaveBeenCalledWith('c1')
    })

    it('应支持回滚更新操作', () => {
      const oldData = { id: 'c1', name: 'Old' }
      const store = {
        updateItem: vi.fn()
      }
      const id = errorHandler.createSnapshot('customer', 'update', { id: 'c1', name: 'New' }, oldData)

      const result = errorHandler.rollback(id, store)
      expect(result).toBe(true)
      expect(store.updateItem).toHaveBeenCalledWith('c1', oldData)
    })

    it('应支持回滚删除操作', () => {
      const oldData = { id: 'c1', name: 'Deleted' }
      const store = {
        addItem: vi.fn()
      }
      const id = errorHandler.createSnapshot('customer', 'delete', null, oldData)

      const result = errorHandler.rollback(id, store)
      expect(result).toBe(true)
      expect(store.addItem).toHaveBeenCalledWith(oldData)
    })

    it('未找到快照应返回 false', () => {
      const result = errorHandler.rollback('non-existent-id', {})
      expect(result).toBe(false)
    })

    it('不支持的回滚类型应返回 false', () => {
      const id = errorHandler.createSnapshot('customer', 'unknown_action', null, null)
      const result = errorHandler.rollback(id, {})
      expect(result).toBe(false)
    })
  })

  /* ===== 错误日志 ===== */
  describe('getErrorLog', () => {
    it('应记录错误日志', () => {
      errorHandler.handleError('Error 1', { module: 'customer' })
      errorHandler.handleError('Error 2', { module: 'quotation' })

      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(2)
    })

    it('应按类型过滤', () => {
      errorHandler.handleError(new Error('网络连接失败'), { module: 'test' })
      errorHandler.handleError(new Error('权限不足'), { module: 'test' })

      const networkLog = errorHandler.getErrorLog({ type: 'network' })
      expect(networkLog.length).toBe(1)

      const permissionLog = errorHandler.getErrorLog({ type: 'permission' })
      expect(permissionLog.length).toBe(1)
    })

    it('应按模块过滤', () => {
      errorHandler.handleError('Error A', { module: 'customer' })
      errorHandler.handleError('Error B', { module: 'inventory' })

      const customerLog = errorHandler.getErrorLog({ module: 'customer' })
      expect(customerLog.length).toBe(1)
    })

    it('应支持 limit 参数', () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.handleError(`Error ${i}`)
      }

      const log = errorHandler.getErrorLog({ limit: 3 })
      expect(log.length).toBe(3)
    })
  })

  /* ===== 快照数量限制 ===== */
  describe('snapshot limit', () => {
    it('不应超过最大快照数', () => {
      for (let i = 0; i < 60; i++) {
        errorHandler.createSnapshot('customer', 'update', { id: String(i) }, { id: String(i) })
      }

      const snapshots = errorHandler.getRecentSnapshots(100)
      expect(snapshots.length).toBeLessThanOrEqual(50)
    })
  })

  /* ===== 错误回调 ===== */
  describe('onError', () => {
    it('应触发错误回调', () => {
      const callback = vi.fn()
      errorHandler.onError('validation', callback)

      errorHandler.handleError(new Error('名称不能为空'))
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'validation' }))
    })
  })

  /* ===== 清除日志 ===== */
  describe('clearErrorLog', () => {
    it('应清除所有日志', () => {
      errorHandler.handleError('Error 1')
      errorHandler.handleError('Error 2')

      errorHandler.clearErrorLog()
      const log = errorHandler.getErrorLog()
      expect(log.length).toBe(0)
    })
  })
})