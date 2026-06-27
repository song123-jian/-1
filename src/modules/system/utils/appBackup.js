import dataCache from '@/utils/dataCache'

const STORAGE_PREFIXES = ['gj_erp_', 'ds-']
const EXCLUDED_EXPORT_KEYS = ['gj_erp_dataManagement']
const CACHE_KEYS = [
  'gj_erp_viewState',
  'gj_erp_layoutState',
  'gj_erp_autoSave',
  'gj_erp_saveLog',
  'gj_erp_sb_sync_status'
]
const CACHE_PREFIXES = ['gj_erp_draft_']

function shouldIncludeKey(key, options = {}) {
  if (!key) return false
  if (!STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) return false
  if (options.excludeBackups !== false && EXCLUDED_EXPORT_KEYS.includes(key)) return false
  return true
}

function collectLocalSnapshot(options = {}) {
  const snapshot = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!shouldIncludeKey(key, options)) continue
    const value = localStorage.getItem(key)
    if (value !== null) snapshot[key] = value
  }
  return snapshot
}

function payloadSize(payload) {
  return new TextEncoder().encode(JSON.stringify(payload)).length
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

export function createAppBackupPayload(description = '手动备份') {
  const localSnapshot = collectLocalSnapshot()
  return {
    version: '2.0',
    app: 'gj_erp',
    mode: 'full_snapshot',
    description,
    exportedAt: new Date().toISOString(),
    keyCount: Object.keys(localSnapshot).length,
    storage: {
      localStorage: localSnapshot
    }
  }
}

export function createBackupRecord(description = '手动备份') {
  const payload = createAppBackupPayload(description)
  return {
    id: 'bk' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    description,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    type: 'manual',
    version: payload.version,
    keyCount: payload.keyCount,
    size: formatSize(payloadSize(payload)),
    payload
  }
}

export function serializeBackupPayload(description = '手动备份') {
  return JSON.stringify(createAppBackupPayload(description), null, 2)
}

export function isAppBackupPayload(input) {
  if (!input || typeof input !== 'object') return false
  return !!input.storage?.localStorage && input.mode === 'full_snapshot'
}

export function parseAppBackup(input) {
  const payload = typeof input === 'string' ? JSON.parse(input) : input
  if (!isAppBackupPayload(payload)) {
    throw new Error('不是有效的完整备份文件')
  }
  return payload
}

export function restoreAppBackup(input, options = {}) {
  const payload = parseAppBackup(input)
  const preserveKeys = new Set(options.preserveKeys || [])
  const keysToRemove = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!shouldIncludeKey(key, { excludeBackups: false }) || preserveKeys.has(key)) continue
    keysToRemove.push(key)
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
  Object.entries(payload.storage.localStorage).forEach(([key, value]) => {
    if (!preserveKeys.has(key)) localStorage.setItem(key, value)
  })

  return payload
}

export function clearRuntimeCache() {
  dataCache.invalidateAll()
  const keys = new Set(CACHE_KEYS)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.add(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
  return keys.size
}
