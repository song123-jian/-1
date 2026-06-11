/**
 * 统一数据管理中心 (Pinia Store)
 * 实现数据的集中存储与分发，确保各功能模块访问一致的数据源
 * 核心职责：
 * 1. 集中管理所有模块的数据引用
 * 2. 提供统一的数据访问接口
 * 3. 跨模块数据关联与聚合
 * 4. 数据变更的集中分发
 * 5. 下拉选项的统一管理
 * 6. 数据导入导出的统一入口
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import eventBus, { DataEvents, DataModules } from '@/utils/eventBus'
import dataCache from '@/utils/dataCache'
import dataService, { DataResult } from '@/services/dataService'
import versionControl from '@/utils/versionControl'

/* 各模块Store的懒加载映射 */
const STORE_IMPORTS = {
  customer: () => import('@/modules/customer/stores/customer').then((m) => m.useCustomerStore()),
  quotation: () => import('@/modules/sales/stores/quotation').then((m) => m.useQuotationStore()),
  contract: () => import('@/modules/sales/stores/contract').then((m) => m.useContractStore()),
  inventory: () => import('@/modules/warehouse/stores/inventory').then((m) => m.useInventoryStore()),
  delivery: () => import('@/stores/delivery').then((m) => m.useDeliveryStore()),
  collection: () => import('@/modules/finance/stores/collection').then((m) => m.useCollectionStore()),
  statement: () => import('@/modules/finance/stores/statement').then((m) => m.useStatementStore()),
  supplier: () => import('@/modules/purchase/stores/supplier').then((m) => m.useSupplierStore()),
  warehouse: () => import('@/modules/warehouse/stores/warehouseLocation').then((m) => m.useWarehouseLocationStore()),
  warehouseLocation: () => import('@/modules/warehouse/stores/warehouseLocation').then((m) => m.useWarehouseLocationStore()),
  cost: () => import('@/modules/finance/stores/cost').then((m) => m.useCostStore()),
  todo: () => import('@/stores/todo').then((m) => m.useTodoStore()),
  purchase: () => import('@/modules/purchase/stores/purchase').then((m) => m.usePurchaseStore()),
  production: () => import('@/modules/production/stores/production').then((m) => m.useProductionStore()),
  transfer: () => import('@/modules/warehouse/stores/transfer').then((m) => m.useTransferStore())
}

/* 模块数据键映射 */
const DATA_KEY_MAP = {
  customer: 'customers',
  quotation: 'quotations',
  contract: 'contracts',
  inventory: 'inventory',
  delivery: 'deliveries',
  collection: 'collections',
  statement: 'statements',
  supplier: 'suppliers',
  warehouse: 'warehouses',
  warehouseLocation: 'locations',
  cost: 'records',
  todo: 'todos',
  purchase: 'orders',
  production: 'orders',
  transfer: 'transfers'
}

/* 下拉选项配置 - 定义每个模块可提供的下拉选项 */
const SELECT_CONFIGS = {
  /* 客户下拉选项 */
  customer: {
    default: { valueField: 'id', labelField: 'name', filters: [] },
    variants: {
      active: { valueField: 'id', labelField: 'name', filters: [{ field: 'status', operator: 'eq', value: 'active' }] },
      byLevel: { valueField: 'id', labelField: 'name', groupBy: 'level' },
      byRegion: { valueField: 'id', labelField: 'name', groupBy: 'region' },
      /* 级联：按等级筛选客户 */
      byCustomerLevel: { valueField: 'id', labelField: 'name', filters: [] }
    }
  },
  /* 供应商下拉选项 */
  supplier: {
    default: { valueField: 'id', labelField: 'name', filters: [] },
    variants: {
      active: { valueField: 'id', labelField: 'name', filters: [{ field: 'status', operator: 'eq', value: 'active' }] },
      withCode: { valueField: 'id', labelField: 'name', filters: [] }
    }
  },
  /* 库存物料下拉选项 */
  inventory: {
    default: { valueField: 'code', labelField: 'name', filters: [] },
    variants: {
      inStock: { valueField: 'code', labelField: 'name', filters: [{ field: 'quantity', operator: 'gt', value: 0 }] },
      lowStock: {
        valueField: 'code',
        labelField: 'name',
        filters: [{ field: 'status', operator: 'eq', value: 'low' }]
      },
      byCategory: { valueField: 'code', labelField: 'name', groupBy: 'category' },
      byWarehouse: { valueField: 'code', labelField: 'name', groupBy: 'warehouse' },
      /* 级联：按类别筛选物料 */
      byCatFilter: { valueField: 'code', labelField: 'name', filters: [] }
    }
  },
  /* 报价单下拉选项 */
  quotation: {
    default: { valueField: 'id', labelField: 'quoteNo', filters: [] },
    variants: {
      approved: {
        valueField: 'id',
        labelField: 'quoteNo',
        filters: [{ field: 'status', operator: 'eq', value: 'approved' }]
      },
      accepted: {
        valueField: 'id',
        labelField: 'quoteNo',
        filters: [{ field: 'status', operator: 'eq', value: 'accepted' }]
      },
      /* 级联：按客户筛选报价单 */
      byCustomer: { valueField: 'id', labelField: 'quoteNo', filters: [] }
    }
  },
  /* 合同下拉选项 */
  contract: {
    default: { valueField: 'id', labelField: 'contractNo', filters: [] },
    variants: {
      active: {
        valueField: 'id',
        labelField: 'contractNo',
        filters: [{ field: 'status', operator: 'in', value: ['approved', 'signed'] }]
      },
      /* 级联：按客户筛选合同 */
      byCustomer: { valueField: 'id', labelField: 'contractNo', filters: [] }
    }
  },
  /* 仓库下拉选项 */
  warehouse: {
    default: { valueField: 'id', labelField: 'name', filters: [] },
    variants: {
      active: { valueField: 'id', labelField: 'name', filters: [] }
    }
  },
  /* 仓位下拉选项 */
  warehouseLocation: {
    default: { valueField: 'id', labelField: 'locationCode', filters: [] },
    variants: {
      available: {
        valueField: 'id',
        labelField: 'locationCode',
        filters: [{ field: 'status', operator: 'eq', value: 'available' }]
      },
      /* 级联：按仓库筛选仓位 */
      byWarehouse: { valueField: 'id', labelField: 'locationCode', filters: [] }
    }
  },
  /* 送货单下拉选项 */
  delivery: {
    default: { valueField: 'id', labelField: 'deliveryNo', filters: [] },
    variants: {
      pending: {
        valueField: 'id',
        labelField: 'deliveryNo',
        filters: [{ field: 'status', operator: 'eq', value: 'pending' }]
      },
      byCustomer: { valueField: 'id', labelField: 'deliveryNo', filters: [] }
    }
  },
  /* 回款下拉选项 */
  collection: {
    default: { valueField: 'id', labelField: 'receiptNo', filters: [] },
    variants: {
      byCustomer: { valueField: 'id', labelField: 'receiptNo', filters: [] }
    }
  },
  /* 对账单下拉选项 */
  statement: {
    default: { valueField: 'id', labelField: 'statementNo', filters: [] },
    variants: {
      byCustomer: { valueField: 'id', labelField: 'statementNo', filters: [] }
    }
  },
  /* 采购单下拉选项 */
  purchase: {
    default: { valueField: 'id', labelField: 'orderNo', filters: [] },
    variants: {
      pending: {
        valueField: 'id',
        labelField: 'orderNo',
        filters: [{ field: 'status', operator: 'eq', value: 'pending' }]
      }
    }
  },
  /* 生产工单下拉选项 */
  production: {
    default: { valueField: 'id', labelField: 'orderNo', filters: [] },
    variants: {
      pending: {
        valueField: 'id',
        labelField: 'orderNo',
        filters: [{ field: 'status', operator: 'eq', value: 'pending' }]
      }
    }
  },
  /* 调拨单下拉选项 */
  transfer: {
    default: { valueField: 'id', labelField: 'transferNo', filters: [] },
    variants: {
      pending: {
        valueField: 'id',
        labelField: 'transferNo',
        filters: [{ field: 'status', operator: 'eq', value: 'pending' }]
      }
    }
  }
}

export const useDataCenterStore = defineStore('dataCenter', () => {
  /* ========== Store实例缓存 ========== */
  const _stores = ref({})
  const _initialized = ref(false)

  /* ========== 数据引用（响应式） ========== */
  const customers = computed(() => _stores.value.customer?.customers || [])
  const quotations = computed(() => _stores.value.quotation?.quotations || [])
  const contracts = computed(() => _stores.value.contract?.contracts || [])
  const inventory = computed(() => _stores.value.inventory?.inventory || [])
  const deliveries = computed(() => _stores.value.delivery?.deliveries || [])
  const collections = computed(() => _stores.value.collection?.collections || [])
  const statements = computed(() => _stores.value.statement?.statements || [])
  const suppliers = computed(() => _stores.value.supplier?.suppliers || [])
  const warehouses = computed(() => _stores.value.warehouse?.warehouses || [])
  const warehouseLocations = computed(() => _stores.value.warehouseLocation?.locations || [])
  const costRecords = computed(() => _stores.value.cost?.records || [])
  const todos = computed(() => _stores.value.todo?.todos || [])

  /* ========== 下拉选项缓存 ========== */
  const _selectOptionsCache = ref({})

  /* ========== 跨模块关联数据 ========== */

  /* 客户关联数据：某客户的所有报价/合同/送货/回款 */
  function getCustomerRelatedData(customerId) {
    const customerName = customers.value.find((c) => c.id === customerId)?.name || ''
    return {
      quotations: quotations.value.filter((q) => q.customerId === customerId || q.customerName === customerName),
      contracts: contracts.value.filter((c) => c.customerId === customerId || c.customerName === customerName),
      deliveries: deliveries.value.filter((d) => d.customerId === customerId || d.customerName === customerName),
      collections: collections.value.filter((c) => c.customerId === customerId || c.customerName === customerName),
      statements: statements.value.filter((s) => s.customerId === customerId || s.customerName === customerName)
    }
  }

  /* 报价关联数据：某报价的合同/送货 */
  function getQuotationRelatedData(quotationId) {
    const quote = quotations.value.find((q) => q.id === quotationId)
    if (!quote) return { contracts: [], deliveries: [] }
    return {
      contracts: contracts.value.filter((c) => c.quotationId === quotationId || c.quoteNo === quote.quoteNo),
      deliveries: deliveries.value.filter((d) => d.referenceId === quotationId || d.referenceNo === quote.quoteNo)
    }
  }

  /* 合同关联数据：某合同的送货/回款/对账 */
  function getContractRelatedData(contractId) {
    const contract = contracts.value.find((c) => c.id === contractId)
    if (!contract) return { deliveries: [], collections: [], statements: [] }
    return {
      deliveries: deliveries.value.filter((d) => d.contractId === contractId || d.referenceNo === contract.contractNo),
      collections: collections.value.filter((c) => c.contractId === contractId || c.contractNo === contract.contractNo),
      statements: statements.value.filter((s) => s.contractId === contractId)
    }
  }

  /* 库存关联数据：某物料的出入库记录 */
  function getInventoryRelatedData(materialCode) {
    const invStore = _stores.value.inventory
    if (!invStore) return { inboundOrders: [], outboundOrders: [] }
    const allOrders = invStore.warehouseOrders || []
    return {
      inboundOrders: allOrders.filter(
        (o) =>
          o.materialCode === materialCode &&
          ['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(o.type)
      ),
      outboundOrders: allOrders.filter(
        (o) =>
          o.materialCode === materialCode &&
          !['purchase', 'return', 'transfer', 'customer_return', 'production_return', 'surplus', 'gift'].includes(
            o.type
          )
      )
    }
  }

  /* ========== 下拉选项管理 ========== */

  /**
   * 获取下拉选项
   * @param {string} module - 模块名
   * @param {string} variant - 变体名称 (如 'active', 'byLevel')
   * @param {Object} customConfig - 自定义配置覆盖
   * @returns {Array} 选项数组 [{value, label, data, group?}]
   */
  function getSelectOptions(module, variant = 'default', customConfig = {}) {
    const cacheKey = `${module}:${variant}:${JSON.stringify(customConfig)}`

    /* 检查缓存 */
    if (_selectOptionsCache.value[cacheKey]) {
      return _selectOptionsCache.value[cacheKey]
    }

    const config = SELECT_CONFIGS[module]
    if (!config) return []

    const mergedConfig = { ...config.default, ...config.variants[variant], ...customConfig }
    const { valueField = 'id', labelField = 'name', filters = [], groupBy, search } = mergedConfig

    /* 获取数据源 */
    const dataKey = DATA_KEY_MAP[module]
    const store = _stores.value[module]
    if (!store || !store[dataKey]) return []

    let data = [...store[dataKey]]

    /* 应用过滤 */
    for (const filter of filters) {
      data = data.filter((d) => {
        const val = d[filter.field]
        if (filter.operator === 'eq') return val === filter.value
        if (filter.operator === 'neq') return val !== filter.value
        if (filter.operator === 'gt') return val > filter.value
        if (filter.operator === 'in') return filter.value.includes(val)
        return true
      })
    }

    /* 搜索过滤 */
    if (search) {
      const keyword = search.toLowerCase()
      data = data.filter((d) =>
        Object.values(d).some((v) => v && typeof v === 'string' && v.toLowerCase().includes(keyword))
      )
    }

    /* 转换为选项 */
    let options
    if (groupBy) {
      /* 分组选项 */
      const groups = {}
      for (const item of data) {
        const group = item[groupBy] || '未分类'
        if (!groups[group]) groups[group] = []
        groups[group].push({
          value: item[valueField],
          label: typeof labelField === 'function' ? labelField(item) : item[labelField] || item[valueField],
          data: item,
          group
        })
      }
      options = Object.entries(groups).map(([group, items]) => ({
        group,
        items
      }))
    } else {
      options = data.map((item) => ({
        value: item[valueField],
        label: typeof labelField === 'function' ? labelField(item) : item[labelField] || item[valueField],
        data: item
      }))
    }

    /* 缓存结果 */
    _selectOptionsCache.value[cacheKey] = options

    return options
  }

  /**
   * 刷新下拉选项缓存
   * @param {string} [module] - 模块名，不传则刷新全部
   */
  function refreshSelectOptions(module) {
    if (module) {
      /* 清除该模块的所有缓存 */
      const keys = Object.keys(_selectOptionsCache.value).filter((k) => k.startsWith(module + ':'))
      for (const key of keys) {
        delete _selectOptionsCache.value[key]
      }
    } else {
      _selectOptionsCache.value = {}
    }
  }

  /* ========== 统一数据操作接口 ========== */

  /**
   * 统一查询
   */
  function query(module, options = {}) {
    return dataService.query(module, options)
  }

  /**
   * 统一新增
   */
  async function create(module, data, options = {}) {
    const result = await dataService.create(module, data, options)
    if (result.success) {
      refreshSelectOptions(module)
    }
    return result
  }

  /**
   * 统一修改
   */
  async function update(module, id, updates, options = {}) {
    const result = await dataService.update(module, id, updates, options)
    if (result.success) {
      refreshSelectOptions(module)
    }
    return result
  }

  /**
   * 统一删除
   */
  async function remove(module, id, options = {}) {
    const result = await dataService.remove(module, id, options)
    if (result.success) {
      refreshSelectOptions(module)
    }
    return result
  }

  /**
   * 统一批量删除
   */
  async function batchDelete(module, ids, options = {}) {
    const result = await dataService.batchDelete(module, ids, options)
    if (result.success) {
      refreshSelectOptions(module)
    }
    return result
  }

  /* ========== 数据导入导出 ========== */

  /**
   * 导出模块数据
   * @param {string} module - 模块名
   * @param {Object} options - 选项 { format, filters, fields }
   * @returns {string} 导出数据（JSON字符串或CSV）
   */
  function exportData(module, options = {}) {
    const dataKey = DATA_KEY_MAP[module]
    const store = _stores.value[module]
    if (!store || !store[dataKey]) return ''

    let data = [...store[dataKey]]

    /* 应用过滤 */
    if (options.filters) {
      for (const filter of options.filters) {
        data = data.filter((d) => d[filter.field] === filter.value)
      }
    }

    /* 字段选择 */
    if (options.fields && options.fields.length > 0) {
      data = data.map((item) => {
        const filtered = {}
        for (const field of options.fields) {
          filtered[field] = item[field]
        }
        return filtered
      })
    }

    if (options.format === 'csv') {
      return _toCSV(data, options.fields)
    }

    return JSON.stringify(
      {
        module,
        exportedAt: new Date().toISOString(),
        count: data.length,
        data
      },
      null,
      2
    )
  }

  /**
   * 导入模块数据
   * @param {string} module - 模块名
   * @param {string} content - 导入内容（JSON或CSV）
   * @param {Object} options - 选项 { format, merge, onProgress }
   * @returns {DataResult} 导入结果
   */
  async function importData(module, content, options = {}) {
    try {
      let data
      if (options.format === 'csv') {
        data = _fromCSV(content)
      } else {
        const parsed = JSON.parse(content)
        data = parsed.data || parsed
      }

      if (!Array.isArray(data)) {
        return DataResult.fail('导入数据必须是数组格式')
      }

      const store = _stores.value[module]
      if (!store) return DataResult.fail(`未注册的模块: ${module}`)

      /* 查找导入方法 */
      const importMethod = Object.keys(store).find((k) => k.startsWith('import') && typeof store[k] === 'function')

      if (importMethod) {
        const result = store[importMethod](data)
        refreshSelectOptions(module)
        return DataResult.ok(result)
      }

      /* 降级：逐条新增 */
      let imported = 0,
        skipped = 0
      for (const item of data) {
        const result = await dataService.create(module, item, { checkPermission: false, validate: false })
        if (result.success) imported++
        else skipped++
        if (options.onProgress) options.onProgress(imported + skipped, data.length)
      }

      refreshSelectOptions(module)
      return DataResult.ok({ imported, skipped })
    } catch (e) {
      return DataResult.fail(`导入失败: ${e.message}`)
    }
  }

  /* ========== 聚合统计 ========== */

  /* 客户统计 */
  const customerStats = computed(() => ({
    total: customers.value.length,
    active: customers.value.filter((c) => c.status === 'active').length,
    dormant: customers.value.filter((c) => c.status === 'dormant').length,
    totalBalance: customers.value.reduce((s, c) => s + (c.balance || 0), 0),
    totalCreditLimit: customers.value.reduce((s, c) => s + (c.creditLimit || 0), 0),
    regions: [...new Set(customers.value.map((c) => c.region).filter(Boolean))].sort(),
    levels: {
      A: customers.value.filter((c) => c.level === 'A').length,
      B: customers.value.filter((c) => c.level === 'B').length,
      C: customers.value.filter((c) => c.level === 'C').length
    }
  }))

  /* 库存统计 */
  const inventoryStats = computed(() => ({
    total: inventory.value.length,
    totalValue: inventory.value.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0),
    lowStock: inventory.value.filter((i) => i.status === 'low' || i.status === 'exhausted').length,
    categories: [...new Set(inventory.value.map((i) => i.category).filter(Boolean))].sort()
  }))

  /* 报价统计 */
  const quotationStats = computed(() => ({
    total: quotations.value.length,
    pending: quotations.value.filter((q) => q.status === 'pending' || q.status === 'sent').length,
    totalAmount: quotations.value.reduce((s, q) => s + (q.total || 0), 0)
  }))

  /* 合同统计 */
  const contractStats = computed(() => ({
    total: contracts.value.length,
    active: contracts.value.filter((c) => ['approved', 'signed'].includes(c.status)).length,
    totalAmount: contracts.value.reduce((s, c) => s + (c.amount || 0), 0)
  }))

  /* ========== 初始化 ========== */

  /**
   * 初始化数据管理中心
   * 注册所有Store，启动事件监听
   */
  async function init() {
    if (_initialized.value) return

    /* 初始化缓存管理器 */
    dataCache.init()

    /* 初始化版本控制器 */
    versionControl.init()

    /* 注册Store实例 */
    for (const [module, storeLoader] of Object.entries(STORE_IMPORTS)) {
      try {
        const store = await storeLoader()
        _stores.value[module] = store
        dataService.registerStore(module, store)
      } catch (e) {
        console.warn(`[DataCenter] 注册 ${module} Store 失败:`, e)
      }
    }

    /* 监听数据变更，自动刷新下拉选项缓存 */
    eventBus.on(DataEvents.UPDATED, (data) => {
      if (data.module) {
        refreshSelectOptions(data.module)
      }
    })
    eventBus.on(DataEvents.CREATED, (data) => {
      if (data.module) {
        refreshSelectOptions(data.module)
      }
    })
    eventBus.on(DataEvents.DELETED, (data) => {
      if (data.module) {
        refreshSelectOptions(data.module)
      }
    })

    _initialized.value = true
    console.info('[DataCenter] 数据管理中心初始化完成')
  }

  /* ========== 工具方法 ========== */

  /**
   * CSV转换
   */
  function _toCSV(data, fields) {
    if (data.length === 0) return ''
    const headers = fields || Object.keys(data[0])
    const lines = [headers.join(',')]
    for (const item of data) {
      const row = headers.map((h) => {
        const val = item[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
      })
      lines.push(row.join(','))
    }
    return '\uFEFF' + lines.join('\n')
  }

  /**
   * CSV解析
   */
  function _fromCSV(content) {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    const headers = _parseCSVLine(lines[0])
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = _parseCSVLine(lines[i])
      const item = {}
      headers.forEach((h, idx) => {
        item[h.trim()] = (values[idx] || '').trim()
      })
      data.push(item)
    }
    return data
  }

  /**
   * 解析CSV行（处理引号内的逗号）
   */
  function _parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          result.push(current)
          current = ''
        } else {
          current += char
        }
      }
    }
    result.push(current)
    return result
  }

  /**
   * 获取版本历史
   */
  function getVersionHistory(module, itemId, options = {}) {
    return versionControl.getVersions(module, itemId, options)
  }

  /**
   * 回滚版本
   */
  function restoreVersion(module, itemId, versionId) {
    return versionControl.restoreVersion(module, itemId, versionId)
  }

  /**
   * 获取缓存统计
   */
  function getCacheStats() {
    return dataCache.getStats()
  }

  /**
   * 获取事件统计
   */
  function getEventStats() {
    return eventBus.getStats()
  }

  /**
   * 获取版本统计
   */
  function getVersionStats() {
    return versionControl.getStats()
  }

  return {
    /* 初始化 */
    init,
    _initialized,

    /* 数据引用 */
    customers,
    quotations,
    contracts,
    inventory,
    deliveries,
    collections,
    statements,
    suppliers,
    warehouses,
    warehouseLocations,
    costRecords,
    todos,

    /* 跨模块关联 */
    getCustomerRelatedData,
    getQuotationRelatedData,
    getContractRelatedData,
    getInventoryRelatedData,

    /* 下拉选项 */
    getSelectOptions,
    refreshSelectOptions,

    /* 统一CRUD */
    query,
    create,
    update,
    remove,
    batchDelete,

    /* 导入导出 */
    exportData,
    importData,

    /* 聚合统计 */
    customerStats,
    inventoryStats,
    quotationStats,
    contractStats,

    /* 版本控制 */
    getVersionHistory,
    restoreVersion,

    /* 诊断工具 */
    getCacheStats,
    getEventStats,
    getVersionStats,

    /* Store引用 */
    _stores
  }
})
