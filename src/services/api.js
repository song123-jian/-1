import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '../lib/supabase.js'

// 数据表名映射：本地资源名 [右] Supabase 表名
const TABLE_MAP = {
  customers: 'customers',
  quotations: 'quotations',
  contracts: 'contracts',
  inventory: 'inventory',
  inbound_orders: 'inbound_orders',
  outbound_orders: 'outbound_orders',
  deliveries: 'deliveries',
  collections: 'collections',
  statements: 'statements',
  suppliers: 'suppliers',
  approval_rules: 'approval_rules',
  audit_logs: 'audit_logs',
  notifications: 'notifications',
  batches: 'batches',
  todos: 'todos',
  tags: 'tags',
  archives: 'archives',
  doc_settings: 'doc_settings',
  cost_records: 'cost_records',
  warehouse_locations: 'warehouse_locations',
  permissions: 'permissions',
  transactions: 'transactions',
  purchase_orders: 'purchase_orders'
}

/**
 * 获取 Supabase 表名
 */
function getTableName(resource) {
  return TABLE_MAP[resource] || resource
}

/**
 * 通用 CRUD 请求
 */
async function request(method, resource, data = null, options = {}) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) {
    throw new Error('Supabase 未连接，请先配置数据库连接')
  }

  const tableName = getTableName(resource)
  const { id, filters, orderBy, limit } = options

  try {
    switch (method.toUpperCase()) {
      case 'GET': {
        let query = sb.from(tableName).select('*')
        if (id) {
          query = query.eq('id', id)
        }
        if (filters) {
          for (const f of filters) {
            query = query.eq(f.field, f.value)
          }
        }
        if (orderBy) {
          query = query.order(orderBy.field, { ascending: orderBy.ascending !== false })
        }
        if (limit) {
          query = query.limit(limit)
        }
        const { data: result, error } = await query
        if (error) throw error
        return id ? result?.[0] || null : result
      }

      case 'POST': {
        const { data: result, error } = await sb.from(tableName).insert(data).select()
        if (error) throw error
        return result?.[0] || result
      }

      case 'PUT': {
        if (!id) throw new Error('更新操作需要提供 id')
        const { data: result, error } = await sb.from(tableName).update(data).eq('id', id).select()
        if (error) throw error
        return result?.[0] || result
      }

      case 'DELETE': {
        if (!id) throw new Error('删除操作需要提供 id')
        const { error } = await sb.from(tableName).delete().eq('id', id)
        if (error) throw error
        return true
      }

      default:
        throw new Error('不支持的方法: ' + method)
    }
  } catch (e) {
    console.error(`[API] ${method} ${resource} 失败:`, e.message)
    throw e
  }
}

/**
 * 批量同步：将本地数据推送到 Supabase
 * @param {string} resource - 资源名
 * @param {Array} items - 本地数据数组
 */
async function syncToServer(resource, items) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return false

  const tableName = getTableName(resource)
  try {
    // 使用 upsert 策略替代先删后插，避免数据丢失
    if (items && items.length > 0) {
      const BATCH_SIZE = 500
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const { error: upsertError } = await sb.from(tableName).upsert(batch, { onConflict: 'id' })
        if (upsertError) throw upsertError
      }
    }

    console.debug(`[API] 同步 ${resource} 完成: ${items?.length || 0} 条`)
    return true
  } catch (e) {
    console.error(`[API] 同步 ${resource} 失败:`, e.message)
    return false
  }
}

/**
 * 从 Supabase 拉取数据到本地
 * @param {string} resource - 资源名
 * @returns {Array} 远端数据
 */
async function syncFromServer(resource) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return null

  const tableName = getTableName(resource)
  try {
    const { data, error } = await sb.from(tableName).select('*').order('createdAt', { ascending: true })

    if (error) throw error
    console.debug(`[API] 拉取 ${resource} 完成: ${data?.length || 0} 条`)
    return data || []
  } catch (e) {
    console.error(`[API] 拉取 ${resource} 失败:`, e.message)
    return null
  }
}

/**
 * 测试连接
 */
async function testConnection(url, anonKey) {
  try {
    const testClient = createClient(url, anonKey)
    const { data, error } = await testClient.from('customers').select('id').limit(1)
    if (error && error.code === '42P01') {
      // 表不存在但连接成功
      return { success: true, message: '连接成功，但数据库表尚未创建' }
    }
    if (error) throw error
    return { success: true, message: '连接成功' }
  } catch (e) {
    return { success: false, message: '连接失败: ' + e.message }
  }
}

/**
 * 增量推送：upsert（新增或更新）记录到 Supabase，替代删除后全量插入
 * @param {string} resource - 资源名
 * @param {Array} items - 本地数据数组
 */
async function upsertToServer(resource, items) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return false
  if (!items || items.length === 0) return true

  const tableName = getTableName(resource)
  try {
    // 每500条分批 upsert
    const BATCH_SIZE = 500
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      const { error } = await sb.from(tableName).upsert(batch, { onConflict: 'id' })
      if (error) throw error
    }
    console.debug(`[API] 增量推送 ${resource} 完成: ${items.length} 条`)
    return true
  } catch (e) {
    console.error(`[API] 增量推送 ${resource} 失败:`, e.message)
    return false
  }
}

/**
 * 增量拉取：仅获取指定时间之后更新的记录
 * @param {string} resource - 资源名
 * @param {string} since - 起始时间戳
 * @returns {Array|null} 远端数据
 */
async function pullSince(resource, since) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return null

  const tableName = getTableName(resource)
  try {
    let query = sb.from(tableName).select('*')

    // 如果提供了 since，按 updatedAt 过滤
    if (since) {
      query = query.gte('updatedAt', since)
    }

    query = query.order('createdAt', { ascending: true })
    const { data, error } = await query

    if (error) throw error
    console.debug(`[API] 增量拉取 ${resource} 完成: ${data?.length || 0} 条${since ? ' (自 ' + since + ')' : ''}`)
    return data || []
  } catch (e) {
    console.error(`[API] 增量拉取 ${resource} 失败:`, e.message)
    return null
  }
}

export const API = {
  request,
  syncToServer,
  syncFromServer,
  upsertToServer,
  pullSince,
  testConnection,
  getTableName,
  TABLE_MAP
}
