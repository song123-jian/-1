/**
 * 数据缓存管理器
 * 对频繁访问的数据进行内存缓存，减少重复计算和localStorage读取
 * 支持：
 * - TTL过期策略
 * - LRU淘汰策略
 * - 命名空间隔离
 * - 缓存命中率统计
 * - 手动失效与自动刷新
 */

/* 缓存项结构 */
class CacheItem {
  constructor(key, value, ttl) {
    this.key = key
    this.value = value
    this.createdAt = Date.now()
    this.accessedAt = Date.now()
    this.accessCount = 0
    this.ttl = ttl || 0 /* 0表示永不过期 */
    this.version = 1
  }

  get isExpired() {
    if (this.ttl === 0) return false
    return Date.now() - this.createdAt > this.ttl
  }

  touch() {
    this.accessedAt = Date.now()
    this.accessCount++
  }
}

class DataCache {
  constructor(options = {}) {
    /* 最大缓存条目数 */
    this._maxSize = options.maxSize || 500
    /* 默认TTL（毫秒），5分钟 */
    this._defaultTTL = options.defaultTTL || 5 * 60 * 1000
    /* 缓存存储：namespace [右] Map<string, CacheItem> */
    this._cache = new Map()
    /* 统计信息 */
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0
    }
    /* 定期清理定时器 */
    this._cleanupInterval = null
    /* 是否启用 */
    this._enabled = true
  }

  /**
   * 初始化缓存，启动定期清理
   */
  init() {
    if (this._cleanupInterval) return
    /* 每60秒清理一次过期缓存 */
    this._cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {Object} options - 选项 { ttl, namespace }
   */
  set(key, value, options = {}) {
    if (!this._enabled) return

    const namespace = options.namespace || 'default'
    const ttl = options.ttl !== undefined ? options.ttl : this._defaultTTL
    const cacheKey = `${namespace}:${key}`

    /* 检查容量，超限则LRU淘汰 */
    if (this._cache.size >= this._maxSize && !this._cache.has(cacheKey)) {
      this._evictLRU()
    }

    const item = new CacheItem(cacheKey, value, ttl)
    if (this._cache.has(cacheKey)) {
      item.version = (this._cache.get(cacheKey).version || 0) + 1
    }
    this._cache.set(cacheKey, item)
    this._stats.sets++
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @param {Object} options - 选项 { namespace, fallback }
   * @returns {*} 缓存值，未命中返回 undefined 或 fallback
   */
  get(key, options = {}) {
    if (!this._enabled) return options.fallback ? options.fallback() : undefined

    const namespace = options.namespace || 'default'
    const cacheKey = `${namespace}:${key}`
    const item = this._cache.get(cacheKey)

    if (!item) {
      this._stats.misses++
      return options.fallback ? options.fallback() : undefined
    }

    if (item.isExpired) {
      this._cache.delete(cacheKey)
      this._stats.misses++
      return options.fallback ? options.fallback() : undefined
    }

    item.touch()
    this._stats.hits++
    return item.value
  }

  /**
   * 批量设置缓存
   * @param {Array<{key, value}>} entries - 缓存条目数组
   * @param {Object} options - 选项 { ttl, namespace }
   */
  setBatch(entries, options = {}) {
    for (const { key, value } of entries) {
      this.set(key, value, options)
    }
  }

  /**
   * 批量获取缓存
   * @param {string[]} keys - 缓存键数组
   * @param {Object} options - 选项
   * @returns {Map<string, *>} 键值映射
   */
  getBatch(keys, options = {}) {
    const result = new Map()
    for (const key of keys) {
      result.set(key, this.get(key, options))
    }
    return result
  }

  /**
   * 使缓存失效
   * @param {string} key - 缓存键
   * @param {Object} options - 选项 { namespace }
   */
  invalidate(key, options = {}) {
    const namespace = options.namespace || 'default'
    const cacheKey = `${namespace}:${key}`
    if (this._cache.delete(cacheKey)) {
      this._stats.invalidations++
    }
  }

  /**
   * 使整个命名空间的缓存失效
   * @param {string} namespace - 命名空间
   */
  invalidateNamespace(namespace) {
    const prefix = `${namespace}:`
    /* 先收集待删除键到数组，再遍历数组删除，避免在迭代中删除 Map 条目 */
    const keysToDelete = []
    for (const [key] of this._cache) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }
    for (const key of keysToDelete) {
      this._cache.delete(key)
      this._stats.invalidations++
    }
  }

  /**
   * 使所有缓存失效
   */
  invalidateAll() {
    const count = this._cache.size
    this._cache.clear()
    this._stats.invalidations += count
  }

  /**
   * 获取或设置缓存（如果未命中则调用fetcher获取并缓存）
   * @param {string} key - 缓存键
   * @param {Function} fetcher - 数据获取函数
   * @param {Object} options - 选项 { ttl, namespace }
   * @returns {*} 缓存值或fetcher返回值
   */
  async getOrSet(key, fetcher, options = {}) {
    const cached = this.get(key, options)
    if (cached !== undefined) return cached

    const value = await fetcher()
    this.set(key, value, options)
    return value
  }

  /**
   * LRU淘汰策略
   * 淘汰最久未访问的缓存项
   */
  _evictLRU() {
    let oldest = null
    let oldestKey = null

    for (const [key, item] of this._cache) {
      if (!oldest || item.accessedAt < oldest.accessedAt) {
        oldest = item
        oldestKey = key
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey)
      this._stats.evictions++
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const keysToDelete = []
    for (const [key, item] of this._cache) {
      if (item.isExpired) {
        keysToDelete.push(key)
      }
    }
    for (const key of keysToDelete) {
      this._cache.delete(key)
      this._stats.evictions++
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses
    return {
      ...this._stats,
      size: this._cache.size,
      maxSize: this._maxSize,
      hitRate: total > 0 ? ((this._stats.hits / total) * 100).toFixed(1) + '%' : '0%'
    }
  }

  /**
   * 获取命名空间下的所有缓存键
   * @param {string} namespace - 命名空间
   * @returns {string[]} 缓存键列表
   */
  getNamespaceKeys(namespace) {
    const prefix = `${namespace}:`
    const keys = []
    for (const [key] of this._cache) {
      if (key.startsWith(prefix)) {
        keys.push(key.slice(prefix.length))
      }
    }
    return keys
  }

  /**
   * 启用/禁用缓存
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = !!enabled
    if (!enabled) this._cache.clear()
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval)
      this._cleanupInterval = null
    }
    this._cache.clear()
  }
}

/* 全局单例 */
const dataCache = new DataCache()

export default dataCache
