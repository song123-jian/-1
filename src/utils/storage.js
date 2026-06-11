const DEFAULT_PREFIX = 'gj_erp_'

class StorageManager {
  constructor(prefix = DEFAULT_PREFIX) {
    this._prefix = prefix
  }

  /* ========== 基础方法 ========== */

  getItem(key) {
    try { return localStorage.getItem(this._prefix + key) } catch { return null }
  }

  setItem(key, value) {
    try { localStorage.setItem(this._prefix + key, value) } catch (e) { console.error('存储失败:', key, e) }
  }

  removeItem(key) {
    try { localStorage.removeItem(this._prefix + key) } catch { /* ignore */ }
  }

  /* ========== JSON 方法 ========== */

  getJSON(key) {
    try { const r = localStorage.getItem(this._prefix + key); return r ? JSON.parse(r) : null } catch { return null }
  }

  setJSON(key, data) {
    try { localStorage.setItem(this._prefix + key, JSON.stringify(data)) } catch (e) { console.error('存储失败:', key, e) }
  }

  /* ========== TTL 方法 ========== */

  setWithTTL(key, value, ttlMs) {
    const item = { value, expiry: Date.now() + ttlMs }
    try {
      localStorage.setItem(this._prefix + key, JSON.stringify(item))
    } catch (e) { console.error('存储失败:', key, e) }
  }

  getWithTTL(key) {
    const raw = localStorage.getItem(this._prefix + key)
    if (!raw) return null
    try {
      const item = JSON.parse(raw)
      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(this._prefix + key)
        return null
      }
      return item.value
    } catch { return null }
  }

  /* ========== 命名空间方法 ========== */

  namespace(ns) {
    return new StorageManager(this._prefix + ns + '_')
  }
}

/* 全局单例 */
const storage = new StorageManager()

/* 兼容原有导出 */
export function safeGetItem(key) {
  return storage.getItem(key)
}
export function safeSetItem(key, value) {
  storage.setItem(key, value)
}
export function safeGetJSON(key) {
  return storage.getJSON(key)
}
export function safeSetJSON(key, data) {
  storage.setJSON(key, data)
}
export function safeRemoveItem(key) {
  storage.removeItem(key)
}

export default storage
