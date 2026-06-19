import { createClient } from '@supabase/supabase-js'

const STORAGE_URL_KEY = 'gj_erp_sb_url'
const STORAGE_KEY_KEY = 'gj_erp_sb_key'

let _client = null
let _connected = false
let _config = { url: '', anonKey: '' }

// 实时订阅管理
const _subscriptions = new Map()

// 自动订阅管理
const _autoSubscriptions = new Map()
let _lastAutoCallbacks = null

// 重连管理
let _reconnectTimer = null
const RECONNECT_BASE_DELAY = 3000
const RECONNECT_MAX_DELAY = 60000
let _reconnectAttempt = 0

// 需要自动订阅的表列表
const TABLES_TO_WATCH = [
  'customers',
  'quotations',
  'contracts',
  'inventory',
  'inbound_orders',
  'outbound_orders',
  'deliveries',
  'collections',
  'statements',
  'suppliers',
  'todos',
  'cost_records',
  'warehouse_locations',
  'transactions',
  'purchase_orders',
  'approval_rules',
  'audit_logs',
  'notifications',
  'batches',
  'tags',
  'archives',
  'doc_settings',
  'permissions'
]

/**
 * 初始化 Supabase 客户端
 * @param {string} url - Supabase 项目 URL
 * @param {string} anonKey - Supabase anon public key
 * @param {object} options - 可选配置 { autoSubscribe: true, onRealtimeChange: { onInsert, onUpdate, onDelete } }
 * @returns {object|null} Supabase 客户端实例
 */
async function init(url, anonKey, options = {}) {
  if (!url || !anonKey) {
    _connected = false
    return null
  }
  try {
    _client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    })
    _config.url = url
    _config.anonKey = anonKey
    localStorage.setItem(STORAGE_URL_KEY, url)
    localStorage.setItem(STORAGE_KEY_KEY, anonKey)
    _connected = true
    console.debug('[Supabase] 连接成功:', url)

    // 重置重连计数
    _reconnectAttempt = 0

    // 如果启用了自动订阅，则自动订阅所有关键表
    if (options.autoSubscribe && options.onRealtimeChange) {
      autoSubscribeTables(options.onRealtimeChange)
    }

    return _client
  } catch (e) {
    console.error('[Supabase] 初始化失败:', e)
    _connected = false
    return null
  }
}

/**
 * 自动从 localStorage 恢复连接，若无则从 .env 默认配置连接
 */
async function autoInit() {
  try {
    // 优先从 localStorage 恢复（用户手动配置的）
    const url = localStorage.getItem(STORAGE_URL_KEY)
    const key = localStorage.getItem(STORAGE_KEY_KEY)
    if (url && key) {
      return init(url, key)
    }

    // 回退到 .env 默认配置
    const envUrl = import.meta.env.VITE_SUPABASE_URL
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (envUrl && envKey) {
      console.debug('[Supabase] 使用 .env 默认配置连接')
      return init(envUrl, envKey)
    }

    return null
  } catch (e) {
    console.warn('[Supabase] autoInit 恢复连接失败:', e.message)
    return null
  }
}

/**
 * 断开连接
 */
function disconnect() {
  // 清理所有实时订阅
  for (const [channel, sub] of _subscriptions) {
    try {
      _client?.removeChannel(sub)
    } catch (e) {
      /* ignore */
    }
  }
  _subscriptions.clear()

  // 清理所有自动订阅
  for (const [name, channel] of _autoSubscriptions) {
    try {
      _client?.removeChannel(channel)
    } catch (e) {
      /* ignore */
    }
  }
  _autoSubscriptions.clear()
  _lastAutoCallbacks = null

  _client = null
  _connected = false
  _config = { url: '', anonKey: '' }
  localStorage.removeItem(STORAGE_URL_KEY)
  localStorage.removeItem(STORAGE_KEY_KEY)

  // 清理重连定时器
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
  _reconnectAttempt = 0

  console.debug('[Supabase] 已断开连接')
}

function getClient() {
  return _client
}
function isConnected() {
  return _connected && _client !== null
}
function getConfig() {
  return { url: _config.url, hasKey: !!_config.anonKey }
}

/**
 * 订阅数据表变更（实时同步）
 * @param {string} tableName - 表名
 * @param {function} onInsert - 新增回调
 * @param {function} onUpdate - 更新回调
 * @param {function} onDelete - 删除回调
 */
function subscribe(tableName, { onInsert, onUpdate, onDelete }) {
  if (!_client || !_connected) return null
  const channelName = `realtime_${tableName}`

  // 避免重复订阅
  if (_subscriptions.has(channelName)) {
    return _subscriptions.get(channelName)
  }

  const channel = _client
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, (payload) => {
      if (onInsert) onInsert(payload.new)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, (payload) => {
      if (onUpdate) onUpdate(payload.new, payload.old)
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, (payload) => {
      if (onDelete) onDelete(payload.old)
    })
    .subscribe()

  _subscriptions.set(channelName, channel)
  return channel
}

/**
 * 取消订阅
 */
function unsubscribe(tableName) {
  const channelName = `realtime_${tableName}`
  const channel = _subscriptions.get(channelName)
  if (channel && _client) {
    _client.removeChannel(channel)
    _subscriptions.delete(channelName)
  }
}

/**
 * 取消所有订阅
 */
function unsubscribeAll() {
  for (const [name, channel] of _subscriptions) {
    try {
      _client?.removeChannel(channel)
    } catch (e) {
      /* ignore */
    }
  }
  _subscriptions.clear()
}

/**
 * 自动订阅所有关键表的实时变更
 * @param {object} callbacks - 回调函数集合 { onInsert(tableName, record), onUpdate(tableName, record), onDelete(tableName, record) }
 * @returns {Array} 频道引用数组
 */
function autoSubscribeTables(callbacks = {}) {
  if (!_client || !_connected) {
    console.warn('[Supabase] 未连接，无法自动订阅')
    return []
  }

  // 保存回调以便重连时使用
  _lastAutoCallbacks = callbacks

  const channels = []

  for (const tableName of TABLES_TO_WATCH) {
    const channelName = `auto_${tableName}`

    // 避免重复订阅
    if (_autoSubscriptions.has(channelName)) {
      channels.push(_autoSubscriptions.get(channelName))
      continue
    }

    const channel = _client
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, (payload) => {
        if (callbacks.onInsert) callbacks.onInsert(tableName, payload.new)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, (payload) => {
        if (callbacks.onUpdate) callbacks.onUpdate(tableName, payload.new)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, (payload) => {
        if (callbacks.onDelete) callbacks.onDelete(tableName, payload.old)
      })
      .subscribe()

    _autoSubscriptions.set(channelName, channel)
    channels.push(channel)
  }

  console.debug(`[Supabase] 已自动订阅 ${TABLES_TO_WATCH.length} 个表的实时变更`)
  return channels
}

/**
 * 取消所有自动订阅
 */
function unsubscribeAllAuto() {
  for (const [name, channel] of _autoSubscriptions) {
    try {
      _client?.removeChannel(channel)
    } catch (e) {
      /* ignore */
    }
  }
  _autoSubscriptions.clear()
  console.debug('[Supabase] 已取消所有自动订阅')
}

/**
 * 获取自动订阅状态
 * @returns {object} 各表的订阅状态
 */
function getAutoSubscriptionStatus() {
  const status = {}
  for (const tableName of TABLES_TO_WATCH) {
    const channelName = `auto_${tableName}`
    const channel = _autoSubscriptions.get(channelName)
    status[tableName] = {
      subscribed: !!channel,
      channelName: channelName,
      state: channel ? channel.state : 'unsubscribed'
    }
  }
  return status
}

/**
 * 自动重连（指数退避策略）
 * 当检测到连接断开时自动调用
 * @returns {void}
 */
function scheduleReconnect() {
  if (_reconnectTimer) return // 已在重连中

  _reconnectAttempt++
  const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, _reconnectAttempt - 1), RECONNECT_MAX_DELAY)
  console.warn(`[Supabase] 将在 ${delay}ms 后尝试第 ${_reconnectAttempt} 次重连...`)

  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null
    const client = reconnect()
    if (!client) {
      // 重连失败，继续调度下一次
      scheduleReconnect()
    }
  }, delay)
}

/**
 * 断开并重连，自动恢复之前的订阅
 * @returns {object|null} Supabase 客户端实例
 */
function reconnect() {
  if (!_config.url || !_config.anonKey) {
    console.warn('[Supabase] 没有保存的连接配置，无法重连')
    return null
  }

  // 记录重连前的订阅状态
  const hadAutoSubscriptions = _autoSubscriptions.size > 0
  const savedCallbacks = _lastAutoCallbacks

  // 清理现有自动订阅（不清理手动订阅，由 unsubscribeAll 处理）
  unsubscribeAllAuto()

  // 重新初始化客户端（init是async，但reconnect在定时器中调用，不阻塞）
  init(_config.url, _config.anonKey).then((client) => {
    if (client && hadAutoSubscriptions && savedCallbacks) {
      // 恢复自动订阅
      autoSubscribeTables(savedCallbacks)
      console.debug('[Supabase] 重连并恢复自动订阅成功')
    }
  }).catch((e) => {
    console.warn('[Supabase] 重连失败:', e.message)
  })

  // 返回当前客户端状态（重连是异步的，调用方不应依赖返回值）
  return _client
}

export const SupabaseClient = {
  init,
  autoInit,
  disconnect,
  getClient,
  isConnected,
  getConfig,
  subscribe,
  unsubscribe,
  unsubscribeAll,
  autoSubscribeTables,
  unsubscribeAllAuto,
  getAutoSubscriptionStatus,
  reconnect,
  scheduleReconnect
}
