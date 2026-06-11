/**
 * 统一事件总线 - 数据变更通知机制
 * 实现模块间数据变更的发布/订阅模式，支持：
 * - 数据变更通知（创建/更新/删除）
 * - 模块间实时数据同步
 * - 事件过滤与命名空间
 * - 事件历史记录与调试
 * - 一次性订阅与优先级
 */

type EventHandler = (...args: any[]) => void

interface ListenerEntry {
  handler: EventHandler
  once: boolean
  priority: number
}

interface EventHistoryEntry {
  event: string
  data: Record<string, unknown> | null
  timestamp: number
}

interface StatsData {
  totalEmitted: number
  byType: Record<string, number>
}

/* 事件类型常量 */
export const DataEvents = {
  CREATED: 'data:created',
  UPDATED: 'data:updated',
  DELETED: 'data:deleted',
  BATCH_UPDATED: 'data:batch_updated',
  BATCH_DELETED: 'data:batch_deleted',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  CACHE_INVALIDATED: 'cache:invalidated',
  CACHE_UPDATED: 'cache:updated',
  VERSION_CREATED: 'version:created',
  VERSION_RESTORED: 'version:restored'
} as const

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
} as const

class EventBus {
  private _listeners: Map<string, Set<ListenerEntry>> = new Map()
  private _wildcardListeners: Set<ListenerEntry> = new Set()
  private _history: EventHistoryEntry[] = []
  private _maxHistory = 200
  private _debug = false
  private _stats: StatsData = { totalEmitted: 0, byType: {} }

  on(event: string, handler: EventHandler, options: { once?: boolean; priority?: number } = {}): () => void {
    if (typeof handler !== 'function') {
      console.warn('[EventBus] handler 必须是函数')
      return () => {}
    }

    const listener: ListenerEntry = {
      handler,
      once: options.once || false,
      priority: options.priority || 0
    }

    if (event === '*') {
      this._wildcardListeners.add(listener)
      return () => { this._wildcardListeners.delete(listener) }
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }

    this._listeners.get(event)!.add(listener)
    return () => this.off(event, handler)
  }

  once(event: string, handler: EventHandler): () => void {
    return this.on(event, handler, { once: true })
  }

  off(event: string, handler: EventHandler): void {
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

  emit(event: string, data?: unknown): void {
    this._stats.totalEmitted++
    this._stats.byType[event] = (this._stats.byType[event] || 0) + 1

    this._history.push({
      event,
      data: data as Record<string, unknown> | null,
      timestamp: Date.now()
    })
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory)
    }

    if (this._debug) {
      console.info(`[EventBus] ${event}`, data)
    }

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

    for (const listener of this._wildcardListeners) {
      try {
        listener.handler(event, data)
      } catch (e) {
        console.error('[EventBus] 通配符处理错误:', e)
      }
      if (listener.once) {
        this._wildcardListeners.delete(listener)
      }
    }
  }

  emitDataChange(module: string, action: string, detail: Record<string, unknown>): void {
    const event = `${module}:${action}`
    this.emit(event, { module, action, ...detail, timestamp: Date.now() })

    const genericEvent = action === 'created' ? DataEvents.CREATED
      : action === 'updated' ? DataEvents.UPDATED
      : action === 'deleted' ? DataEvents.DELETED
      : null
    if (genericEvent) {
      this.emit(genericEvent, { module, action, ...detail, timestamp: Date.now() })
    }
  }

  onModuleChange(module: string, handler: EventHandler): () => void {
    return this.on(`${module}:updated`, handler)
  }

  onModuleCreate(module: string, handler: EventHandler): () => void {
    return this.on(`${module}:created`, handler)
  }

  onModuleDelete(module: string, handler: EventHandler): () => void {
    return this.on(`${module}:deleted`, handler)
  }

  onWithLifecycle(
    event: string,
    handler: EventHandler,
    componentInstance: Record<string, unknown> | null,
    options: { once?: boolean; priority?: number } = {}
  ): () => void {
    const unsubscribe = this.on(event, handler, options)

    if (componentInstance && typeof componentInstance === 'object') {
      const fns = (componentInstance as any).__cleanup_fns
      if (Array.isArray(fns)) {
        fns.push(unsubscribe)
      } else {
        ;(componentInstance as any).__cleanup_fns = [unsubscribe]
      }
    }

    return unsubscribe
  }

  cleanupByComponent(componentInstance: Record<string, unknown> | null): void {
    if (componentInstance) {
      const fns = (componentInstance as any).__cleanup_fns as Function[] | undefined
      if (Array.isArray(fns)) {
        fns.forEach(fn => { try { fn() } catch (e) { /* ignore */ } })
        ;(componentInstance as any).__cleanup_fns = []
      }
    }
  }

  getHistory(eventFilter?: string, limit = 50): EventHistoryEntry[] {
    let history = this._history
    if (eventFilter) {
      history = history.filter(h => h.event.startsWith(eventFilter))
    }
    return history.slice(-limit)
  }

  getStats(): { totalEmitted: number; byType: Record<string, number>; activeListeners: number; wildcardListeners: number } {
    return {
      totalEmitted: this._stats.totalEmitted,
      byType: { ...this._stats.byType },
      activeListeners: this._listeners.size,
      wildcardListeners: this._wildcardListeners.size
    }
  }

  setDebug(enabled: boolean): void {
    this._debug = !!enabled
  }

  clear(): void {
    this._listeners.clear()
    this._wildcardListeners.clear()
  }

  reset(): void {
    this._listeners.clear()
    this._wildcardListeners.clear()
    this._history = []
    this._stats = { totalEmitted: 0, byType: {} }
  }
}

/* 全局单例 */
const eventBus = new EventBus()

export default eventBus