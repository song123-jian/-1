/**
 * EventBus 测试
 * 测试事件总线的核心功能：订阅、发布、一次性订阅、通配符、历史记录等
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import eventBus, { DataEvents, DataModules } from '../eventBus'

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.reset()
  })

  /* ===== 基本订阅/发布 ===== */
  describe('on / emit', () => {
    it('应该能订阅并接收事件', () => {
      const handler = vi.fn()
      eventBus.on('test:event', handler)
      eventBus.emit('test:event', { value: 42 })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ value: 42 })
    })

    it('应该支持多个监听器', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      eventBus.on('multi', h1)
      eventBus.on('multi', h2)
      eventBus.emit('multi', 'data')

      expect(h1).toHaveBeenCalledTimes(1)
      expect(h2).toHaveBeenCalledTimes(1)
    })

    it('应该能取消订阅', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('cancel', handler)
      unsubscribe()
      eventBus.emit('cancel', 'data')

      expect(handler).not.toHaveBeenCalled()
    })

    it('应该能通过 off 取消订阅', () => {
      const handler = vi.fn()
      eventBus.on('off-test', handler)
      eventBus.off('off-test', handler)
      eventBus.emit('off-test', 'data')

      expect(handler).not.toHaveBeenCalled()
    })

    it('非函数 handler 时不应崩溃', () => {
      const unsub = eventBus.on('bad', null as any)
      expect(unsub).toBeDefined()
      expect(() => eventBus.emit('bad')).not.toThrow()
    })
  })

  /* ===== 一次性订阅 ===== */
  describe('once', () => {
    it('应该只触发一次', () => {
      const handler = vi.fn()
      eventBus.once('once:event', handler)

      eventBus.emit('once:event', 1)
      eventBus.emit('once:event', 2)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(1)
    })
  })

  /* ===== 通配符监听 ===== */
  describe('wildcard (*)', () => {
    it('应该接收所有事件', () => {
      const handler = vi.fn()
      eventBus.on('*', handler)

      eventBus.emit('event1', 'a')
      eventBus.emit('event2', 'b')

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenCalledWith('event1', 'a')
      expect(handler).toHaveBeenCalledWith('event2', 'b')
    })

    it('通配符一次订阅应该只触发一次', () => {
      const handler = vi.fn()
      eventBus.on('*', handler, { once: true })

      eventBus.emit('event1', 'a')
      eventBus.emit('event2', 'b')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  /* ===== 优先级 ===== */
  describe('priority', () => {
    it('高优先级监听器应该先执行', () => {
      const order: number[] = []
      eventBus.on('priority:test', () => order.push(1), { priority: 0 })
      eventBus.on('priority:test', () => order.push(2), { priority: 10 })
      eventBus.on('priority:test', () => order.push(3), { priority: 5 })

      eventBus.emit('priority:test')

      expect(order).toEqual([2, 3, 1])
    })
  })

  /* ===== 数据变更事件 ===== */
  describe('emitDataChange', () => {
    it('应该同时发布模块事件和通用事件', () => {
      const moduleHandler = vi.fn()
      const genericHandler = vi.fn()

      eventBus.on('customer:created', moduleHandler)
      eventBus.on(DataEvents.CREATED, genericHandler)

      eventBus.emitDataChange(DataModules.CUSTOMER, 'created', { id: 'c1', data: { name: 'Test' } })

      expect(moduleHandler).toHaveBeenCalledTimes(1)
      expect(genericHandler).toHaveBeenCalledTimes(1)
    })

    it('应该发布对应的通用事件类型', () => {
      const deletedHandler = vi.fn()
      eventBus.on(DataEvents.DELETED, deletedHandler)

      eventBus.emitDataChange(DataModules.CUSTOMER, 'deleted', { id: 'c1' })

      expect(deletedHandler).toHaveBeenCalledTimes(1)
      expect(deletedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'customer', action: 'deleted', id: 'c1' })
      )
    })
  })

  /* ===== 模块快捷方法 ===== */
  describe('onModuleChange / onModuleCreate / onModuleDelete', () => {
    it('onModuleChange 应该监听更新事件', () => {
      const handler = vi.fn()
      eventBus.onModuleChange('inventory', handler)
      eventBus.emit('inventory:updated', { id: 'i1' })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('onModuleCreate 应该监听创建事件', () => {
      const handler = vi.fn()
      eventBus.onModuleCreate('inventory', handler)
      eventBus.emit('inventory:created', { id: 'i1' })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('onModuleDelete 应该监听删除事件', () => {
      const handler = vi.fn()
      eventBus.onModuleDelete('inventory', handler)
      eventBus.emit('inventory:deleted', { id: 'i1' })

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  /* ===== 历史记录 ===== */
  describe('getHistory', () => {
    it('应该记录事件历史', () => {
      eventBus.emit('test:a', 'data1')
      eventBus.emit('test:b', 'data2')

      const history = eventBus.getHistory()
      expect(history.length).toBe(2)
      expect(history[0].event).toBe('test:a')
      expect(history[1].event).toBe('test:b')
    })

    it('应该支持按前缀过滤', () => {
      eventBus.emit('module:a', '1')
      eventBus.emit('module:b', '2')
      eventBus.emit('other:c', '3')

      const filtered = eventBus.getHistory('module:')
      expect(filtered.length).toBe(2)
    })
  })

  /* ===== 统计信息 ===== */
  describe('getStats', () => {
    it('应该返回发送统计', () => {
      eventBus.emit('event:a', 1)
      eventBus.emit('event:a', 2)
      eventBus.emit('event:b', 3)

      const stats = eventBus.getStats()
      expect(stats.totalEmitted).toBe(3)
      expect(stats.byType['event:a']).toBe(2)
      expect(stats.byType['event:b']).toBe(1)
      expect(stats.activeListeners).toBe(0)
    })
  })

  /* ===== 调试模式 ===== */
  describe('setDebug', () => {
    it('调试模式不应崩溃', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      eventBus.setDebug(true)
      eventBus.emit('debug:test', 'data')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  /* ===== 错误处理 ===== */
  describe('error handling', () => {
    it('监听器抛错时不应影响其他监听器', () => {
      const badHandler = () => { throw new Error('Boom!') }
      const goodHandler = vi.fn()

      eventBus.on('error:test', badHandler)
      eventBus.on('error:test', goodHandler)

      expect(() => eventBus.emit('error:test')).not.toThrow()
      expect(goodHandler).toHaveBeenCalledTimes(1)
    })
  })

  /* ===== onWithLifecycle ===== */
  describe('onWithLifecycle', () => {
    it('应该正常订阅', () => {
      const handler = vi.fn()
      const instance = {}
      eventBus.onWithLifecycle('lifecycle:test', handler, instance)
      eventBus.emit('lifecycle:test', 'data')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('应存储清理函数', () => {
      const handler = vi.fn()
      const instance: Record<string, unknown> = {}
      eventBus.onWithLifecycle('lifecycle:test', handler, instance)

      expect((instance as any).__cleanup_fns).toBeDefined()
      expect((instance as any).__cleanup_fns.length).toBe(1)
    })
  })

  /* ===== cleanupByComponent ===== */
  describe('cleanupByComponent', () => {
    it('应清除组件关联的所有订阅', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const instance: Record<string, unknown> = {}

      eventBus.onWithLifecycle('comp:a', handler1, instance)
      eventBus.onWithLifecycle('comp:b', handler2, instance)

      eventBus.cleanupByComponent(instance)

      eventBus.emit('comp:a', 'data')
      eventBus.emit('comp:b', 'data')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  /* ===== clear ===== */
  describe('clear', () => {
    it('应清除所有监听器', () => {
      const handler = vi.fn()
      eventBus.on('pre-clear', handler)
      eventBus.clear()
      eventBus.emit('pre-clear', 'data')

      expect(handler).not.toHaveBeenCalled()
    })
  })
})
