/**
 * 统一数据服务层
 * 提供标准化的CRUD接口，封装数据操作逻辑
 * 支持：
 * - 统一的查询/新增/修改/删除操作
 * - 数据验证与转换
 * - 权限检查集成
 * - 事件通知集成
 * - 缓存集成
 * - 错误处理与回滚
 * - 批量操作
 */

import eventBus, { DataModules } from '@/utils/eventBus'
import dataCache from '@/utils/dataCache'
import versionControl from '@/utils/versionControl'
import { generateId } from '@/utils/uid'

/* 操作结果封装 */
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

/* 数据验证规则定义 */
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
      code: { type: 'string', label: '物料编码' },
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

class DataService {
  constructor() {
    /* Store引用缓存 */
    this._storeCache = new Map()
    /* 操作锁（防止并发修改同一数据） */
    this._locks = new Map()
    /* 事务栈（用于回滚） */
    this._transactionStack = []
  }

  /**
   * 注册Store引用
   * @param {string} module - 模块名
   * @param {Object} store - Pinia Store 实例
   */
  registerStore(module, store) {
    this._storeCache.set(module, store)
  }

  /**
   * 获取Store引用
   * @param {string} module - 模块名
   * @returns {Object|null} Store实例
   */
  getStore(module) {
    return this._storeCache.get(module) || null
  }

  /**
   * 查询数据
   * @param {string} module - 模块名
   * @param {Object} options - 查询选项 { id, filters, search, orderBy, limit, useCache }
   * @returns {DataResult} 查询结果
   */
  query(module, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      /* 检查缓存 */
      if (options.useCache !== false && options.id) {
        const cacheKey = `${module}:item:${options.id}`
        const cached = dataCache.get(cacheKey, { namespace: 'dataService' })
        if (cached !== undefined) return DataResult.ok(cached)
      }

      /* 获取数据源 */
      const dataKey = this._getDataKey(module)
      let data = store[dataKey]

      if (!Array.isArray(data)) {
        return DataResult.fail(`模块 ${module} 的数据源不是数组`)
      }

      /* 按ID查询 */
      if (options.id) {
        const item = data.find(d => d.id === options.id)
        if (item && options.useCache !== false) {
          dataCache.set(`${module}:item:${options.id}`, item, { namespace: 'dataService' })
        }
        return DataResult.ok(item || null)
      }

      /* 过滤 */
      if (options.filters && options.filters.length > 0) {
        for (const filter of options.filters) {
          data = data.filter(d => {
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

      /* 搜索 */
      if (options.search) {
        const keyword = options.search.toLowerCase()
        data = data.filter(d => {
          return Object.values(d).some(v =>
            v && typeof v === 'string' && v.toLowerCase().includes(keyword)
          )
        })
      }

      /* 排序 */
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

      /* 限制条数 */
      if (options.limit) {
        data = data.slice(0, options.limit)
      }

      /* 缓存列表查询结果 */
      if (options.useCache !== false) {
        const cacheKey = `${module}:query:${JSON.stringify(options)}`
        dataCache.set(cacheKey, data, { namespace: 'dataService', ttl: 60000 })
      }

      return DataResult.ok(data)
    } catch (e) {
      return DataResult.fail(`查询失败: ${e.message}`)
    }
  }

  /**
   * 新增数据
   * @param {string} module - 模块名
   * @param {Object} data - 数据
   * @param {Object} options - 选项 { validate, user }
   * @returns {DataResult} 操作结果
   */
  async create(module, data, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      /* 权限检查 */
      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'create')
        if (!permResult.allowed) {
          return DataResult.fail(permResult.reason)
        }
      }

      /* 数据验证 */
      if (options.validate !== false) {
        const validation = this._validate(module, data)
        if (!validation.valid) {
          return DataResult.fail(`数据验证失败: ${validation.errors.join('; ')}`)
        }
      }

      /* 生成ID */
      if (!data.id) {
        data.id = generateId(module.charAt(0))
      }

      /* 添加时间戳 */
      const now = new Date().toISOString()
      if (!data.createdAt) data.createdAt = now
      if (!data.updatedAt) data.updatedAt = now
      if (!data.createdBy && options.user) data.createdBy = options.user

      /* 调用Store的新增方法 */
      const addMethod = this._getAddMethod(module)
      const result = store[addMethod](data)

      /* 清除缓存 */
      this._invalidateModuleCache(module)

      /* 发布事件 */
      eventBus.emitDataChange(module, 'created', {
        id: data.id,
        data: result || data,
        user: options.user
      })

      return DataResult.ok(result || data)
    } catch (e) {
      return DataResult.fail(`新增失败: ${e.message}`)
    }
  }

  /**
   * 修改数据
   * @param {string} module - 模块名
   * @param {string} id - 数据ID
   * @param {Object} updates - 更新内容
   * @param {Object} options - 选项 { validate, user, recordVersion }
   * @returns {DataResult} 操作结果
   */
  async update(module, id, updates, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      /* 权限检查 */
      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'update')
        if (!permResult.allowed) {
          return DataResult.fail(permResult.reason)
        }
      }

      /* 获取旧数据（用于版本控制和事件通知） */
      const dataKey = this._getDataKey(module)
      const oldData = store[dataKey]?.find(d => d.id === id)
      if (!oldData) return DataResult.fail(`未找到ID为 ${id} 的数据`)

      /* 数据验证 */
      if (options.validate !== false) {
        const mergedData = { ...oldData, ...updates }
        const validation = this._validate(module, mergedData)
        if (!validation.valid) {
          return DataResult.fail(`数据验证失败: ${validation.errors.join('; ')}`)
        }
      }

      /* 添加更新时间戳 */
      updates.updatedAt = new Date().toISOString()
      if (options.user) updates.updatedBy = options.user

      /* 计算变更 */
      const changes = this._computeChanges(oldData, updates)

      /* 调用Store的更新方法 */
      const updateMethod = this._getUpdateMethod(module)
      store[updateMethod](id, updates)

      /* 清除缓存 */
      this._invalidateItemCache(module, id)
      this._invalidateModuleCache(module)

      /* 手动记录版本（如果自动版本未开启） */
      if (options.recordVersion !== false && !versionControl._config?.autoVersion) {
        versionControl.recordVersion(module, id, oldData, { ...oldData, ...updates }, {
          action: 'update',
          changes,
          user: options.user
        })
      }

      /* 发布事件 */
      eventBus.emitDataChange(module, 'updated', {
        id,
        data: { ...oldData, ...updates },
        oldData,
        changes,
        user: options.user
      })

      return DataResult.ok({ ...oldData, ...updates })
    } catch (e) {
      return DataResult.fail(`修改失败: ${e.message}`)
    }
  }

  /**
   * 删除数据
   * @param {string} module - 模块名
   * @param {string} id - 数据ID
   * @param {Object} options - 选项 { user, softDelete }
   * @returns {DataResult} 操作结果
   */
  async remove(module, id, options = {}) {
    try {
      const store = this.getStore(module)
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      /* 权限检查 */
      if (options.checkPermission !== false) {
        const permResult = this._checkPermission(module, 'delete')
        if (!permResult.allowed) {
          return DataResult.fail(permResult.reason)
        }
      }

      /* 获取旧数据 */
      const dataKey = this._getDataKey(module)
      const oldData = store[dataKey]?.find(d => d.id === id)
      if (!oldData) return DataResult.fail(`未找到ID为 ${id} 的数据`)

      /* 软删除 */
      if (options.softDelete) {
        return this.update(module, id, { status: 'deleted', deletedAt: new Date().toISOString() }, {
          ...options,
          checkPermission: false
        })
      }

      /* 调用Store的删除方法 */
      const deleteMethod = this._getDeleteMethod(module)
      store[deleteMethod](id)

      /* 清除缓存 */
      this._invalidateItemCache(module, id)
      this._invalidateModuleCache(module)

      /* 发布事件 */
      eventBus.emitDataChange(module, 'deleted', {
        id,
        data: oldData,
        user: options.user
      })

      return DataResult.ok({ id })
    } catch (e) {
      return DataResult.fail(`删除失败: ${e.message}`)
    }
  }

  /**
   * 批量新增
   * @param {string} module - 模块名
   * @param {Array} items - 数据数组
   * @param {Object} options - 选项
   * @returns {DataResult} 操作结果
   */
  async batchCreate(module, items, options = {}) {
    const results = []
    const errors = []

    for (let i = 0; i < items.length; i++) {
      const result = await this.create(module, items[i], { ...options, checkPermission: i === 0 ? options.checkPermission : false })
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({ index: i, error: result.error })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return DataResult.fail(`批量新增全部失败: ${errors.map(e => e.error).join('; ')}`)
    }

    return DataResult.ok({ created: results.length, failed: errors.length, errors })
  }

  /**
   * 批量更新
   * @param {string} module - 模块名
   * @param {Array<{id, updates}>} items - 更新项数组
   * @param {Object} options - 选项
   * @returns {DataResult} 操作结果
   */
  async batchUpdate(module, items, options = {}) {
    const results = []
    const errors = []

    for (const item of items) {
      const result = await this.update(module, item.id, item.updates, { ...options, checkPermission: false })
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push({ id: item.id, error: result.error })
      }
    }

    /* 发布批量更新事件 */
    if (results.length > 0) {
      eventBus.emit(DataModules[module.toUpperCase()] ? `${module}:batch_updated` : `data:batch_updated`, {
        module,
        count: results.length,
        user: options.user
      })
    }

    return DataResult.ok({ updated: results.length, failed: errors.length, errors })
  }

  /**
   * 批量删除
   * @param {string} module - 模块名
   * @param {string[]} ids - ID数组
   * @param {Object} options - 选项
   * @returns {DataResult} 操作结果
   */
  async batchDelete(module, ids, options = {}) {
    const store = this.getStore(module)
    if (!store) return DataResult.fail(`未注册的模块: ${module}`)

    /* 权限检查 */
    const permResult = this._checkPermission(module, 'delete')
    if (!permResult.allowed) return DataResult.fail(permResult.reason)

    /* 调用Store的批量删除方法 */
    const batchDeleteMethod = this._getBatchDeleteMethod(module)
    if (store[batchDeleteMethod]) {
      store[batchDeleteMethod](ids)
    } else {
      const deleteMethod = this._getDeleteMethod(module)
      for (const id of ids) {
        store[deleteMethod](id)
      }
    }

    /* 清除缓存 */
    for (const id of ids) {
      this._invalidateItemCache(module, id)
    }
    this._invalidateModuleCache(module)

    /* 发布事件 */
    eventBus.emitDataChange(module, 'batch_deleted', { ids, user: options.user })

    return DataResult.ok({ deleted: ids.length })
  }

  /**
   * 获取下拉选项数据
   * @param {string} module - 模块名
   * @param {Object} options - 选项 { valueField, labelField, filters, search, useCache }
   * @returns {DataResult} 选项数组 [{value, label, data}]
   */
  getSelectOptions(module, options = {}) {
    const {
      valueField = 'id',
      labelField = 'name',
      filters,
      search,
      useCache = true
    } = options

    /* 检查缓存 */
    if (useCache) {
      const cacheKey = `select:${module}:${valueField}:${labelField}:${JSON.stringify(filters)}:${search}`
      const cached = dataCache.get(cacheKey, { namespace: 'selectOptions' })
      if (cached !== undefined) return DataResult.ok(cached)
    }

    /* 查询数据 */
    const queryResult = this.query(module, { filters, search, useCache: false })
    if (!queryResult.success) return queryResult

    const items = queryResult.data
    if (!Array.isArray(items)) return DataResult.ok([])

    /* 转换为选项格式 */
    const optionsList = items.map(item => ({
      value: item[valueField],
      label: typeof labelField === 'function' ? labelField(item) : item[labelField],
      data: item
    }))

    /* 缓存 */
    if (useCache) {
      const cacheKey = `select:${module}:${valueField}:${labelField}:${JSON.stringify(filters)}:${search}`
      dataCache.set(cacheKey, optionsList, { namespace: 'selectOptions', ttl: 2 * 60 * 1000 })
    }

    return DataResult.ok(optionsList)
  }

  /**
   * 数据验证
   * @param {string} module - 模块名
   * @param {Object} data - 待验证数据
   * @returns {Object} { valid, errors }
   */
  _validate(module, data) {
    const rules = VALIDATION_RULES[module]
    if (!rules) return { valid: true, errors: [] }

    const errors = []

    /* 必填检查 */
    for (const field of (rules.required || [])) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        const fieldRule = rules.fields[field]
        errors.push(`${fieldRule?.label || field} 不能为空`)
      }
    }

    /* 字段规则检查 */
    for (const [field, rule] of Object.entries(rules.fields || {})) {
      const value = data[field]
      if (value === undefined || value === null || value === '') {
        if (!rule.optional && rules.required?.includes(field)) continue
        continue
      }

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.label || field} 必须是文本`)
      }
      if (rule.type === 'number') {
        const num = Number(value)
        if (isNaN(num)) errors.push(`${rule.label || field} 必须是数字`)
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

  /**
   * 权限检查
   * @param {string} module - 模块名
   * @param {string} action - 操作类型
   * @returns {Object} { allowed, reason }
   */
  _checkPermission(module, action) {
    try {
      /* 动态导入避免循环依赖 */
      const { useSessionStore } = require('./../stores/session')
      const { usePermissionStore } = require('./../stores/permission')
      const session = useSessionStore()
      const permStore = usePermissionStore()

      if (!session.isLoggedIn) {
        return { allowed: false, reason: '请先选择角色' }
      }

      const role = session.currentRole
      if (['管理员', '总经理'].includes(role)) {
        return { allowed: true, reason: '' }
      }

      /* 模块到权限模块的映射 */
      const modulePermMap = {
        customer: 'quote_contract',
        quotation: 'quote_contract',
        contract: 'quote_contract',
        inventory: 'inbound',
        delivery: 'delivery',
        collection: 'statement',
        statement: 'statement',
        supplier: 'inbound'
      }

      const permModule = modulePermMap[module]
      if (!permModule) return { allowed: true, reason: '' }

      /* 操作到权限的映射 */
      const actionPermMap = {
        create: 'canCreateQuote,inboundCreate,outboundCreate,statementCreate,deliveryCreate,canCreateContract',
        update: 'canEditOthersQuote,inboundEdit,outboundUpdate,statementUpdate,deliveryEdit,canEditContract',
        delete: 'canDeleteQuote,inboundDelete,outboundDelete,statementDelete,deliveryDelete,canDeleteContract'
      }

      const permKeys = actionPermMap[action]?.split(',') || []
      const hasAny = permKeys.some(pk => permStore.getPerm(role, permModule, pk))
      if (!hasAny) {
        return { allowed: false, reason: `角色 ${role} 无权限执行此操作` }
      }

      return { allowed: true, reason: '' }
    } catch (e) {
      /* 权限检查失败时默认允许（降级策略） */
      console.warn('[DataService] 权限检查异常:', e)
      return { allowed: true, reason: '' }
    }
  }

  /**
   * 获取模块的数据键名
   */
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
      todo: 'todos'
    }
    return keyMap[module] || module
  }

  /**
   * 获取新增方法名
   */
  _getAddMethod(module) {
    const methodMap = {
      customer: 'addCustomer',
      quotation: 'addQuotation',
      contract: 'addContract',
      inventory: 'addInventoryItem',
      delivery: 'addDelivery',
      collection: 'addCollection',
      supplier: 'addSupplier',
      warehouseLocation: 'addLocation',
      cost: 'addRecord',
      todo: 'addTodo'
    }
    return methodMap[module] || 'addItem'
  }

  /**
   * 获取更新方法名
   */
  _getUpdateMethod(module) {
    const methodMap = {
      customer: 'updateCustomer',
      quotation: 'updateQuotation',
      contract: 'updateContract',
      inventory: 'updateInventoryItem',
      delivery: 'updateDelivery',
      collection: 'updateCollection',
      supplier: 'updateSupplier',
      warehouseLocation: 'updateLocation',
      cost: 'updateRecord',
      todo: 'updateTodo'
    }
    return methodMap[module] || 'updateItem'
  }

  /**
   * 获取删除方法名
   */
  _getDeleteMethod(module) {
    const methodMap = {
      customer: 'deleteCustomer',
      quotation: 'deleteQuotation',
      contract: 'deleteContract',
      inventory: 'deleteInventoryItem',
      delivery: 'deleteDelivery',
      collection: 'deleteCollection',
      supplier: 'deleteSupplier',
      warehouseLocation: 'deleteLocation',
      cost: 'deleteRecord',
      todo: 'deleteTodo'
    }
    return methodMap[module] || 'deleteItem'
  }

  /**
   * 获取批量删除方法名
   */
  _getBatchDeleteMethod(module) {
    const methodMap = {
      customer: 'batchDelete',
      inventory: 'batchDeleteInventory',
      quotation: 'batchDelete',
      contract: 'batchDelete'
    }
    return methodMap[module] || null
  }

  /**
   * 清除模块相关缓存
   */
  _invalidateModuleCache(module) {
    dataCache.invalidateNamespace('selectOptions')
    dataCache.invalidateNamespace('dataService')
  }

  /**
   * 清除单条数据缓存
   */
  _invalidateItemCache(module, id) {
    dataCache.invalidate(`${module}:item:${id}`, { namespace: 'dataService' })
  }

  /**
   * 计算变更差异
   */
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
}

/* 全局单例 */
const dataService = new DataService()

export default dataService
