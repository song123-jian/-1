/**
 * 双向增量同步引擎
 * 负责本地 Pinia Store 与 Supabase 云端之间的自动双向增量同步
 * 支持实时订阅、增量拉取/推送、冲突合并、离线队列
 */

import { ref } from 'vue'
import { SupabaseClient } from '@/lib/supabase.js'
import { API } from '@/services/api.js'
import { mergeArrays } from '@/utils/conflictResolver.js'
import eventBus from '@/utils/eventBus.js'

// ==================== Store 导入 ====================
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

// ==================== 表与 Store 映射 ====================
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

// ==================== Store 实例缓存 ====================
const _storeCache = new Map()

/**
 * 根据 storeName 获取 Pinia Store 实例（懒加载 + 缓存）
 * @param {string} storeName - Store 名称
 * @returns {Object|null} Store 实例
 */
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

// ==================== 同步状态 ====================
const SYNC_STATE_KEY = 'gj_erp_syncState'

/** 同步状态（每张表的上次同步时间） */
const syncState = ref(loadSyncState())

/** 是否正在同步中 */
const isSyncing = ref(false)

/** 同步统计 */
const syncStats = ref({
  totalSynced: 0,
  totalErrors: 0,
  lastSyncTime: null
})

/** 离线推送队列 */
const pendingPush = ref(loadPendingPush())

/** 删除墓碑：记录本地已删除的ID，防止同步时被远端数据恢复 */
const DELETED_IDS_KEY = 'gj_erp_deletedIds'
const deletedIds = ref(loadDeletedIds())

/** Store watcher 停止函数列表 */
const _watcherStoppers = []

/** 定时轮询 watcher 列表 */
const _watchers = ref([])

/** 防抖定时器映射 */
const _debounceTimers = new Map()

/**
 * 从 localStorage 加载同步状态
 * @returns {Object} 同步状态对象
 */
function loadSyncState() {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[SyncEngine] 加载同步状态失败:', e)
  }
  return {}
}

/**
 * 保存同步状态到 localStorage
 */
function saveSyncState() {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(syncState.value))
  } catch (e) {
    console.error('[SyncEngine] 保存同步状态失败:', e)
  }
}

/**
 * 从 localStorage 加载删除墓碑
 * 结构: { tableName: Set<id> }
 * @returns {Object} 每张表已删除ID的集合
 */
function loadDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 将数组转为 Set
      const result = {}
      for (const [table, ids] of Object.entries(parsed)) {
        result[table] = new Set(ids)
      }
      return result
    }
  } catch (e) {
    console.warn('[SyncEngine] 加载删除墓碑失败:', e)
  }
  return {}
}

/**
 * 保存删除墓碑到 localStorage
 */
function saveDeletedIds() {
  try {
    // 将 Set 转为数组存储
    const toStore = {}
    for (const [table, ids] of Object.entries(deletedIds.value)) {
      if (ids.size > 0) {
        toStore[table] = Array.from(ids)
      }
    }
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(toStore))
  } catch (e) {
    console.error('[SyncEngine] 保存删除墓碑失败:', e)
  }
}

/**
 * 记录本地删除的ID（供 Store 的删除方法调用）
 * @param {string} tableName - 同步表名（如 'customers'）
 * @param {string} id - 被删除项的ID
 */
function recordDeletedId(tableName, id) {
  if (!deletedIds.value[tableName]) {
    deletedIds.value[tableName] = new Set()
  }
  deletedIds.value[tableName].add(id)
  saveDeletedIds()
}

/**
 * 批量记录本地删除的ID
 * @param {string} tableName - 同步表名
 * @param {string[]} ids - 被删除项的ID数组
 */
function recordDeletedIds(tableName, ids) {
  if (!deletedIds.value[tableName]) {
    deletedIds.value[tableName] = new Set()
  }
  for (const id of ids) {
    deletedIds.value[tableName].add(id)
  }
  saveDeletedIds()
}

/**
 * 检查某个ID是否已被本地删除
 * @param {string} tableName - 同步表名
 * @param {string} id - 待检查的ID
 * @returns {boolean}
 */
function isDeletedId(tableName, id) {
  return deletedIds.value[tableName]?.has(id) || false
}

/**
 * 从墓碑中移除ID（手动恢复时调用）
 * @param {string} tableName - 同步表名
 * @param {string} id - 恢复项的ID
 */
function clearDeletedId(tableName, id) {
  if (deletedIds.value[tableName]) {
    deletedIds.value[tableName].delete(id)
    saveDeletedIds()
  }
}

/**
 * 从 localStorage 加载离线推送队列
 * @returns {Array} 待推送操作列表
 */
function loadPendingPush() {
  try {
    const raw = localStorage.getItem('gj_erp_pendingPush')
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[SyncEngine] 加载推送队列失败:', e)
  }
  return []
}

/**
 * 保存离线推送队列到 localStorage
 */
function savePendingPush() {
  try {
    localStorage.setItem('gj_erp_pendingPush', JSON.stringify(pendingPush.value))
  } catch (e) {
    console.error('[SyncEngine] 保存推送队列失败:', e)
  }
}

// ==================== 核心同步函数 ====================

/**
 * 初始化自动同步
 * 1. 检查 Supabase 连接
 * 2. 增量拉取所有表数据
 * 3. 订阅 Realtime 实时变更
 * 4. 监听本地 Store 变更自动推送
 * @returns {boolean} 是否成功初始化
 */
function initAutoSync() {
  if (!SupabaseClient.isConnected()) {
    console.warn('[SyncEngine] Supabase 未连接，无法启动自动同步')
    return false
  }

  try {
    // 1. 增量拉取远端最新数据
    incrementalPullAll()

    // 2. 订阅 Realtime 实时变更
    SupabaseClient.autoSubscribeTables({
      onInsert: handleRemoteInsert,
      onUpdate: handleRemoteUpdate,
      onDelete: handleRemoteDelete
    })

    // 3. 监听本地 Store 变更，自动推送
    watchStoreChanges()

    console.info('[SyncEngine] 自动同步已初始化')
    return true
  } catch (e) {
    console.error('[SyncEngine] 初始化自动同步失败:', e)
    return false
  }
}

/**
 * 增量拉取所有表数据
 * 使用 Promise.allSettled 并行拉取所有表，单表失败不影响其他表
 */
async function incrementalPullAll() {
  if (isSyncing.value) {
    console.warn('[SyncEngine] 同步正在进行中，跳过本次拉取')
    return
  }

  isSyncing.value = true
  let syncedCount = 0
  let errorCount = 0

  try {
    const tableNames = Object.keys(SYNC_MAP)

    // 并行拉取所有表
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
        // 更新该表的同步时间戳
        syncState.value[result.value.tableName] = new Date().toISOString()
      } else {
        console.error(`[SyncEngine] 拉取失败:`, result.reason)
        errorCount++
      }
    }

    saveSyncState()

    syncStats.value.totalSynced += syncedCount
    syncStats.value.totalErrors += errorCount
    syncStats.value.lastSyncTime = new Date().toISOString()

    console.info(`[SyncEngine] 增量拉取完成: 同步 ${syncedCount} 条, 错误 ${errorCount} 个`)
  } catch (e) {
    console.error('[SyncEngine] 增量拉取异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isSyncing.value = false
  }
}

/**
 * 增量推送所有表数据
 * 对每张表，筛选本地修改过的数据推送到 Supabase
 */
async function incrementalPushAll() {
  if (isSyncing.value) {
    console.warn('[SyncEngine] 同步正在进行中，跳过本次推送')
    return
  }

  isSyncing.value = true
  let syncedCount = 0
  let errorCount = 0

  try {
    for (const tableName of Object.keys(SYNC_MAP)) {
      try {
        const { storeName, dataKey } = SYNC_MAP[tableName]
        const store = getStore(storeName)
        if (!store) continue

        // 获取当前本地数据
        const localData = store[dataKey]
        if (!Array.isArray(localData) || localData.length === 0) continue

        // 获取上次同步时间
        const lastSync = syncState.value[tableName] || null

        // 筛选在上次同步之后修改过的条目
        let modifiedItems
        if (!lastSync) {
          // 没有同步记录，推送全部数据
          modifiedItems = localData
        } else {
          const lastSyncTime = new Date(lastSync).getTime()
          modifiedItems = localData.filter(item => {
            const updatedTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0
            const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : 0
            return updatedTime > lastSyncTime || createdTime > lastSyncTime
          })
        }

        if (modifiedItems.length === 0) continue

        // 推送到远端
        await API.upsertToServer(tableName, modifiedItems)
        syncedCount += modifiedItems.length

        // 更新该表的同步时间戳
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

    console.info(`[SyncEngine] 增量推送完成: 同步 ${syncedCount} 条, 错误 ${errorCount} 个`)
  } catch (e) {
    console.error('[SyncEngine] 增量推送异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isSyncing.value = false
  }
}

/**
 * 增量推送单张表数据
 * @param {string} tableName - 表名
 * @param {string} storeName - Store 名称
 * @param {string} dataKey - 数据 key
 */
async function incrementalPushTable(tableName, storeName, dataKey) {
  try {
    const store = getStore(storeName)
    if (!store || !store[dataKey]) return
    const items = store[dataKey]
    if (!Array.isArray(items) || items.length === 0) return

    const lastSync = syncState.value[tableName] || null
    let modified = items
    if (lastSync) {
      modified = items.filter(item => {
        const updated = item.updatedAt || item.createdAt
        return !updated || updated >= lastSync
      })
    }
    if (modified.length === 0) return

    const success = await API.upsertToServer(tableName, modified)
    if (success) {
      syncState.value[tableName] = new Date().toISOString()
      saveSyncState()
      syncStats.value.totalSynced += modified.length
      syncStats.value.lastSyncTime = Date.now()
    }
  } catch (e) {
    console.error(`[SyncEngine] 推送 ${tableName} 失败:`, e)
    syncStats.value.totalErrors++
  }
}

/**
 * 处理远端 INSERT 事件
 * @param {string} tableName - 表名
 * @param {Object} record - 新增记录
 */
function handleRemoteInsert(tableName, record) {
  try {
    if (!record || !record.id) return

    const config = SYNC_MAP[tableName]
    if (!config) return

    const { storeName, dataKey } = config
    const store = getStore(storeName)
    if (!store) return

    const currentData = store[dataKey]
    if (!Array.isArray(currentData)) return

    // 检查是否已存在（避免重复插入）
    const exists = currentData.some(item => item.id === record.id)
    if (exists) return

    // 添加新记录
    currentData.push(record)

    // 触发持久化
    persistStore(storeName, store, dataKey)

    console.info(`[SyncEngine] 远端新增: ${tableName}/${record.id}`)
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 INSERT 失败 (${tableName}):`, e)
  }
}

/**
 * 处理远端 UPDATE 事件
 * 使用 last-write-wins 策略：比较 updatedAt 时间戳
 * - 远端更新时，保留本地较新的版本并加入推送队列
 * - 远端较新或相同时，替换本地数据
 * @param {string} tableName - 表名
 * @param {Object} record - 更新后的记录
 */
function handleRemoteUpdate(tableName, record) {
  try {
    if (!record || !record.id) return

    const config = SYNC_MAP[tableName]
    if (!config) return

    const { storeName, dataKey } = config
    const store = getStore(storeName)
    if (!store) return

    const currentData = store[dataKey]
    if (!Array.isArray(currentData)) return

    const idx = currentData.findIndex(item => item.id === record.id)
    if (idx !== -1) {
      const localItem = currentData[idx]
      const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0
      const remoteTime = record.updatedAt ? new Date(record.updatedAt).getTime() : 0

      if (localTime > remoteTime) {
        // 本地版本更新，保留本地数据，加入推送队列确保远端同步
        console.info(`[SyncEngine] 本地更新，保留本地版本: ${tableName}/${record.id} (本地 ${localItem.updatedAt} > 远端 ${record.updatedAt})`)
        queuePendingPush(tableName)
        return
      }

      // 远端版本更新或相同，替换本地
      currentData[idx] = record
    } else {
      // 本地不存在，直接添加
      currentData.push(record)
    }

    // 触发持久化
    persistStore(storeName, store, dataKey)

    console.info(`[SyncEngine] 远端更新: ${tableName}/${record.id}`)
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 UPDATE 失败 (${tableName}):`, e)
  }
}

/**
 * 处理远端 DELETE 事件
 * @param {string} tableName - 表名
 * @param {Object} record - 被删除的记录（包含 id）
 */
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

    // 移除匹配 id 的记录
    const filtered = currentData.filter(item => item.id !== record.id)
    if (filtered.length !== currentData.length) {
      // 直接赋值以触发响应式更新
      store[dataKey] = filtered

      // 触发持久化
      persistStore(storeName, store, dataKey)

      console.info(`[SyncEngine] 远端删除: ${tableName}/${record.id}`)
    }
  } catch (e) {
    console.error(`[SyncEngine] 处理远端 DELETE 失败 (${tableName}):`, e)
  }
}

/**
 * 合并远端数据到本地 Store
 * 使用 conflictResolver 的 mergeArrays 进行智能合并
 * 过滤掉已被本地删除的项（墓碑机制），防止删除的数据被远端同步恢复
 * @param {string} storeName - Store 名称
 * @param {string} dataKey - Store 中数据对应的 key
 * @param {Array} remoteItems - 远端数据数组
 */
function mergeRemoteItems(storeName, dataKey, remoteItems) {
  try {
    const store = getStore(storeName)
    if (!store) return

    const localData = store[dataKey]
    if (!Array.isArray(localData)) return

    // 获取对应的同步表名，用于查找墓碑
    const tableName = Object.keys(SYNC_MAP).find(
      t => SYNC_MAP[t].storeName === storeName && SYNC_MAP[t].dataKey === dataKey
    )

    // 过滤掉已被本地删除的远端数据（墓碑机制）
    let filteredRemote = remoteItems
    if (tableName && deletedIds.value[tableName]?.size > 0) {
      const tombstone = deletedIds.value[tableName]
      filteredRemote = remoteItems.filter(item => !tombstone.has(item.id))
      const filtered = remoteItems.length - filteredRemote.length
      if (filtered > 0) {
        console.info(`[SyncEngine] 墓碑过滤: ${tableName} 跳过 ${filtered} 条已删除数据`)
      }
    }

    // 使用冲突解决器合并
    const merged = mergeArrays(localData, filteredRemote, 'id')

    // 优先使用 replaceData 方法（会自动持久化），否则直接赋值
    if (store.replaceData && typeof store.replaceData === 'function') {
      // 对于 inventory store 的 inboundOrders/outboundOrders，需要特殊处理
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

    console.info(`[SyncEngine] 合并完成: ${storeName}.${dataKey}, 远端 ${remoteItems.length} 条`)
  } catch (e) {
    console.error(`[SyncEngine] 合并远端数据失败 (${storeName}.${dataKey}):`, e)
  }
}

/**
 * 触发 Store 持久化
 * 优先调用 Store 内部的 persist/save 方法，否则直接写 localStorage
 * @param {string} storeName - Store 名称
 * @param {Object} store - Store 实例
 * @param {string} dataKey - 数据 key
 */
function persistStore(storeName, store, dataKey) {
  try {
    /* inventory 的出入库单据需要调用 persistOrders */
    if (storeName === 'inventory' && (dataKey === 'inboundOrders' || dataKey === 'outboundOrders' || dataKey === 'warehouseOrders')) {
      if (store.persistOrders && typeof store.persistOrders === 'function') {
        store.persistOrders()
        return
      }
    }

    /* 无参 persist（quotation/contract/inventory 内部处理） */
    if (store.persist && typeof store.persist === 'function') {
      if (store.persist.length === 0) {
        store.persist()
        return
      }
    }
    /* collection 的 _save 方法 */
    if (store._save && typeof store._save === 'function') {
      store._save()
      return
    }
    /* statement 的 save(key, data) 方法 */
    if (store.save && typeof store.save === 'function') {
      const storageKey = getStorageKey(storeName, dataKey)
      if (storageKey) {
        store.save(storageKey, store[dataKey])
        return
      }
    }
    /* 有参 persist(key, data) */
    if (store.persist && typeof store.persist === 'function' && store.persist.length > 0) {
      const storageKey = getStorageKey(storeName, dataKey)
      if (storageKey) {
        store.persist(storageKey, store[dataKey])
        return
      }
    }

    /* 最终降级：直接写 localStorage */
    const storageKey = getStorageKey(storeName, dataKey)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(store[dataKey]))
    }
  } catch (e) {
    console.error(`[SyncEngine] 持久化失败 (${storeName}.${dataKey}):`, e)
  }
}

/**
 * 获取 Store 数据对应的 localStorage key
 * @param {string} storeName - Store 名称
 * @param {string} dataKey - 数据 key
 * @returns {string|null} localStorage key
 */
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

/**
 * 监听 Store 数据变更，自动触发推送
 * 通过 eventBus 监听数据变更事件，替代深度 watch，3秒防抖推送
 * 仅在 Supabase 已连接时生效
 */
function watchStoreChanges() {
  // 清理已有的 watcher
  stopWatchers()

  if (!SupabaseClient.isConnected()) return

  // 监听 eventBus 的数据变更事件，替代深度 watch
  const events = ['data:created', 'data:updated', 'data:deleted']
  const unsubscribers = []
  events.forEach(event => {
    const unsub = eventBus.on(event, (data) => {
      const storeName = data.store || data.module
      if (storeName) {
        // 根据 storeName 反查 tableName
        const tableName = Object.keys(SYNC_MAP).find(
          t => SYNC_MAP[t].storeName === storeName
        )
        if (tableName) {
          debouncePush(tableName)
        }
      }
    })
    unsubscribers.push(unsub)
  })

  // 保存取消订阅函数，用于后续清理
  _watcherStoppers.push(() => {
    unsubscribers.forEach(fn => fn())
  })

  console.info('[SyncEngine] Store 变更监听已启动（eventBus模式）')
}

/**
 * 防抖推送
 * @param {string} tableName - 表名
 */
function debouncePush(tableName) {
  // 清除之前的定时器
  if (_debounceTimers.has(tableName)) {
    clearTimeout(_debounceTimers.get(tableName))
  }

  // 3秒后执行推送
  const timer = setTimeout(() => {
    _debounceTimers.delete(tableName)
    if (SupabaseClient.isConnected()) {
      incrementalPushAll()
    } else {
      // 离线时加入待推送队列
      queuePendingPush(tableName)
    }
  }, 3000)

  _debounceTimers.set(tableName, timer)
}

/**
 * 将操作加入离线推送队列
 * @param {string} tableName - 表名
 */
function queuePendingPush(tableName) {
  const config = SYNC_MAP[tableName]
  if (!config) return

  const { storeName, dataKey } = config
  const store = getStore(storeName)
  if (!store) return

  // 检查是否已有该表的待推送记录
  const existing = pendingPush.value.find(p => p.table === tableName)
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

/**
 * 停止自动同步
 * 取消所有 Realtime 订阅、Store 监听、清空推送队列
 */
function stopAutoSync() {
  // 取消 Realtime 订阅
  try {
    SupabaseClient.unsubscribeAllAuto()
  } catch (e) {
    console.warn('[SyncEngine] 取消 Realtime 订阅失败:', e)
  }

  // 停止 Store watcher
  stopWatchers()

  // 清理定时轮询 watcher
  _watchers.value.forEach(w => clearInterval(w.intervalId))
  _watchers.value = []

  // 清空防抖定时器
  for (const [key, timer] of _debounceTimers) {
    clearTimeout(timer)
  }
  _debounceTimers.clear()

  // 清空待推送队列
  pendingPush.value = []
  savePendingPush()

  console.info('[SyncEngine] 自动同步已停止')
}

/**
 * 停止所有 Store watcher
 */
function stopWatchers() {
  for (const stopper of _watcherStoppers) {
    try {
      stopper()
    } catch (e) { /* ignore */ }
  }
  _watcherStoppers.length = 0
}

/**
 * 强制全量同步
 * 清空同步时间戳，从远端全量拉取，再全量推送本地数据
 */
async function forceFullSync() {
  if (isSyncing.value) {
    console.warn('[SyncEngine] 同步正在进行中，跳过全量同步')
    return
  }

  isSyncing.value = true

  try {
    // 1. 清空同步时间戳
    syncState.value = {}
    saveSyncState()

    // 2. 全量拉取远端数据
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

    // 3. 全量推送本地数据
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

    // 4. 重置同步时间戳
    const now = new Date().toISOString()
    for (const tableName of Object.keys(SYNC_MAP)) {
      syncState.value[tableName] = now
    }
    saveSyncState()

    syncStats.value.lastSyncTime = now

    console.info('[SyncEngine] 全量同步完成')
  } catch (e) {
    console.error('[SyncEngine] 全量同步异常:', e)
    syncStats.value.totalErrors++
  } finally {
    isSyncing.value = false
  }
}

// ==================== 导出组合式函数 ====================

/**
 * 同步引擎组合式函数
 * @returns {Object} 同步引擎 API
 */
export function useSyncEngine() {
  return {
    isSyncing,
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
    isDeletedId
  }
}
