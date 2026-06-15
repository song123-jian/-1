/**
 * 测试环境全局设置
 * 模拟 localStorage, sessionStorage, indexedDB, Pinia 等
 */
import { setActivePinia, createPinia } from 'pinia'

/* ===== localStorage / sessionStorage Mock ===== */
const storageMock = (() => {
  const store = {}
  return {
    getItem(key) {
      return store[key] !== undefined ? store[key] : null
    },
    setItem(key, value) {
      store[key] = String(value)
    },
    removeItem(key) {
      delete store[key]
    },
    clear() {
      Object.keys(store).forEach(key => delete store[key])
    },
    get length() {
      return Object.keys(store).length
    },
    key(index) {
      const keys = Object.keys(store)
      return keys[index] || null
    },
    _store: store
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: storageMock, writable: true })

/* ===== indexedDB Mock ===== */
const idbMock = {
  open: () => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      objectStoreNames: { contains: () => false },
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ onsuccess: null, onerror: null }),
          put: () => ({ onsuccess: null, onerror: null })
        })
      }),
      createObjectStore: () => {}
    }
  })
}
Object.defineProperty(globalThis, 'indexedDB', { value: idbMock, writable: true })

/* ===== fetch Mock ===== */
globalThis.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
  text: () => Promise.resolve('')
}))

/* ===== createObjectURL / revokeObjectURL Mock ===== */
globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
globalThis.URL.revokeObjectURL = vi.fn()

/* ===== Blob Mock ===== */
globalThis.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts
    this.options = options
    this.size = parts.reduce((s, p) => s + (p.length || 0), 0)
    this.type = options?.type || ''
  }
}

/* ===== DOMPurify Mock ===== */
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html) => html,
    setConfig: vi.fn(),
    addHook: vi.fn()
  }
}))

/* ===== Pinia Setup ===== */
export function setupPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/* ===== 清除所有 localStorage 数据 ===== */
export function clearStorage() {
  localStorage.clear()
  sessionStorage.clear()
}

/* ===== 清除所有初始化标记 ===== */
export function clearInitFlags() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.includes('_initialized')) {
      keys.push(key)
    }
  }
  keys.forEach(key => localStorage.removeItem(key))
}

/* ===== 全局 beforeEach ===== */
beforeEach(() => {
  clearStorage()
  clearInitFlags()
})
