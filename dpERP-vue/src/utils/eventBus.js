/**
 * 统一事件总线 - 数据变更通知机制
 * 实现模块间数据变更的发布/订阅模式，支持：
 * - 数据变更通知（创建/更新/删除）
 * - 模块间实时数据同步
 * - 事件过滤与命名空间
 * - 事件历史记录与调试
 * - 一次性订阅与优先级
 */

/* 事件类型常量 */
export const DataEvents = {
  /* 通用CRUD事件 */
  CREATED: 'data:created',
  UPDATED: 'data:updated',
  DELETED: 'data:deleted',
  BATCH_UPDATED: 'data:batch_updated',
  BATCH_DELETED: 'data:batch_deleted',

  /* 同步事件 */
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',

  /* 缓存事件 */
  CACHE_INVALIDATED: 'cache:invalidated',
  CACHE_UPDATED: 'cache:updated',

  /* 版本事件 */
  VERSION_CREATED: 'version:created',
  VERSION_RESTORED: 'version:restored'
}

/* 模块命名空间 */
export const DataModules = {
  CUSTOMER: 'customer',
  QUOTATION: 'quotation',
  CONTRACT: 'contract',
  INVENTORY: 'inventory',
  DELIVERY: 'delivery',
  COLLECTION: 'collection',
  STATEMENT: 'statement',
  SUPPLIER: 'supplier',
  WAREHOUSE_LOCATION: 'warehouseLocation',
  COST: 'cost',
  TODO: 'todo',
  TAG: 'tag'
}

class EventBus {
  constructor() {
    /* 监听器映射：eventName [右] Set<{handler, options}> */
    this._listeners = new Map()
    /* 通配符监听器 */
    this._wildcardListeners = new Set()
    /* 事件历史（最近200条，用于调试） */
    this._history = []
    this._maxHistory = 200
    /* 是否启用调试模式 */
    this._debug = false
    /* 事件统计 */
    this._stats = {
      totalEmitted: 0,
      byType: {}
    }
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称，支持命名空间格式 "module:action"
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 选项 { once: boolean, priority: number }
   * @returns {Function} 取消订阅的函数
   */
  on(event, handler, options = {}) {
    if (typeof handler !== 'function') {
      console.warn('[EventBus] handler 必须是函数')
      return () => {}
    }

    const listener = {
      handler,
      once: options.once || false,
      priority: options.priority || 0
    }

    /* 通配符订阅 */
    if (event === '*') {
      this._wildcardListeners.add(listener)
      return () => this._wildcardListeners.delete(listener)
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }

    this._listeners.get(event).add(listener)
    return () => this.off(event, handler)
  }

  /**
   * 一次性订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅的函数
   */
  once(event, handler) {
    return this.on(event, handler, { once: true })
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(event, handler) {
    const listeners = this._listeners.get(event)
    if (!listeners) return

    for (const listener of listeners) {
      if (listener.handler === handler) {
        listeners.delete(listener)
        break
      }
    }

    if (listeners.size === 0) {
      this._listeners.delete(event)
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    this._stats.totalEmitted++
    this._stats.byType[event] = (this._stats.byType[event] || 0) + 1

    /* 记录历史 */
    this._history.push({
      event,
      data: data ? { ...data } : null,
      timestamp: Date.now()
    })
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory)
    }

    if (this._debug) {
      console.info(`[EventBus] ${event}`, data)
    }

    /* 通知特定事件监听器 */
    const listeners = this._listeners.get(event)
    if (listeners) {
      const sorted = [...listeners].sort((a, b) => b.priority - a.priority)
      for (const listener of sorted) {
        try {
          listener.handler(data)
        } catch (e) {
          console.error(`[EventBus] 事件处理错误 ${event}:`, e)
        }
        if (listener.once) {
          listeners.delete(listener)
        }
      }
      if (listeners.size === 0) {
        this._listeners.delete(event)
      }
    }

    /* 通知通配符监听器 */
    for (const listener of this._wildcardListeners) {
      try {
        listener.handler(event, data)
      } catch (e) {
        console.error(`[EventBus] 通配符处理错误:`, e)
      }
      if (listener.once) {
        this._wildcardListeners.delete(listener)
      }
    }
  }

  /**
   * 发布数据变更事件（便捷方法）
   * @param {string} module - 模块名称 (DataModules)
   * @param {string} action - 操作类型 (created/updated/deleted)
   * @param {Object} detail - 变更详情 { id, data, oldData, changes }
   */
  emitDataChange(module, action, detail) {
    const event = `${module}:${action}`
    this.emit(event, {
      module,
      action,
      ...detail,
      timestamp: Date.now()
    })

    /* 同时发布通用事件 */
    const genericEvent = action === 'created' ? DataEvents.CREATED
      : action === 'updated' ? DataEvents.UPDATED
      : action === 'deleted' ? DataEvents.DELETED
      : null
    if (genericEvent) {
      this.emit(genericEvent, {
        module,
        action,
        ...detail,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 订阅特定模块的数据变更
   * @param {string} module - 模块名称
   * @param {Function} handler - 处理函数 (data) => void
   * @returns {Function} 取消订阅函数
   */
  onModuleChange(module, handler) {
    return this.on(`${module}:updated`, handler)
  }

  /**
   * 订阅特定模块的创建事件
   * @param {string} module - 模块名称
   * @param {Function} handler - 处理函数
   * @returns {Function} 取消订阅函数
   */
  onModuleCreate(module, handler) {
    return this.on(`${module}:created`, handler)
  }

  /**
   * 订阅特定模块的删除事件
   * @param {string} module - 模块名称
   * @param {Function} handler - 处理函数
   * @returns {Function} 取消订阅函数
   */
  onModuleDelete(module, handler) {
    return this.on(`${module}:deleted`, handler)
  }

  /**
   * 获取事件历史
   * @param {string} [eventFilter] - 事件名过滤
   * @param {number} [limit=50] - 返回条数
   * @returns {Array} 事件历史
   */
  getHistory(eventFilter, limit = 50) {
    let history = this._history
    if (eventFilter) {
      history = history.filter(h => h.event.startsWith(eventFilter))
    }
    return history.slice(-limit)
  }

  /**
   * 获取事件统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalEmitted: this._stats.totalEmitted,
      byType: { ...this._stats.byType },
      activeListeners: this._listeners.size,
      wildcardListeners: this._wildcardListeners.size
    }
  }

  /**
   * 设置调试模式
   * @param {boolean} enabled - 是否启用
   */
  setDebug(enabled) {
    this._debug = !!enabled
  }

  /**
   * 清除所有监听器
   */
  clear() {
    this._listeners.clear()
    this._wildcardListeners.clear()
  }
}

/* 全局单例 */
const eventBus = new EventBus()

export default eventBus
