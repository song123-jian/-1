import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SupabaseClient } from '../lib/supabase.js'
import { API } from '../services/api.js'

const CONFIG_URL_KEY = 'gj_erp_sb_url'
const CONFIG_KEY_KEY = 'gj_erp_sb_key'
const SYNC_STATUS_KEY = 'gj_erp_sb_sync_status'

/* AES-GCM 解密（与 lib/supabase.js 保持一致） */
const APP_SECRET = 'gj_erp_v1_secret_key_2024'

async function getCryptoKey() {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(APP_SECRET), { name: 'PBKDF2' }, false, ['deriveKey'])
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
  } catch (e) {
    return ''
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
  const syncStatus = ref({}) // { resource: 'syncing'|'synced'|'error'|'idle' }
  const syncErrors = ref([])

  const isConnected = computed(() => connected.value && SupabaseClient.isConnected())

  const connectionSummary = computed(() => {
    if (!connected.value) return '未连接'
    const syncedCount = Object.values(syncStatus.value).filter((s) => s === 'synced').length
    const total = Object.keys(API.TABLE_MAP).length
    return `已连接 · ${syncedCount}/${total} 表已同步`
  })

  /**
   * 测试连接
   */
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

  /**
   * 连接到 Supabase
   */
  async function connect() {
    connecting.value = true
    try {
      const client = await SupabaseClient.init(url.value, anonKey.value)
      if (client) {
        connected.value = true
        return { success: true }
      }
      return { success: false, message: '初始化失败' }
    } catch (e) {
      return { success: false, message: e.message }
    } finally {
      connecting.value = false
    }
  }

  /**
   * 断开连接
   */
  function disconnect() {
    SupabaseClient.disconnect()
    connected.value = false
    url.value = ''
    anonKey.value = ''
    syncStatus.value = {}
    syncErrors.value = []
  }

  /**
   * 自动恢复连接
   */
  async function autoConnect() {
    try {
      const client = await SupabaseClient.autoInit()
      if (client) {
        connected.value = true
        // 同步更新 store 中的配置
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

  /**
   * 同步单个资源：本地 [右] 服务器
   */
  async function pushToServer(resource, localData) {
    if (!isConnected.value) return false
    syncStatus.value[resource] = 'syncing'
    try {
      const ok = await API.syncToServer(resource, localData)
      syncStatus.value[resource] = ok ? 'synced' : 'error'
      if (ok) lastSyncTime.value = new Date().toISOString()
      return ok
    } catch (e) {
      syncStatus.value[resource] = 'error'
      syncErrors.value.push({ resource, action: 'push', error: e.message, time: new Date().toISOString() })
      return false
    }
  }

  /**
   * 同步单个资源：服务器 [右] 本地
   */
  async function pullFromServer(resource) {
    if (!isConnected.value) return null
    syncStatus.value[resource] = 'syncing'
    try {
      const data = await API.syncFromServer(resource)
      if (data !== null) {
        syncStatus.value[resource] = 'synced'
        lastSyncTime.value = new Date().toISOString()
      } else {
        syncStatus.value[resource] = 'error'
      }
      return data
    } catch (e) {
      syncStatus.value[resource] = 'error'
      syncErrors.value.push({ resource, action: 'pull', error: e.message, time: new Date().toISOString() })
      return null
    }
  }

  /**
   * 全量同步：推送所有本地数据到服务器
   */
  async function pushAll(stores) {
    if (!isConnected.value) return
    const resources = [
      { name: 'customers', store: stores.customer, dataKey: 'customers' },
      { name: 'quotations', store: stores.quotation, dataKey: 'quotations' },
      { name: 'contracts', store: stores.contract, dataKey: 'contracts' },
      { name: 'inventory', store: stores.inventory, dataKey: 'enrichedInventory' },
      { name: 'deliveries', store: stores.delivery, dataKey: 'deliveries' },
      { name: 'collections', store: stores.collection, dataKey: 'collections' },
      { name: 'statements', store: stores.statement, dataKey: 'statements' },
      { name: 'todos', store: stores.todo, dataKey: 'todos' },
      { name: 'inbound_orders', store: stores.inventory, dataKey: 'inboundOrders' },
      { name: 'outbound_orders', store: stores.inventory, dataKey: 'outboundOrders' },
      { name: 'cost_records', store: stores.cost, dataKey: 'records' },
      { name: 'warehouse_locations', store: stores.warehouseLocation, dataKey: 'locations' },
      { name: 'suppliers', store: stores.supplier, dataKey: 'suppliers' }
    ]

    for (const r of resources) {
      if (r.store && r.store[r.dataKey]) {
        await pushToServer(r.name, r.store[r.dataKey])
      }
    }
  }

  /**
   * 全量拉取：从服务器拉取所有数据到本地
   */
  async function pullAll() {
    if (!isConnected.value) return {}
    const resources = [
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
      'warehouse_locations'
    ]

    const result = {}
    for (const r of resources) {
      result[r] = await pullFromServer(r)
    }
    return result
  }

  /**
   * 订阅实时变更
   */
  function subscribeRealtime(resource, callbacks) {
    const tableName = API.getTableName(resource)
    return SupabaseClient.subscribe(tableName, callbacks)
  }

  /**
   * 清除同步错误记录
   */
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
