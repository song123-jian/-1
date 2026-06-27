import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SupabaseClient } from '../lib/supabase.js'
import { API } from '../services/api.js'

const CONFIG_URL_KEY = 'gj_erp_sb_url'
const CONFIG_KEY_KEY = 'gj_erp_sb_key'
const SYNC_STATUS_KEY = 'gj_erp_sb_sync_status'
const SYNC_RESOURCES = [
  'customers',
  'quotations',
  'contracts',
  'inventory',
  'inbound_orders',
  'outbound_orders',
  'deliveries',
  'collections',
  'statements',
  'todos',
  'cost_records',
  'warehouse_locations',
  'suppliers'
]

const PUSH_RESOURCES = [
  { name: 'customers', storeKey: 'customer', dataKey: 'customers' },
  { name: 'quotations', storeKey: 'quotation', dataKey: 'quotations' },
  { name: 'contracts', storeKey: 'contract', dataKey: 'contracts' },
  { name: 'inventory', storeKey: 'inventory', dataKey: 'enrichedInventory' },
  { name: 'deliveries', storeKey: 'delivery', dataKey: 'deliveries' },
  { name: 'collections', storeKey: 'collection', dataKey: 'collections' },
  { name: 'statements', storeKey: 'statement', dataKey: 'statements' },
  { name: 'todos', storeKey: 'todo', dataKey: 'todos' },
  { name: 'inbound_orders', storeKey: 'inventory', dataKey: 'inboundOrders' },
  { name: 'outbound_orders', storeKey: 'inventory', dataKey: 'outboundOrders' },
  { name: 'cost_records', storeKey: 'cost', dataKey: 'records' },
  { name: 'warehouse_locations', storeKey: 'warehouseLocation', dataKey: 'locations' },
  { name: 'suppliers', storeKey: 'supplier', dataKey: 'suppliers' }
]

const APP_SECRET = 'gj_erp_v1_secret_key_2024'

async function getCryptoKey() {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(APP_SECRET), { name: 'PBKDF2' }, false, [
    'deriveKey'
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('gj_erp_salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

async function decryptKey(cipherText) {
  try {
    if (!cipherText) return ''
    const key = await getCryptoKey()
    const combined = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''
  }
}

function normalizeSyncStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== 'object') return {}

  return Object.fromEntries(
    Object.entries(rawStatus).map(([resource, status]) => [resource, status === 'syncing' ? 'idle' : status])
  )
}

function loadStoredSyncStatus() {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY)
    if (!raw) return {}
    return normalizeSyncStatus(JSON.parse(raw))
  } catch {
    return {}
  }
}

export const useSupabaseStore = defineStore('supabase', () => {
  const url = ref(localStorage.getItem(CONFIG_URL_KEY) || '')
  const anonKey = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const testing = ref(false)
  const testResult = ref(null)
  const lastSyncTime = ref(null)
  const syncStatus = ref(loadStoredSyncStatus()) // { resource: 'syncing'|'synced'|'error'|'idle' }
  const syncErrors = ref([])

  const isConnected = computed(() => connected.value && SupabaseClient.isConnected())

  const connectionSummary = computed(() => {
    if (!connected.value) return '未连接'
    const syncedCount = SYNC_RESOURCES.filter((resource) => syncStatus.value[resource] === 'synced').length
    return `已连接 · ${syncedCount}/${SYNC_RESOURCES.length} 表已同步`
  })

  function persistSyncStatus() {
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(syncStatus.value))
  }

  function loadSyncStatus() {
    syncStatus.value = loadStoredSyncStatus()
  }

  function setSyncStatus(resource, status) {
    syncStatus.value = {
      ...syncStatus.value,
      [resource]: status
    }
    persistSyncStatus()
  }

  async function testConnection() {
    testing.value = true
    testResult.value = null
    try {
      const result = await API.testConnection(url.value, anonKey.value)
      testResult.value = result
      return result
    } catch (e) {
      testResult.value = { success: false, message: e.message }
      return testResult.value
    } finally {
      testing.value = false
    }
  }

  async function connect() {
    connecting.value = true
    try {
      const client = await SupabaseClient.init(url.value, anonKey.value)
      if (client) {
        connected.value = true
        loadSyncStatus()
        return { success: true }
      }
      return { success: false, message: '初始化失败' }
    } catch (e) {
      return { success: false, message: e.message }
    } finally {
      connecting.value = false
    }
  }

  function disconnect() {
    SupabaseClient.disconnect()
    connected.value = false
    url.value = ''
    anonKey.value = ''
    syncStatus.value = {}
    syncErrors.value = []
    localStorage.removeItem(SYNC_STATUS_KEY)
  }

  async function autoConnect() {
    try {
      const client = await SupabaseClient.autoInit()
      if (client) {
        connected.value = true
        loadSyncStatus()
        url.value = localStorage.getItem(CONFIG_URL_KEY) || ''
        const storedKey = await decryptKey(localStorage.getItem(CONFIG_KEY_KEY))
        anonKey.value = storedKey || ''
        console.debug('[SupabaseStore] 自动连接成功')
        return true
      }
    } catch (e) {
      console.warn('[SupabaseStore] 自动连接失败:', e.message)
    }
    return false
  }

  async function pushToServer(resource, localData) {
    if (!isConnected.value) return false
    setSyncStatus(resource, 'syncing')
    try {
      const ok = await API.syncToServer(resource, localData)
      setSyncStatus(resource, ok ? 'synced' : 'error')
      if (ok) lastSyncTime.value = new Date().toISOString()
      return ok
    } catch (e) {
      setSyncStatus(resource, 'error')
      syncErrors.value.push({ resource, action: 'push', error: e.message, time: new Date().toISOString() })
      return false
    }
  }

  async function pullFromServer(resource) {
    if (!isConnected.value) return null
    setSyncStatus(resource, 'syncing')
    try {
      const data = await API.syncFromServer(resource)
      if (data !== null) {
        setSyncStatus(resource, 'synced')
        lastSyncTime.value = new Date().toISOString()
      } else {
        setSyncStatus(resource, 'error')
      }
      return data
    } catch (e) {
      setSyncStatus(resource, 'error')
      syncErrors.value.push({ resource, action: 'pull', error: e.message, time: new Date().toISOString() })
      return null
    }
  }

  async function pushAll(stores) {
    if (!isConnected.value) return

    for (const resource of PUSH_RESOURCES) {
      const store = stores[resource.storeKey]
      if (store && store[resource.dataKey]) {
        await pushToServer(resource.name, store[resource.dataKey])
      }
    }
  }

  async function pullAll() {
    if (!isConnected.value) return {}

    const result = {}
    for (const resource of SYNC_RESOURCES) {
      result[resource] = await pullFromServer(resource)
    }
    return result
  }

  function subscribeRealtime(resource, callbacks) {
    const tableName = API.getTableName(resource)
    return SupabaseClient.subscribe(tableName, callbacks)
  }

  function clearErrors() {
    syncErrors.value = []
  }

  return {
    url,
    anonKey,
    connected,
    connecting,
    testing,
    testResult,
    lastSyncTime,
    syncStatus,
    syncErrors,
    syncResources: SYNC_RESOURCES,
    isConnected,
    connectionSummary,
    testConnection,
    connect,
    disconnect,
    autoConnect,
    pushToServer,
    pullFromServer,
    pushAll,
    pullAll,
    subscribeRealtime,
    clearErrors
  }
})
