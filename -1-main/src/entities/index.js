/**
 * 统一实体元数据注册表
 * 作为所有业务实体的单一事实来源，替代 dataService.js、dataCenter.js、syncEngine.js 中各自维护的硬编码映射表
 *
 * 每个实体定义包含：
 * - dataKey: Store 中数据数组的属性名
 * - storeName: Store 标识名
 * - tableName: Supabase 表名
 * - storageKey: localStorage 持久化键名
 * - methods: Store 的 CRUD 方法名映射
 * - permissions: 权限模块和操作映射
 * - validation: 数据验证规则
 * - workflowType: 关联的工作流类型（可选）
 */

/* ========== 实体元数据定义 ========== */

export const entityRegistry = {
  customer: {
    dataKey: 'customers',
    storeName: 'customer',
    tableName: 'customers',
    storageKey: 'gj_erp_customers',
    methods: {
      add: 'addCustomer',
      update: 'updateCustomer',
      delete: 'deleteCustomer',
      batchDelete: 'batchDelete'
    },
    permissions: {
      module: 'quote_contract',
      actions: {
        create: 'canCreateQuote',
        update: 'canEditOthersQuote',
        delete: 'canDeleteQuote'
      }
    },
    validation: {
      required: ['name'],
      fields: {
        name: { type: 'string', maxLength: 100, label: '客户名称' },
        phone: { type: 'string', pattern: /^[\d\-+() ]*$/, label: '电话' },
        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]*$/, label: '邮箱', optional: true },
        level: { type: 'enum', values: ['A', 'B', 'C'], label: '等级' },
        creditLimit: { type: 'number', min: 0, label: '信用额度' },
        balance: { type: 'number', label: '余额' }
      }
    }
  },

  quotation: {
    dataKey: 'quotations',
    storeName: 'quotation',
    tableName: 'quotations',
    storageKey: 'gj_erp_quotations',
    methods: {
      add: 'addQuotation',
      update: 'updateQuotation',
      delete: 'deleteQuotation',
      batchDelete: 'batchDelete'
    },
    permissions: {
      module: 'quote_contract',
      actions: {
        create: 'canCreateQuote',
        update: 'canEditOthersQuote',
        delete: 'canDeleteQuote'
      }
    },
    validation: {
      required: ['quoteNo'],
      fields: {
        quoteNo: { type: 'string', label: '报价编号' },
        customerName: { type: 'string', label: '客户名称' },
        total: { type: 'number', min: 0, label: '总金额' }
      }
    },
    workflowType: 'quotation'
  },

  contract: {
    dataKey: 'contracts',
    storeName: 'contract',
    tableName: 'contracts',
    storageKey: 'gj_erp_contracts',
    methods: {
      add: 'addContract',
      update: 'updateContract',
      delete: 'deleteContract',
      batchDelete: 'batchDelete'
    },
    permissions: {
      module: 'quote_contract',
      actions: {
        create: 'canCreateContract',
        update: 'canEditContract',
        delete: 'canDeleteContract'
      }
    },
    validation: {
      required: ['contractNo'],
      fields: {
        contractNo: { type: 'string', label: '合同编号' },
        customerName: { type: 'string', label: '客户名称' },
        amount: { type: 'number', min: 0, label: '合同金额' }
      }
    },
    workflowType: 'contract'
  },

  inventory: {
    dataKey: 'inventory',
    storeName: 'inventory',
    tableName: 'inventory',
    storageKey: 'gj_erp_inventory',
    methods: {
      add: 'addInventoryItem',
      update: 'updateInventoryItem',
      delete: 'deleteInventoryItem',
      batchDelete: 'batchDeleteInventory'
    },
    permissions: {
      module: 'inbound',
      actions: {
        create: 'inboundCreate',
        update: 'inboundEdit',
        delete: 'inboundDelete'
      }
    },
    validation: {
      required: ['code', 'name'],
      fields: {
        code: { type: 'string', label: '编号' },
        name: { type: 'string', label: '物料名称' },
        quantity: { type: 'number', min: 0, label: '数量' },
        unitCost: { type: 'number', min: 0, label: '单价' }
      }
    }
  },

  delivery: {
    dataKey: 'deliveries',
    storeName: 'delivery',
    tableName: 'deliveries',
    storageKey: 'gj_erp_deliveries',
    methods: {
      add: 'addDelivery',
      update: 'updateDelivery',
      delete: 'deleteDelivery',
      batchDelete: null
    },
    permissions: {
      module: 'delivery',
      actions: {
        create: 'deliveryCreate',
        update: 'deliveryEdit',
        delete: 'deliveryDelete'
      }
    },
    validation: {
      required: ['deliveryNo', 'customerName'],
      fields: {
        deliveryNo: { type: 'string', label: '送货单号' },
        customerName: { type: 'string', label: '客户名称' }
      }
    }
  },

  collection: {
    dataKey: 'collections',
    storeName: 'collection',
    tableName: 'collections',
    storageKey: 'gj_erp_collections',
    methods: {
      add: 'addCollection',
      update: 'updateCollection',
      delete: 'deleteCollection',
      batchDelete: null
    },
    permissions: {
      module: 'statement',
      actions: {
        create: 'statementCreate',
        update: 'statementUpdate',
        delete: 'statementDelete'
      }
    },
    validation: {
      required: ['collectionNo'],
      fields: {
        collectionNo: { type: 'string', label: '回款编号' },
        amount: { type: 'number', min: 0, label: '回款金额' }
      }
    },
    workflowType: 'payment'
  },

  statement: {
    dataKey: 'statements',
    storeName: 'statement',
    tableName: 'statements',
    storageKey: 'gj_erp_statements',
    methods: {
      add: 'addStatement',
      update: 'updateStatement',
      delete: 'deleteStatement',
      batchDelete: null
    },
    permissions: {
      module: 'statement',
      actions: {
        create: 'statementCreate',
        update: 'statementUpdate',
        delete: 'statementDelete'
      }
    }
  },

  supplier: {
    dataKey: 'suppliers',
    storeName: 'supplier',
    tableName: 'suppliers',
    storageKey: 'gj_erp_suppliers',
    methods: {
      add: 'addSupplier',
      update: 'updateSupplier',
      delete: 'deleteSupplier',
      batchDelete: null
    },
    permissions: {
      module: 'supplier',
      actions: {
        create: 'supplierCreate',
        update: 'supplierEdit',
        delete: 'supplierDelete'
      }
    },
    validation: {
      required: ['name'],
      fields: {
        name: { type: 'string', label: '供应商名称' },
        rating: { type: 'enum', values: ['A', 'B', 'C'], label: '评级' }
      }
    }
  },

  warehouseLocation: {
    dataKey: 'locations',
    storeName: 'warehouseLocation',
    tableName: 'warehouse_locations',
    storageKey: 'gj_erp_warehouseLocations',
    methods: {
      add: 'addLocation',
      update: 'updateLocation',
      delete: 'deleteLocation',
      batchDelete: null
    },
    permissions: {
      module: 'warehouse',
      actions: {
        create: 'warehouseCreate',
        update: 'warehouseUpdate',
        delete: 'warehouseDelete'
      }
    }
  },

  cost: {
    dataKey: 'records',
    storeName: 'cost',
    tableName: 'cost_records',
    storageKey: 'gj_erp_costAnalysis',
    methods: {
      add: 'addRecord',
      update: 'updateRecord',
      delete: 'deleteRecord',
      batchDelete: null
    },
    permissions: {
      module: 'cost',
      actions: {
        create: 'costEdit',
        update: 'costEdit',
        delete: 'costDelete'
      }
    }
  },

  todo: {
    dataKey: 'todos',
    storeName: 'todo',
    tableName: 'todos',
    storageKey: 'gj_erp_todos',
    methods: {
      add: 'addTodo',
      update: 'updateTodo',
      delete: 'deleteTodo',
      batchDelete: null
    },
    permissions: {
      module: null,
      actions: {}
    }
  },

  transaction: {
    dataKey: 'transactions',
    storeName: 'transaction',
    tableName: 'transactions',
    storageKey: 'gj_erp_transactions',
    methods: {
      add: 'addTransaction',
      update: 'updateTransaction',
      delete: 'deleteTransaction',
      batchDelete: null
    },
    permissions: {
      module: null,
      actions: {}
    }
  },

  purchase: {
    dataKey: 'purchaseOrders',
    storeName: 'purchase',
    tableName: 'purchase_orders',
    storageKey: 'gj_erp_purchaseOrders',
    methods: {
      add: 'addOrder',
      update: 'updateOrder',
      delete: 'deleteOrder',
      batchDelete: null
    },
    permissions: {
      module: 'purchase',
      actions: {
        create: 'purchaseCreate',
        update: 'purchaseEdit',
        delete: 'purchaseDelete'
      }
    },
    workflowType: 'purchase'
  },

  production: {
    dataKey: 'productionOrders',
    storeName: 'production',
    tableName: 'production_orders',
    storageKey: 'gj_erp_productionOrders',
    methods: {
      add: 'addOrder',
      update: 'updateOrder',
      delete: 'deleteOrder',
      batchDelete: null
    },
    permissions: {
      module: 'production',
      actions: {
        create: 'productionCreate',
        update: 'productionEdit',
        delete: 'productionCancel'
      }
    }
  },

  transfer: {
    dataKey: 'transferOrders',
    storeName: 'transfer',
    tableName: 'transfer_orders',
    storageKey: 'gj_erp_transferOrders',
    methods: {
      add: 'addOrder',
      update: 'updateOrder',
      delete: 'deleteOrder',
      batchDelete: null
    },
    permissions: {
      module: 'transfer',
      actions: {
        create: 'transferCreate',
        update: 'transferEdit',
        delete: 'transferDelete'
      }
    }
  }
}

/* ========== 查询辅助函数 ========== */

/**
 * 获取实体元数据
 * @param {string} entityName - 实体名
 * @returns {Object|null} 实体元数据
 */
export function getEntityMeta(entityName) {
  return entityRegistry[entityName] || null
}

/**
 * 根据 Supabase 表名反查实体名
 * @param {string} tableName - Supabase 表名
 * @returns {string|null} 实体名
 */
export function getEntityByTable(tableName) {
  for (const [name, meta] of Object.entries(entityRegistry)) {
    if (meta.tableName === tableName) return name
  }
  return null
}

/**
 * 根据 Store 名反查实体名
 * @param {string} storeName - Store 名
 * @returns {string|null} 实体名
 */
export function getEntityByStore(storeName) {
  for (const [name, meta] of Object.entries(entityRegistry)) {
    if (meta.storeName === storeName) return name
  }
  return null
}

/**
 * 获取所有实体的表名列表（用于 Supabase 订阅）
 * @returns {string[]} 表名数组
 */
export function getAllTableNames() {
  return Object.values(entityRegistry).map((m) => m.tableName)
}

/**
 * 获取所有实体名列表
 * @returns {string[]}
 */
export function getAllEntityNames() {
  return Object.keys(entityRegistry)
}

/**
 * 构建表名到模块名的反向映射（兼容 dataCenter.js 的 TABLE_TO_MODULE）
 * @returns {Object} { tableName: entityName }
 */
export function buildTableToEntityMap() {
  const map = {}
  for (const [name, meta] of Object.entries(entityRegistry)) {
    map[meta.tableName] = name
  }
  return map
}

export default entityRegistry
