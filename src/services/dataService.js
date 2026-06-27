import eventBus, { DataModules } from '@/utils/eventBus'
import dataCache from '@/utils/dataCache'
import versionControl from '@/utils/versionControl'
import { generateId } from '@/utils/uid'
import { useSessionStore } from '@/stores/session'
import { usePermissionStore } from '@/stores/permission'
import { SupabaseClient } from '@/lib/supabase.js'
import { API } from '@/services/api.js'

export class DataResult {
  constructor(success, data, error) {
    this.success = success
    this.data = data || null
    this.error = error || null
    this.timestamp = Date.now()
  }

  static ok(data) {
    return new DataResult(true, data, null)
  }

  static fail(error) {
    return new DataResult(false, null, error)
  }
}

const VALIDATION_RULES = {
  customer: {
    required: ['name'],
    fields: {
      name: { type: 'string', maxLength: 100, label: '客户名称' },
      phone: { type: 'string', pattern: /^[\d\-+() ]*$/, label: '电话' },
      email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]*$/, label: '邮箱', optional: true },
      level: { type: 'enum', values: ['A', 'B', 'C'], label: '等级' },
      creditLimit: { type: 'number', min: 0, label: '信用额度' },
      balance: { type: 'number', label: '余额' }
    }
  },
  quotation: {
    required: ['quoteNo'],
    fields: {
      quoteNo: { type: 'string', label: '报价编号' },
      customerName: { type: 'string', label: '客户名称' },
      total: { type: 'number', min: 0, label: '总金额' }
    }
  },
  contract: {
    required: ['contractNo'],
    fields: {
      contractNo: { type: 'string', label: '合同编号' },
      customerName: { type: 'string', label: '客户名称' },
      amount: { type: 'number', min: 0, label: '合同金额' }
    }
  },
  inventory: {
    required: ['code', 'name'],
    fields: {
      code: { type: 'string', label: '编号' },
      name: { type: 'string', label: '物料名称' },
      quantity: { type: 'number', min: 0, label: '数量' },
      unitCost: { type: 'number', min: 0, label: '单价' }
    }
  },
  delivery: {
    required: ['deliveryNo', 'customerName'],
    fields: {
      deliveryNo: { type: 'string', label: '送货单号' },
      customerName: { type: 'string', label: '客户名称' }
    }
  },
  collection: {
    required: ['collectionNo'],
    fields: {
      collectionNo: { type: 'string', label: '回款编号' },
      amount: { type: 'number', min: 0, label: '回款金额' }
    }
  },
  supplier: {
    required: ['name'],
    fields: {
      name: { type: 'string', label: '供应商名称' },
      rating: { type: 'enum', values: ['A', 'B', 'C'], label: '评级' }
    }
  }
}

const MODULE_ACTION_PERMISSIONS = {
  customer: {
    create: { module: 'quote_contract', perm: 'canCreateQuote' },
    update: { module: 'quote_contract', perm: 'canEditOthersQuote' },
    delete: { module: 'quote_contract', perm: 'canDeleteQuote' }
  },
  quotation: {
    create: { module: 'quote_contract', perm: 'canCreateQuote' },
    update: { module: 'quote_contract', perm: 'canEditOthersQuote' },
    delete: { module: 'quote_contract', perm: 'canDeleteQuote' }
  },
  contract: {
    create: { module: 'quote_contract', perm: 'canCreateContract' },
    update: { module: 'quote_contract', perm: 'canEditContract' },
    delete: { module: 'quote_contract', perm: 'canDeleteContract' }
  },
  inventory: {
    create: { module: 'inbound', perm: 'inboundCreate' },
    update: { module: 'inbound', perm: 'inboundEdit' },
    delete: { module: 'inbound', perm: 'inboundDelete' }
  },
  delivery: {
    create: { module: 'delivery', perm: 'deliveryCreate' },
    update: { module: 'delivery', perm: 'deliveryEdit' },
    delete: { module: 'delivery', perm: 'deliveryDelete' }
  },
  collection: {
    create: { module: 'statement', perm: 'statementCreate' },
    update: { module: 'statement', perm: 'statementUpdate' },
    delete: { module: 'statement', perm: 'statementDelete' }
  },
  statement: {
    create: { module: 'statement', perm: 'statementCreate' },
    update: { module: 'statement', perm: 'statementUpdate' },
    delete: { module: 'statement', perm: 'statementDelete' }
  },
  supplier: {
    create: { module: 'supplier', perm: 'supplierCreate' },
    update: { module: 'supplier', perm: 'supplierEdit' },
    delete: { module: 'supplier', perm: 'supplierDelete' }
  },
  purchase: {
    create: { module: 'purchase', perm: 'purchaseCreate' },
    update: { module: 'purchase', perm: 'purchaseEdit' },
    delete: { module: 'purchase', perm: 'purchaseDelete' }
  },
  transfer: {
    create: { module: 'transfer', perm: 'transferCreate' },
    update: { module: 'transfer', perm: 'transferEdit' },
    delete: { module: 'transfer', perm: 'transferDelete' }
  },
  production: {
    create: { module: 'production', perm: 'productionCreate' },
    update: { module: 'production', perm: 'productionEdit' },
    delete: { module: 'production', perm: 'productionCancel' }
  },
  warehouseLocation: {
    create: { module: 'warehouse', perm: 'warehouseCreate' },
    update: { module: 'warehouse', perm: 'warehouseUpdate' },
    delete: { module: 'warehouse', perm: 'warehouseDelete' }
  },
  receivable: {
    create: { module: 'receivable', perm: 'receivableCreate' },
    update: { module: 'receivable', perm: 'receivableEdit' },
    delete: { module: 'receivable', perm: 'receivableDelete' }
  },
  payable: {
    create: { module: 'payable', perm: 'payableCreate' },
    update: { module: 'payable', perm: 'payableEdit' },
    delete: { module: 'payable', perm: 'payableDelete' }
  },
  cost: {
    create: { module: 'cost', perm: 'costEdit' },
    update: { module: 'cost', perm: 'costEdit' },
    delete: { module: 'cost', perm: 'costDelete' }
  }
}

class DataService {
  constructor() {
    this._storeCache = new Map()
    this._locks = new Map()
    this._transactionStack = []
  }

  registerStore(module, store) {
    this._storeCache.set(module, store)
  }

  getStore(module) {
    return this._storeCache.get(module) || null
  }

  query(module, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      if (options.useCache !== false && options.id) {
        const cacheKey = `${module}:item:${options.id}`
        const cached = dataCache.get(cacheKey, { namespace: 'dataService' })
        if (cached !== undefined) return DataResult.ok(cached)
      }

      const dataKey = this._getDataKey(module)
      let data = store[dataKey]

      if (!Array.isArray(data)) {
        return DataResult.fail(`模块 ${module} 的数据源不是数组`)
      }

      if (options.id) {
        const item = data.find((d) => d.id === options.id)
        if (item && options.useCache !== false) {
          dataCache.set(`${module}:item:${options.id}`, item, { namespace: 'dataService' })
        }
        return DataResult.ok(item || null)
      }

      if (options.filters && options.filters.length > 0) {
        for (const filter of options.filters) {
          data = data.filter((d) => {
            const val = d[filter.field]
            if (filter.operator === 'eq' || !filter.operator) return val === filter.value
            if (filter.operator === 'neq') return val !== filter.value
            if (filter.operator === 'contains') return String(val).includes(filter.value)
            if (filter.operator === 'gt') return val > filter.value
            if (filter.operator === 'gte') return val >= filter.value
            if (filter.operator === 'lt') return val < filter.value
            if (filter.operator === 'lte') return val <= filter.value
            if (filter.operator === 'in') return filter.value.includes(val)
            return true
          })
        }
      }

      if (options.search) {
        const keyword = options.search.toLowerCase()
        data = data.filter((d) =>
          Object.values(d).some((v) => v && typeof v === 'string' && v.toLowerCase().includes(keyword))
        )
      }

      if (options.orderBy) {
        const { field, ascending = true } = options.orderBy
        data = [...data].sort((a, b) => {
          const va = a[field]
          const vb = b[field]
          if (va < vb) return ascending ? -1 : 1
          if (va > vb) return ascending ? 1 : -1
          return 0
        })
      }

      if (options.limit) {
        data = data.slice(0, options.limit)
      }

      if (options.useCache !== false) {
        const cacheKey = `${module}:query:${JSON.stringify(options)}`
        dataCache.set(cacheKey, data, { namespace: 'dataService', ttl: 60000 })
      }

      return DataResult.ok(data)
    } catch (e) {
      return DataResult.fail(`查询失败: ${e.message}`)
    }
  }

  async create(module, data, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'create')
        if (!permResult.allowed) return DataResult.fail(permResult.reason)
      }

      if (options.validate !== false) {
        const validation = this._validate(module, data)
        if (!validation.valid) {
          return DataResult.fail(`数据验证失败: ${validation.errors.join('; ')}`)
        }
      }

      if (!data.id) {
        data.id = generateId(module.charAt(0))
      }

      const now = new Date().toISOString()
      if (!data.createdAt) data.createdAt = now
      if (!data.updatedAt) data.updatedAt = now
      if (!data.createdBy && options.user) data.createdBy = options.user

      const addMethod = this._getAddMethod(module)
      const result = store[addMethod](data)

      this._invalidateModuleCache(module)
      eventBus.emitDataChange(module, 'created', { id: data.id, data: result || data, user: options.user })
      this._syncToSupabase(module, result || data, 'upsert')

      if (options.skipApproval !== true) {
        this._tryStartApproval(module, result || data)
      }

      return DataResult.ok(result || data)
    } catch (e) {
      return DataResult.fail(`新增失败: ${e.message}`)
    }
  }

  async update(module, id, updates, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'update')
        if (!permResult.allowed) return DataResult.fail(permResult.reason)
      }

      const dataKey = this._getDataKey(module)
      const oldData = store[dataKey]?.find((d) => d.id === id)
      if (!oldData) return DataResult.fail(`未找到 ID 为 ${id} 的数据`)

      if (options.validate !== false) {
        const mergedData = { ...oldData, ...updates }
        const validation = this._validate(module, mergedData)
        if (!validation.valid) {
          return DataResult.fail(`数据验证失败: ${validation.errors.join('; ')}`)
        }
      }

      updates.updatedAt = new Date().toISOString()
      if (options.user) updates.updatedBy = options.user

      const changes = this._computeChanges(oldData, updates)
      const updateMethod = this._getUpdateMethod(module)
      store[updateMethod](id, updates)

      this._invalidateItemCache(module, id)
      this._invalidateModuleCache(module)

      if (options.recordVersion !== false && !versionControl._config?.autoVersion) {
        versionControl.recordVersion(
          module,
          id,
          oldData,
          { ...oldData, ...updates },
          { action: 'update', changes, user: options.user }
        )
      }

      eventBus.emitDataChange(module, 'updated', {
        id,
        data: { ...oldData, ...updates },
        oldData,
        changes,
        user: options.user
      })
      this._syncToSupabase(module, { ...oldData, ...updates }, 'upsert')

      return DataResult.ok({ ...oldData, ...updates })
    } catch (e) {
      return DataResult.fail(`修改失败: ${e.message}`)
    }
  }

  async remove(module, id, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'delete')
        if (!permResult.allowed) return DataResult.fail(permResult.reason)
      }

      const dataKey = this._getDataKey(module)
      const oldData = store[dataKey]?.find((d) => d.id === id)
      if (!oldData) return DataResult.fail(`未找到 ID 为 ${id} 的数据`)

      if (options.softDelete) {
        return this.update(
          module,
          id,
          { status: 'deleted', deletedAt: new Date().toISOString() },
          { ...options, checkPermission: false }
        )
      }

      const deleteMethod = this._getDeleteMethod(module)
      store[deleteMethod](id)

      this._invalidateItemCache(module, id)
      this._invalidateModuleCache(module)
      eventBus.emitDataChange(module, 'deleted', { id, data: oldData, user: options.user })
      this._syncToSupabase(module, { id }, 'delete')

      return DataResult.ok({ id })
    } catch (e) {
      return DataResult.fail(`删除失败: ${e.message}`)
    }
  }

  async batchCreate(module, items, options = {}) {
    const results = []
    const errors = []

    for (let i = 0; i < items.length; i++) {
      const result = await this.create(module, items[i], {
        ...options,
        checkPermission: i === 0 ? options.checkPermission : false
      })
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({ index: i, error: result.error })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return DataResult.fail(`批量新增全部失败: ${errors.map((e) => e.error).join('; ')}`)
    }

    return DataResult.ok({ created: results.length, failed: errors.length, errors })
  }

  async batchUpdate(module, items, options = {}) {
    const results = []
    const errors = []

    if (options.checkPermission !== false) {
      const permResult = this._checkPermission(module, 'update')
      if (!permResult.allowed) return DataResult.fail(permResult.reason)
    }

    for (const item of items) {
      const result = await this.update(module, item.id, item.updates, { ...options, checkPermission: false })
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({ id: item.id, error: result.error })
      }
    }

    if (results.length > 0) {
      eventBus.emit(DataModules[module.toUpperCase()] ? `${module}:batch_updated` : 'data:batch_updated', {
        module,
        count: results.length,
        user: options.user
      })
    }

    return DataResult.ok({ updated: results.length, failed: errors.length, errors })
  }

  async batchDelete(module, ids, options = {}) {
    const store = this.getStore(module)
    if (!store) return DataResult.fail(`未注册的模块: ${module}`)

    const permResult = this._checkPermission(module, 'delete')
    if (!permResult.allowed) return DataResult.fail(permResult.reason)

    const batchDeleteMethod = this._getBatchDeleteMethod(module)
    if (batchDeleteMethod && store[batchDeleteMethod]) {
      store[batchDeleteMethod](ids)
    } else {
      const deleteMethod = this._getDeleteMethod(module)
      for (const id of ids) {
        store[deleteMethod](id)
      }
    }

    for (const id of ids) {
      this._invalidateItemCache(module, id)
    }
    this._invalidateModuleCache(module)
    eventBus.emitDataChange(module, 'batch_deleted', { ids, user: options.user })

    return DataResult.ok({ deleted: ids.length })
  }

  getSelectOptions(module, options = {}) {
    const { valueField = 'id', labelField = 'name', filters, search, useCache = true } = options

    if (useCache) {
      const cacheKey = `select:${module}:${valueField}:${labelField}:${JSON.stringify(filters)}:${search}`
      const cached = dataCache.get(cacheKey, { namespace: 'selectOptions' })
      if (cached !== undefined) return DataResult.ok(cached)
    }

    const queryResult = this.query(module, { filters, search, useCache: false })
    if (!queryResult.success) return queryResult

    const items = queryResult.data
    if (!Array.isArray(items)) return DataResult.ok([])

    const optionsList = items.map((item) => ({
      value: item[valueField],
      label: typeof labelField === 'function' ? labelField(item) : item[labelField],
      data: item
    }))

    if (useCache) {
      const cacheKey = `select:${module}:${valueField}:${labelField}:${JSON.stringify(filters)}:${search}`
      dataCache.set(cacheKey, optionsList, { namespace: 'selectOptions', ttl: 2 * 60 * 1000 })
    }

    return DataResult.ok(optionsList)
  }

  _validate(module, data) {
    const rules = VALIDATION_RULES[module]
    if (!rules) return { valid: true, errors: [] }

    const errors = []

    for (const field of rules.required || []) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        const fieldRule = rules.fields[field]
        errors.push(`${fieldRule?.label || field} 不能为空`)
      }
    }

    for (const [field, rule] of Object.entries(rules.fields || {})) {
      const value = data[field]
      if (value === undefined || value === null || value === '') continue

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.label || field} 必须是文本`)
      }
      if (rule.type === 'number') {
        const num = Number(value)
        if (Number.isNaN(num)) errors.push(`${rule.label || field} 必须是数字`)
        if (rule.min !== undefined && num < rule.min) errors.push(`${rule.label || field} 不能小于 ${rule.min}`)
      }
      if (rule.type === 'enum' && !rule.values.includes(value)) {
        errors.push(`${rule.label || field} 必须是 ${rule.values.join('/')} 之一`)
      }
      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors.push(`${rule.label || field} 不能超过 ${rule.maxLength} 个字符`)
      }
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push(`${rule.label || field} 格式不正确`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  _checkPermission(module, action) {
    try {
      const session = useSessionStore()
      const permStore = usePermissionStore()

      if (!session.currentRole) {
        return { allowed: false, reason: '未登录' }
      }

      const role = session.currentRole
      if (['管理员', '总经理'].includes(role)) {
        return { allowed: true, reason: '' }
      }

      const permissionConfig = MODULE_ACTION_PERMISSIONS[module]?.[action]
      if (!permissionConfig) {
        return { allowed: true, reason: '' }
      }

      const hasPerm = permStore.getPerm(role, permissionConfig.module, permissionConfig.perm)
      if (!hasPerm) {
        return { allowed: false, reason: `角色 ${role} 无权限执行此操作` }
      }

      return { allowed: true, reason: '' }
    } catch (e) {
      console.error('[DataService] 权限检查异常:', e)
      return { allowed: false, reason: '权限检查失败，默认拒绝' }
    }
  }

  _getDataKey(module) {
    const keyMap = {
      customer: 'customers',
      quotation: 'quotations',
      contract: 'contracts',
      inventory: 'inventory',
      delivery: 'deliveries',
      collection: 'collections',
      statement: 'statements',
      supplier: 'suppliers',
      warehouseLocation: 'locations',
      cost: 'records',
      todo: 'todos',
      transaction: 'transactions',
      purchase: 'purchaseOrders',
      production: 'productionOrders',
      transfer: 'transferOrders'
    }
    return keyMap[module] || module
  }

  _getAddMethod(module) {
    const methodMap = {
      customer: 'addCustomer',
      quotation: 'addQuotation',
      contract: 'addContract',
      inventory: 'addInventoryItem',
      delivery: 'addDelivery',
      collection: 'addCollection',
      statement: 'addStatement',
      supplier: 'addSupplier',
      warehouseLocation: 'addLocation',
      cost: 'addRecord',
      todo: 'addTodo',
      transaction: 'addTransaction',
      purchase: 'addOrder',
      production: 'addOrder',
      transfer: 'addOrder'
    }
    return methodMap[module] || 'addItem'
  }

  _getUpdateMethod(module) {
    const methodMap = {
      customer: 'updateCustomer',
      quotation: 'updateQuotation',
      contract: 'updateContract',
      inventory: 'updateInventoryItem',
      delivery: 'updateDelivery',
      collection: 'updateCollection',
      statement: 'updateStatement',
      supplier: 'updateSupplier',
      warehouseLocation: 'updateLocation',
      cost: 'updateRecord',
      todo: 'updateTodo',
      transaction: 'updateTransaction',
      purchase: 'updateOrder',
      production: 'updateOrder',
      transfer: 'updateOrder'
    }
    return methodMap[module] || 'updateItem'
  }

  _getDeleteMethod(module) {
    const methodMap = {
      customer: 'deleteCustomer',
      quotation: 'deleteQuotation',
      contract: 'deleteContract',
      inventory: 'deleteInventoryItem',
      delivery: 'deleteDelivery',
      collection: 'deleteCollection',
      statement: 'deleteStatement',
      supplier: 'deleteSupplier',
      warehouseLocation: 'deleteLocation',
      cost: 'deleteRecord',
      todo: 'deleteTodo',
      transaction: 'deleteTransaction',
      purchase: 'deleteOrder',
      production: 'deleteOrder',
      transfer: 'deleteOrder'
    }
    return methodMap[module] || 'deleteItem'
  }

  _getBatchDeleteMethod(module) {
    const methodMap = {
      customer: 'batchDelete',
      inventory: 'batchDeleteInventory',
      quotation: 'batchDelete',
      contract: 'batchDelete'
    }
    return methodMap[module] || null
  }

  _invalidateModuleCache() {
    dataCache.invalidateNamespace('selectOptions')
    dataCache.invalidateNamespace('dataService')
  }

  _invalidateItemCache(module, id) {
    dataCache.invalidate(`${module}:item:${id}`, { namespace: 'dataService' })
  }

  _computeChanges(oldData, updates) {
    if (!oldData || !updates) return []
    const changes = []
    for (const key of Object.keys(updates)) {
      if (key === 'updatedAt' || key === 'updatedBy') continue
      if (JSON.stringify(oldData[key]) !== JSON.stringify(updates[key])) {
        changes.push({ field: key, oldValue: oldData[key], newValue: updates[key] })
      }
    }
    return changes
  }

  _getWorkflowType(module, data) {
    const map = {
      quotation: 'quotation',
      contract: 'contract',
      purchase: 'purchase',
      collection: 'payment'
    }
    if (module === 'inventory') {
      if (data.type === 'inbound') return 'inbound'
      if (data.type === 'outbound') return 'outbound'
      return null
    }
    return map[module] || null
  }

  _syncToSupabase(module, data, action) {
    try {
      if (!SupabaseClient.isConnected()) return

      const MODULE_TO_TABLE = {
        customer: 'customers',
        quotation: 'quotations',
        contract: 'contracts',
        inventory: 'inventory',
        delivery: 'deliveries',
        collection: 'collections',
        statement: 'statements',
        supplier: 'suppliers',
        warehouseLocation: 'warehouse_locations',
        cost: 'cost_records',
        todo: 'todos',
        transaction: 'transactions',
        purchase: 'purchase_orders'
      }

      const tableName = MODULE_TO_TABLE[module]
      if (!tableName) return

      if (action === 'upsert') {
        API.upsertToServer(tableName, [data]).catch((e) => {
          console.warn(`[DataService] ${module} upsert 同步失败:`, e.message)
        })
      } else if (action === 'delete') {
        API.request('DELETE', tableName, null, { id: data.id }).catch((e) => {
          console.warn(`[DataService] ${module} delete 同步失败:`, e.message)
        })
      }
    } catch (e) {
      console.warn('[DataService] Supabase 同步异常:', e.message)
    }
  }

  _tryStartApproval(module, data) {
    try {
      const workflowType = this._getWorkflowType(module, data)
      if (!workflowType) return

      import('@/utils/workflowEngine')
        .then(({ default: workflowEngine }) => {
          const template = workflowEngine.getTemplate(workflowType)
          if (!template) return

          const businessNo = data.quotationNo || data.contractNo || data.orderNo || data.id || ''
          const amount = data.totalAmount || data.amount || data.total || 0

          const instance = workflowEngine.startInstance(workflowType, {
            businessId: data.id,
            businessType: workflowType,
            businessNo,
            variables: {
              amount,
              applicant: this._getCurrentUser(),
              businessNo,
              ...data
            }
          })

          if (instance) {
            import('@/modules/system/stores/workflow')
              .then(({ useWorkflowStore }) => {
                const workflowStore = useWorkflowStore()
                workflowStore.instances.unshift(instance)
                workflowStore._persist()
              })
              .catch(() => {})
          }
        })
        .catch(() => {})
    } catch (e) {
      console.warn('[DataService] 启动审批流异常:', e.message)
    }
  }

  _getCurrentUser() {
    try {
      const session = useSessionStore()
      return session.roleName || '未知用户'
    } catch {
      return '未知用户'
    }
  }
}

const dataService = new DataService()

export default dataService
