import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '../lib/supabase.js'

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

const TIMESTAMP_FIELDS = ['updatedAt', 'createdAt']

function getTableName(resource) {
  return TABLE_MAP[resource] || resource
}

function isMissingColumnError(error, columnName) {
  if (!error?.message) return false
  return (
    error.message.includes(`.${columnName} does not exist`) || error.message.includes(`"${columnName}" does not exist`)
  )
}

async function runTimestampQuery(sb, tableName, since = null) {
  let lastError = null

  for (const field of TIMESTAMP_FIELDS) {
    let query = sb.from(tableName).select('*')

    if (since) {
      query = query.gte(field, since)
    }

    query = query.order(field, { ascending: true })
    const result = await query

    if (!result.error) {
      return result
    }

    lastError = result.error
    if (!isMissingColumnError(result.error, field)) {
      return result
    }
  }

  if (!since) {
    return { data: null, error: lastError }
  }

  // If timestamp columns do not exist, fall back to a full fetch so sync still works.
  const fallbackResult = await sb.from(tableName).select('*')
  if (!fallbackResult.error) {
    return fallbackResult
  }

  return { data: null, error: fallbackResult.error || lastError }
}

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
        throw new Error(`不支持的方法: ${method}`)
    }
  } catch (e) {
    console.error(`[API] ${method} ${resource} 失败:`, e.message)
    throw e
  }
}

async function syncToServer(resource, items) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return false

  const tableName = getTableName(resource)
  try {
    if (items && items.length > 0) {
      const batchSize = 500
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
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

async function syncFromServer(resource) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return null

  const tableName = getTableName(resource)
  try {
    const { data, error } = await runTimestampQuery(sb, tableName)
    if (error) throw error

    console.debug(`[API] 拉取 ${resource} 完成: ${data?.length || 0} 条`)
    return data || []
  } catch (e) {
    console.error(`[API] 拉取 ${resource} 失败:`, e.message)
    return null
  }
}

async function testConnection(url, anonKey) {
  try {
    const testClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: 'gj_erp_supabase_test_connection'
      }
    })
    const { error } = await testClient.from('customers').select('id').limit(1)
    if (error && error.code === '42P01') {
      return { success: true, message: '连接成功，但数据库表尚未创建' }
    }
    if (error) throw error
    return { success: true, message: '连接成功' }
  } catch (e) {
    return { success: false, message: '连接失败: ' + e.message }
  }
}

async function upsertToServer(resource, items) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return false
  if (!items || items.length === 0) return true

  const tableName = getTableName(resource)
  try {
    const batchSize = 500
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
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

async function pullSince(resource, since) {
  const sb = SupabaseClient.getClient()
  if (!sb || !SupabaseClient.isConnected()) return null

  const tableName = getTableName(resource)
  try {
    const { data, error } = await runTimestampQuery(sb, tableName, since)
    if (error) throw error

    const suffix = since ? ` (since ${since})` : ''
    console.debug(`[API] 增量拉取 ${resource} 完成: ${data?.length || 0} 条${suffix}`)
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
