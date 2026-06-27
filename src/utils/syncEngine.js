/**
 * 双向增量同步引擎
 * 负责本地 Pinia Store 与 Supabase 云端之间的自动双向增量同步
 * 支持实时订阅、增量拉取/推送、冲突合并、离线队列
 */

import { ref, computed } from 'vue'
import { SupabaseClient } from '@/lib/supabase.js'
import { API } from '@/services/api.js'
import { mergeArrays } from '@/utils/conflictResolver.js'
import eventBus from '@/utils/eventBus.js'

import { useCustomerStore } from '@/modules/customer/stores/customer'
import { useQuotationStore } from '@/modules/sales/stores/quotation'
import { useContractStore } from '@/modules/sales/stores/contract'
import { useInventoryStore } from '@/modules/warehouse/stores/inventory'
import { useDeliveryStore } from '@/stores/delivery'
import { useCollectionStore } from '@/modules/finance/stores/collection'
import { useStatementStore } from '@/modules/finance/stores/statement'
import { useTodoStore } from '@/stores/todo'
import { useCostStore } from '@/modules/finance/stores/cost'
import { useWarehouseLocationStore } from '@/modules/warehouse/stores/warehouseLocation'
import { useSupplierStore } from '@/modules/purchase/stores/supplier'

const SYNC_MAP = {
  customers: { storeName: 'customer', dataKey: 'customers' },
  quotations: { storeName: 'quotation', dataKey: 'quotations' },
  contracts: { storeName: 'contract', dataKey: 'contracts' },
  inventory: { storeName: 'inventory', dataKey: 'inventory' },
  inbound_orders: { storeName: 'inventory', dataKey: 'inboundOrders' },
  outbound_orders: { storeName: 'inventory', dataKey: 'outboundOrders' },
  deliveries: { storeName: 'delivery', dataKey: 'deliveries' },
  collections: { storeName: 'collection', dataKey: 'collections' },
  statements: { storeName: 'statement', dataKey: 'statements' },
  todos: { storeName: 'todo', dataKey: 'todos' },
  cost_records: { storeName: 'cost', dataKey: 'records' },
  warehouse_locations: { storeName: 'warehouseLocation', dataKey: 'locations' },
  suppliers: { storeName: 'supplier', dataKey: 'suppliers' }
}

const _storeCache = new Map()

function getStore(storeName) {
  if (_storeCache.has(storeName)) {
    return _storeCache.get(storeName)
  }
  let store
  switch (storeName) {
    case 'customer':
      store = useCustomerStore()
      break
    case 'quotation':
      store = useQuotationStore()
      break
    case 'contract':
      store = useContractStore()
      break
    case 'inventory':
      store = useInventoryStore()
      break
    case 'delivery':
      store = useDeliveryStore()
      break
    case 'collection':
      store = useCollectionStore()
      break
    case 'statement':
      store = useStatementStore()
      break
    case 'todo':
      store = useTodoStore()
      break
    case 'cost':
      store = useCostStore()
      break
    case 'warehouseLocation':
      store = useWarehouseLocationStore()
      break
    case 'supplier':
      store = useSupplierStore()
      break
    default:
      console.warn(`[SyncEngine] 未知 Store: ${storeName}`)
      return null
  }
  _storeCache.set(storeName, store)
  return store
}

const SYNC_STATE_KEY = 'gj_erp_syncState'
const syncState = ref(loadSyncState())
const isPulling = ref(false)
const isPushing = ref(false)
const isSyncing = computed(() => isPulling.value || isPushing.value)

const syncStats = ref({
  totalSynced: 0,
  totalErrors: 0,
  lastSyncTime: null
})

const pendingPush = ref(loadPendingPush())

const DELETED_IDS_KEY = 'gj_erp_deletedIds'
const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000
const deletedIds = ref(loadDeletedIds())

const _watcherStoppers = []
const _debounceTimers = new Map()

function loadSyncState() {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[SyncEngine] 加载同步状态失败:', e)
  }
  return {}
}

function saveSyncState() {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(syncState.value))
  } catch (e) {
    console.error('[SyncEngine] 保存同步状态失败:', e)
  }
}

function loadDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const result = {}
      for (const [table, ids] of Object.entries(parsed)) {
        if (Array.isArray(ids)) {
          const map = new Map()
          for (const id of ids) {
            map.set(id, 0)
          }
          result[table] = map
        } else if (typeof ids === 'object' && ids !== null) {
          result[table] = new Map(Object.entries(ids))
        }
      }
      return result
    }
  } catch (e) {
    console.warn('[SyncEngine] 加载删除墓碑失败:', e)
  }
  return {}
}

function saveDeletedIds() {
  try {
    cleanupTombstones()
    const toStore = {}
    for (const [table, idMap] of Object.entries(deletedIds.value)) {
      if (idMap.size > 0) {
        toStore[table] = Object.fromEntries(idMap)
      }
    }
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(toStore))
  } catch (e) {
    console.error('[SyncEngine] 保存删除墓碑失败:', e)
  }
}

function recordDeletedId(tableName, id) {
  if (!deletedIds.value[tableName]) {
    deletedIds.value[tableName] = new Map()
  }
  deletedIds.value[tableName].set(id, Date.now())
  saveDeletedIds()
}

function recordDeletedIds(tableName, ids) {
  if (!deletedIds.value[tableName]) {
    deletedIds.value[tableName] = new Map()
  }
  const now = Date.now()
  for (const id of ids) {
    deletedIds.value[tableName].set(id, now)
  }
  saveDeletedIds()
}

function isDeletedId(tableName, id) {
  const idMap = deletedIds.value[tableName]
  if (!idMap || !idMap.has(id)) return false
  const timestamp = idMap.get(id)
  if (Date.now() - timestamp > TOMBSTONE_TTL) {
    idMap.delete(id)
    saveDeletedIds()
    return false
  }
  return true
}

function clearDeletedId(tableName, id) {
  if (deletedIds.value[tableName]) {
    deletedIds.value[tableName].delete(id)
    saveDeletedIds()
  }
}

function cleanupTombstones() {
  const now = Date.now()
  let cleaned = 0
  for (const [table, idMap] of Object.entries(deletedIds.value)) {
    if (!idMap || !(idMap instanceof Map)) continue
    for (const [id, timestamp] of idMap) {
      if (now - timestamp > TOMBSTONE_TTL) {
        idMap.delete(id)
        cleaned++
      }
    }
    if (idMap.size === 0) {
      delete deletedIds.value[table]
    }
  }
  if (cleaned > 0) {
    console.debug(`[SyncEngine] 墓碑清理: 移除 ${cleaned} 条过期记录`)
  }
}

function loadPendingPush() {
  try {
    const raw = localStorage.getItem('gj_erp_pendingPush')
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[SyncEngine] 加载推送队列失败:', e)
  }
  return []
}

function savePendingPush() {
  try {
    localStorage.setItem('gj_erp_pendingPush', JSON.stringify(pendingPush.value))
  } catch (e) {
    console.error('[SyncEngine] 保存推送队列失败:', e)
  }
}

function initAutoSync() {
  if (!SupabaseClient.isConnected()) {
    console.warn('[SyncEngine] Supabase 未连接，无法启动自动同步')
    return false
  }

  try {
    incrementalPullAll()

    SupabaseClient.autoSubscribeTables({
      onInsert: handleRemoteInsert,
      onUpdate: handleRemoteUpdate,
      onDelete: handleRemoteDelete
    })

    watchStoreChanges()
    replayPendingPushes()

    console.debug('[SyncEngine] 自动同步已初始化')
    return true
  } catch (e) {
    console.error('[SyncEngine] 初始化自动同步失败:', e)
    return false
  }
}

async function incrementalPullAll() {
  if (isPulling.value) {
    console.warn('[SyncEngine] 拉取正在进行中，跳过本次拉取')
    return
  }

  isPulling.value = true
  let syncedCount = 0
  let errorCount = 0

  try {
    const tableNames = Object.keys(SYNC_MAP)

    const pullPromises = tableNames.map(async (tableName) => {
      const lastSync = syncState.value[tableName] || null
      const remoteData = await API.pullSince(tableName, lastSync)

      if (remoteData && remoteData.length > 0) {
        const { storeName, dataKey } = SYNC_MAP[tableName]
        mergeRemoteItems(storeName, dataKey, remoteData)
        return { tableName, count: remoteData.length }
      }
      return { tableName, count: 0 }
    })

    const results = await Promise.allSettled(pullPromises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        syncedCount += result.value.count
        syncState.value[result.value.tableName] = new Date().toISOString()
      } else {
        console.error('[SyncEngine] 拉取失败:', result.reason)
        errorCount++
      }
    }

    saveSyncState()

    syncStats.value.totalSynced += syncedCount
    syncStats.value.totalErrors += errorCount
    syncStats.value.lastSyncTime = new Date().toISOString()

    console.debug(`[SyncEngine] 增量拉取完成: 同步 ${syncedCount} 条, 错误 ${errorCount} 个`)
  } catch (e) {
    console.error('[SyncEngine] 增量拉取异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isPulling.value = false
  }
}

async function incrementalPushAll() {
  if (isPushing.value) {
    console.warn('[SyncEngine] 推送正在进行中，跳过本次推送')
    return
  }

  isPushing.value = true
  let syncedCount = 0
  let errorCount = 0

  try {
    for (const tableName of Object.keys(SYNC_MAP)) {
      try {
        const { storeName, dataKey } = SYNC_MAP[tableName]
        const store = getStore(storeName)
        if (!store) continue

        const localData = store[dataKey]
        if (!Array.isArray(localData) || localData.length === 0) continue

        const lastSync = syncState.value[tableName] || null

        let modifiedItems
        if (!lastSync) {
          modifiedItems = localData
        } else {
          const lastSyncTime = new Date(lastSync).getTime()
          modifiedItems = localData.filter((item) => {
            const updatedTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0
            const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : 0
            return updatedTime > lastSyncTime || createdTime > lastSyncTime
          })
        }

        if (modifiedItems.length === 0) continue

        await API.upsertToServer(tableName, modifiedItems)
        syncedCount += modifiedItems.length
        syncState.value[tableName] = new Date().toISOString()
      } catch (e) {
        console.error(`[SyncEngine] 推送 ${tableName} 失败:`, e)
        errorCount++
      }
    }

    saveSyncState()

    syncStats.value.totalSynced += syncedCount
    syncStats.value.totalErrors += errorCount
    syncStats.value.lastSyncTime = new Date().toISOString()

    console.debug(`[SyncEngine] 增量推送完成: 同步 ${syncedCount} 条, 错误 ${errorCount} 个`)
  } catch (e) {
    console.error('[SyncEngine] 增量推送异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isPushing.value = false
  }
}

async function incrementalPushTable(tableName, storeName, dataKey) {
  try {
    const store = getStore(storeName)
    if (!store || !store[dataKey]) return true

    const items = store[dataKey]
    if (!Array.isArray(items) || items.length === 0) return true

    const lastSync = syncState.value[tableName] || null
    let modified = items

    if (lastSync) {
      modified = items.filter((item) => {
        const updated = item.updatedAt || item.createdAt
        return updated && updated >= lastSync
      })
    }

    if (modified.length === 0) return true

    const success = await API.upsertToServer(tableName, modified)
    if (!success) {
      throw new Error(`推送 ${tableName} 返回失败`)
    }

    syncState.value[tableName] = new Date().toISOString()
    saveSyncState()
    syncStats.value.totalSynced += modified.length
    syncStats.value.lastSyncTime = new Date().toISOString()
    return true
  } catch (e) {
    console.error(`[SyncEngine] 推送 ${tableName} 失败:`, e)
    syncStats.value.totalErrors++
    return false
  }
}

async function replayPendingPushes() {
  if (!SupabaseClient.isConnected() || pendingPush.value.length === 0) return

  const queue = [...pendingPush.value]
  const completedTables = new Set()

  for (const item of queue) {
    const config = SYNC_MAP[item.table]
    if (!config) {
      completedTables.add(item.table)
      continue
    }

    const success = await incrementalPushTable(item.table, config.storeName, config.dataKey)
    if (success !== false) {
      completedTables.add(item.table)
    }
  }

  if (completedTables.size > 0) {
    pendingPush.value = pendingPush.value.filter((item) => !completedTables.has(item.table))
    savePendingPush()
  }
}

function handleRemoteInsert(tableName, record) {
  try {
    if (!record || !record.id) return
    if (isDeletedId(tableName, record.id)) return

    const config = SYNC_MAP[tableName]
    if (!config) return

    const { storeName, dataKey } = config
    const store = getStore(storeName)
    if (!store) return

    const currentData = store[dataKey]
    if (!Array.isArray(currentData)) return

    const exists = currentData.some((item) => item.id === record.id)
    if (exists) return

    currentData.push(record)
    persistStore(storeName, store, dataKey)

    console.debug(`[SyncEngine] 远端新增: ${tableName}/${record.id}`)
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 INSERT 失败 (${tableName}):`, e)
  }
}

function handleRemoteUpdate(tableName, record) {
  try {
    if (!record || !record.id) return
    if (isDeletedId(tableName, record.id)) return

    const config = SYNC_MAP[tableName]
    if (!config) return

    const { storeName, dataKey } = config
    const store = getStore(storeName)
    if (!store) return

    const currentData = store[dataKey]
    if (!Array.isArray(currentData)) return

    const idx = currentData.findIndex((item) => item.id === record.id)
    if (idx !== -1) {
      const localItem = currentData[idx]
      const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0
      const remoteTime = record.updatedAt ? new Date(record.updatedAt).getTime() : 0

      if (localTime > remoteTime) {
        console.debug(
          `[SyncEngine] 本地更新，保留本地版本: ${tableName}/${record.id} (本地 ${localItem.updatedAt} > 远端 ${record.updatedAt})`
        )
        queuePendingPush(tableName)
        return
      }

      currentData[idx] = record
    } else {
      currentData.push(record)
    }

    persistStore(storeName, store, dataKey)

    console.debug(`[SyncEngine] 远端更新: ${tableName}/${record.id}`)
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 UPDATE 失败 (${tableName}):`, e)
  }
}

function handleRemoteDelete(tableName, record) {
  try {
    if (!record || !record.id) return

    const config = SYNC_MAP[tableName]
    if (!config) return

    const { storeName, dataKey } = config
    const store = getStore(storeName)
    if (!store) return

    const currentData = store[dataKey]
    if (!Array.isArray(currentData)) return

    const filtered = currentData.filter((item) => item.id !== record.id)
    if (filtered.length !== currentData.length) {
      store[dataKey] = filtered
      console.debug(`[SyncEngine] 远端删除: ${tableName}/${record.id}`)
    }
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 DELETE 失败 (${tableName}):`, e)
  }
}

function mergeRemoteItems(storeName, dataKey, remoteItems) {
  try {
    const store = getStore(storeName)
    if (!store) return

    const localData = store[dataKey]
    if (!Array.isArray(localData)) return

    const tableName = Object.keys(SYNC_MAP).find(
      (t) => SYNC_MAP[t].storeName === storeName && SYNC_MAP[t].dataKey === dataKey
    )

    let filteredRemote = remoteItems
    if (tableName && deletedIds.value[tableName]?.size > 0) {
      const tombstone = deletedIds.value[tableName]
      filteredRemote = remoteItems.filter((item) => !tombstone.has(item.id))
      const filtered = remoteItems.length - filteredRemote.length
      if (filtered > 0) {
        console.debug(`[SyncEngine] 墓碑过滤: ${tableName} 跳过 ${filtered} 条已删除数据`)
      }
    }

    const merged = mergeArrays(localData, filteredRemote, 'id')

    if (store.replaceData && typeof store.replaceData === 'function') {
      if (storeName === 'inventory') {
        if (dataKey === 'inboundOrders' && store.replaceInbound) {
          store.replaceInbound(merged)
        } else if (dataKey === 'outboundOrders' && store.replaceOutbound) {
          store.replaceOutbound(merged)
        } else if (dataKey === 'inventory') {
          store.replaceData(merged)
        } else {
          store[dataKey] = merged
          persistStore(storeName, store, dataKey)
        }
      } else {
        store.replaceData(merged)
      }
    } else {
      store[dataKey] = merged
      persistStore(storeName, store, dataKey)
    }

    console.debug(`[SyncEngine] 合并完成: ${storeName}.${dataKey}, 远端 ${remoteItems.length} 条`)
  } catch (e) {
    console.error(`[SyncEngine] 合并远端数据失败 (${storeName}.${dataKey}):`, e)
  }
}

function persistStore(storeName, store, dataKey) {
  try {
    if (
      storeName === 'inventory' &&
      (dataKey === 'inboundOrders' || dataKey === 'outboundOrders' || dataKey === 'warehouseOrders')
    ) {
      if (store.persistOrders && typeof store.persistOrders === 'function') {
        store.persistOrders()
        return
      }
    }

    if (store.persist && typeof store.persist === 'function') {
      if (store.persist.length === 0) {
        store.persist()
        return
      }
    }

    if (store._save && typeof store._save === 'function') {
      store._save()
      return
    }

    if (store.save && typeof store.save === 'function') {
      const storageKey = getStorageKey(storeName, dataKey)
      if (storageKey) {
        store.save(storageKey, store[dataKey])
        return
      }
    }

    if (store.persist && typeof store.persist === 'function' && store.persist.length > 0) {
      const storageKey = getStorageKey(storeName, dataKey)
      if (storageKey) {
        store.persist(storageKey, store[dataKey])
        return
      }
    }

    const storageKey = getStorageKey(storeName, dataKey)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(store[dataKey]))
    }
  } catch (e) {
    console.error(`[SyncEngine] 持久化失败 (${storeName}.${dataKey}):`, e)
  }
}

function getStorageKey(storeName, dataKey) {
  const keyMap = {
    'customer.customers': 'gj_erp_customers',
    'quotation.quotations': 'gj_erp_quotations',
    'contract.contracts': 'gj_erp_contracts',
    'inventory.inventory': 'gj_erp_inventory',
    'inventory.inboundOrders': 'gj_erp_warehouseOrders',
    'inventory.outboundOrders': 'gj_erp_warehouseOrders',
    'inventory.warehouseOrders': 'gj_erp_warehouseOrders',
    'delivery.deliveries': 'gj_erp_deliveries',
    'collection.collections': 'gj_erp_collections',
    'statement.statements': 'gj_erp_statements',
    'todo.todos': 'gj_erp_todos',
    'cost.records': 'gj_erp_costAnalysis',
    'warehouseLocation.locations': 'gj_erp_warehouseLocations',
    'supplier.suppliers': 'gj_erp_suppliers'
  }
  return keyMap[`${storeName}.${dataKey}`] || null
}

function watchStoreChanges() {
  stopWatchers()

  if (!SupabaseClient.isConnected()) return

  const events = ['data:created', 'data:updated', 'data:deleted']
  const unsubscribers = []

  events.forEach((event) => {
    const unsub = eventBus.on(event, (data) => {
      const storeName = data.store || data.module
      if (storeName) {
        const tableName = Object.keys(SYNC_MAP).find((t) => SYNC_MAP[t].storeName === storeName)
        if (tableName) {
          debouncePush(tableName)
        }
      }
    })
    unsubscribers.push(unsub)
  })

  _watcherStoppers.push(() => {
    unsubscribers.forEach((fn) => fn())
  })

  console.debug('[SyncEngine] Store 变更监听已启动（eventBus模式）')
}

function debouncePush(tableName) {
  if (_debounceTimers.has(tableName)) {
    clearTimeout(_debounceTimers.get(tableName))
  }

  const timer = setTimeout(() => {
    _debounceTimers.delete(tableName)
    if (SupabaseClient.isConnected()) {
      const config = SYNC_MAP[tableName]
      if (!config) return
      incrementalPushTable(tableName, config.storeName, config.dataKey).then((success) => {
        if (success === false) {
          queuePendingPush(tableName)
        }
      })
    } else {
      queuePendingPush(tableName)
    }
  }, 3000)

  _debounceTimers.set(tableName, timer)
}

function queuePendingPush(tableName) {
  const config = SYNC_MAP[tableName]
  if (!config) return

  const { storeName, dataKey } = config
  const store = getStore(storeName)
  if (!store) return

  const existing = pendingPush.value.find((p) => p.table === tableName)
  if (existing) {
    existing.timestamp = new Date().toISOString()
  } else {
    pendingPush.value.push({
      table: tableName,
      action: 'upsert',
      timestamp: new Date().toISOString()
    })
  }

  savePendingPush()
}

function stopAutoSync() {
  try {
    SupabaseClient.unsubscribeAllAuto()
  } catch (e) {
    console.warn('[SyncEngine] 取消 Realtime 订阅失败:', e)
  }

  stopWatchers()

  for (const [, timer] of _debounceTimers) {
    clearTimeout(timer)
  }
  _debounceTimers.clear()

  _storeCache.clear()

  console.debug('[SyncEngine] 自动同步已停止')
}

function stopWatchers() {
  for (const stopper of _watcherStoppers) {
    try {
      stopper()
    } catch (e) {
      /* ignore */
    }
  }
  _watcherStoppers.length = 0
}

async function forceFullSync() {
  if (isPulling.value || isPushing.value) {
    console.warn('[SyncEngine] 同步正在进行中，跳过全量同步')
    return
  }

  isPulling.value = true
  isPushing.value = true

  try {
    syncState.value = {}
    saveSyncState()

    for (const tableName of Object.keys(SYNC_MAP)) {
      try {
        const remoteData = await API.pullSince(tableName, null)
        if (remoteData && remoteData.length > 0) {
          const { storeName, dataKey } = SYNC_MAP[tableName]
          mergeRemoteItems(storeName, dataKey, remoteData)
        }
      } catch (e) {
        console.error(`[SyncEngine] 全量拉取 ${tableName} 失败:`, e)
      }
    }

    for (const tableName of Object.keys(SYNC_MAP)) {
      try {
        const { storeName, dataKey } = SYNC_MAP[tableName]
        const store = getStore(storeName)
        if (!store) continue

        const localData = store[dataKey]
        if (!Array.isArray(localData) || localData.length === 0) continue

        await API.upsertToServer(tableName, localData)
      } catch (e) {
        console.error(`[SyncEngine] 全量推送 ${tableName} 失败:`, e)
      }
    }

    const now = new Date().toISOString()
    for (const tableName of Object.keys(SYNC_MAP)) {
      syncState.value[tableName] = now
    }
    saveSyncState()

    syncStats.value.lastSyncTime = now

    console.debug('[SyncEngine] 全量同步完成')
  } catch (e) {
    console.error('[SyncEngine] 全量同步异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isPulling.value = false
    isPushing.value = false
  }
}

export function useSyncEngine() {
  return {
    isSyncing,
    isPulling,
    isPushing,
    syncStats,
    syncState,
    pendingPush,
    initAutoSync,
    stopAutoSync,
    incrementalPullAll,
    incrementalPushAll,
    incrementalPushTable,
    forceFullSync,
    handleRemoteInsert,
    handleRemoteUpdate,
    handleRemoteDelete,
    recordDeletedId,
    recordDeletedIds,
    clearDeletedId,
    isDeletedId,
    cleanupTombstones
  }
}
