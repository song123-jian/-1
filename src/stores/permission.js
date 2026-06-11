import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'gj_erp_customerPermissions'
const ROLES_KEY = 'gj_erp_customRoles'
const INIT_KEY = 'gj_erp_permissions_initialized'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return fallback
}
function persist(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('[permission] localStorage容量不足，数据可能丢失！')
    }
  }
}

const defaultRoles = ['管理员', '总经理', '销售主管', '销售员', '仓库主管', '仓管员', '财务', '查看者']

const defaultModules = [
  {
    key: 'quote_contract',
    label: '报价/合同',
    perms: [
      'canApproveQuote',
      'canApproveLargeQuote',
      'canDeleteQuote',
      'canEditOthersQuote',
      'canCreateQuote',
      'canCreateContract',
      'canEditContract',
      'canSignContract',
      'canDeleteContract',
      'canArchiveContract',
      'canApproveContract'
    ]
  },
  {
    key: 'inbound',
    label: '入库',
    perms: [
      'inboundCreate',
      'inboundEdit',
      'inboundDelete',
      'inboundConfirm',
      'inboundInspect',
      'inboundExport',
      'inboundViewCost',
      'inboundPrint',
      'inboundImport'
    ]
  },
  {
    key: 'outbound',
    label: '出库',
    perms: [
      'outboundCreate',
      'outboundUpdate',
      'outboundDelete',
      'outboundApprove',
      'outboundConfirm',
      'outboundCancel',
      'outboundReverse',
      'outboundExport',
      'outboundPrint'
    ]
  },
  {
    key: 'warehouse',
    label: '仓位管理',
    perms: ['warehouseCreate', 'warehouseUpdate', 'warehouseDelete', 'warehouseExport']
  },
  {
    key: 'statement',
    label: '对账',
    perms: [
      'statementCreate',
      'statementRead',
      'statementUpdate',
      'statementDelete',
      'statementConfirm',
      'statementVoid',
      'statementPay',
      'statementExport',
      'statementPrint'
    ]
  },
  {
    key: 'delivery',
    label: '送货',
    perms: [
      'deliveryCreate',
      'deliveryEdit',
      'deliveryDelete',
      'deliveryViewDetail',
      'deliveryChangeStatus',
      'deliveryExport',
      'deliveryImport',
      'deliveryPrint'
    ]
  },
  {
    key: 'cost',
    label: '成本核算',
    perms: ['costView', 'costExport', 'costEdit', 'costDelete', 'costViewStandard', 'costEditStandard']
  },
  {
    key: 'purchase',
    label: '采购',
    perms: [
      'purchaseCreate',
      'purchaseEdit',
      'purchaseDelete',
      'purchaseApprove',
      'purchaseOrder',
      'purchaseReceive',
      'purchaseInspect',
      'purchaseComplete',
      'purchaseCancel',
      'purchaseExport',
      'purchasePrint'
    ]
  },
  {
    key: 'supplier',
    label: '供应商',
    perms: [
      'supplierCreate',
      'supplierEdit',
      'supplierDelete',
      'supplierView',
      'supplierEvaluate',
      'supplierBlacklist',
      'supplierExport'
    ]
  },
  {
    key: 'receivable',
    label: '应收',
    perms: [
      'receivableView',
      'receivableCreate',
      'receivableEdit',
      'receivableDelete',
      'receiptCreate',
      'receivableExport',
      'receivableAging'
    ]
  },
  {
    key: 'payable',
    label: '应付',
    perms: [
      'payableView',
      'payableCreate',
      'payableEdit',
      'payableDelete',
      'paymentCreate',
      'payableExport',
      'payableAging'
    ]
  },
  {
    key: 'workflow',
    label: '工作流',
    perms: [
      'workflowView',
      'workflowApprove',
      'workflowDelegate',
      'workflowAddApprover',
      'workflowCancel',
      'workflowDesign'
    ]
  },
  {
    key: 'stocktaking',
    label: '盘点',
    perms: ['stocktakingCreate', 'stocktakingExecute', 'stocktakingReview', 'stocktakingAdjust', 'stocktakingExport']
  },
  {
    key: 'transfer',
    label: '调拨',
    perms: [
      'transferCreate',
      'transferEdit',
      'transferDelete',
      'transferApprove',
      'transferShip',
      'transferReceive',
      'transferExport',
      'transferPrint'
    ]
  },
  {
    key: 'production',
    label: '生产',
    perms: [
      'productionCreate',
      'productionEdit',
      'productionRelease',
      'productionStart',
      'productionQualityCheck',
      'productionComplete',
      'productionCancel',
      'productionIssueMaterial',
      'productionViewBom',
      'productionEditBom'
    ]
  }
]

const permLabels = {
  canApproveQuote: '审批报价',
  canApproveLargeQuote: '审批大额报价',
  canDeleteQuote: '删除报价',
  canEditOthersQuote: '编辑他人报价',
  canCreateQuote: '创建报价',
  canCreateContract: '创建合同',
  canEditContract: '编辑合同',
  canSignContract: '签署合同',
  canDeleteContract: '删除合同',
  canArchiveContract: '归档合同',
  canApproveContract: '审批合同',
  inboundCreate: '创建入库',
  inboundEdit: '编辑入库',
  inboundDelete: '删除入库',
  inboundConfirm: '确认入库',
  inboundInspect: '检验入库',
  inboundExport: '导出入库',
  inboundViewCost: '查看入库成本',
  inboundPrint: '打印入库',
  inboundImport: '导入入库',
  outboundCreate: '创建出库',
  outboundUpdate: '更新出库',
  outboundDelete: '删除出库',
  outboundApprove: '审批出库',
  outboundConfirm: '确认出库',
  outboundCancel: '取消出库',
  outboundReverse: '冲销出库',
  outboundExport: '导出出库',
  outboundPrint: '打印出库',
  warehouseCreate: '新增库位',
  warehouseUpdate: '编辑库位',
  warehouseDelete: '删除库位',
  warehouseExport: '导出库位',
  statementCreate: '创建对账',
  statementRead: '查看对账',
  statementUpdate: '更新对账',
  statementDelete: '删除对账',
  statementConfirm: '确认对账',
  statementVoid: '作废对账',
  statementPay: '对账付款',
  statementExport: '导出对账',
  statementPrint: '打印对账',
  deliveryCreate: '创建送货',
  deliveryEdit: '编辑送货',
  deliveryDelete: '删除送货',
  deliveryViewDetail: '查看送货详情',
  deliveryChangeStatus: '变更送货状态',
  deliveryExport: '导出送货',
  deliveryImport: '导入送货',
  deliveryPrint: '打印送货',
  costView: '查看成本',
  costExport: '导出成本',
  costEdit: '编辑成本',
  costDelete: '删除成本',
  costViewStandard: '查看标准成本',
  costEditStandard: '编辑标准成本',
  purchaseCreate: '创建采购',
  purchaseEdit: '编辑采购',
  purchaseDelete: '删除采购',
  purchaseApprove: '审批采购',
  purchaseOrder: '采购下单',
  purchaseReceive: '采购收货',
  purchaseInspect: '采购质检',
  purchaseComplete: '采购完成',
  purchaseCancel: '取消采购',
  purchaseExport: '导出采购',
  purchasePrint: '打印采购',
  supplierCreate: '新增供应商',
  supplierEdit: '编辑供应商',
  supplierDelete: '删除供应商',
  supplierView: '查看供应商',
  supplierEvaluate: '评估供应商',
  supplierBlacklist: '供应商黑名单',
  supplierExport: '导出供应商',
  receivableView: '查看应收',
  receivableCreate: '新增应收',
  receivableEdit: '编辑应收',
  receivableDelete: '删除应收',
  receiptCreate: '创建收款',
  receivableExport: '导出应收',
  receivableAging: '账龄分析',
  payableView: '查看应付',
  payableCreate: '新增应付',
  payableEdit: '编辑应付',
  payableDelete: '删除应付',
  paymentCreate: '创建付款',
  payableExport: '导出应付',
  payableAging: '账龄分析',
  workflowView: '查看工作流',
  workflowApprove: '审批工作流',
  workflowDelegate: '委托审批',
  workflowAddApprover: '加签',
  workflowCancel: '取消工作流',
  workflowDesign: '设计工作流',
  stocktakingCreate: '创建盘点',
  stocktakingExecute: '执行盘点',
  stocktakingReview: '审批盘点',
  stocktakingAdjust: '盘点调整',
  stocktakingExport: '导出盘点',
  transferCreate: '创建调拨',
  transferEdit: '编辑调拨',
  transferDelete: '删除调拨',
  transferApprove: '审批调拨',
  transferShip: '调拨发货',
  transferReceive: '调拨收货',
  transferExport: '导出调拨',
  transferPrint: '打印调拨',
  productionCreate: '创建工单',
  productionEdit: '编辑工单',
  productionRelease: '下达工单',
  productionStart: '开始生产',
  productionQualityCheck: '生产质检',
  productionComplete: '完成生产',
  productionCancel: '取消工单',
  productionIssueMaterial: '领料',
  productionViewBom: '查看BOM',
  productionEditBom: '编辑BOM'
}

// 权限分类：查看类、创建类、审批类、删除类、导出类
const permCategories = {
  view: [
    'statementRead',
    'deliveryViewDetail',
    'costView',
    'costViewStandard',
    'inboundViewCost',
    'receivableView',
    'payableView',
    'workflowView',
    'productionViewBom',
    'supplierView'
  ],
  create: [
    'canCreateQuote',
    'canCreateContract',
    'inboundCreate',
    'outboundCreate',
    'warehouseCreate',
    'statementCreate',
    'deliveryCreate',
    'purchaseCreate',
    'supplierCreate',
    'receivableCreate',
    'payableCreate',
    'receiptCreate',
    'paymentCreate',
    'stocktakingCreate',
    'transferCreate',
    'productionCreate'
  ],
  approve: [
    'canApproveQuote',
    'canApproveLargeQuote',
    'canApproveContract',
    'outboundApprove',
    'outboundConfirm',
    'statementConfirm',
    'deliveryChangeStatus',
    'inboundConfirm',
    'canSignContract',
    'purchaseApprove',
    'workflowApprove',
    'transferApprove',
    'stocktakingReview'
  ],
  delete: [
    'canDeleteQuote',
    'canDeleteContract',
    'inboundDelete',
    'outboundDelete',
    'warehouseDelete',
    'statementDelete',
    'deliveryDelete',
    'costDelete',
    'purchaseDelete',
    'supplierDelete',
    'receivableDelete',
    'payableDelete',
    'transferDelete'
  ],
  export: [
    'inboundExport',
    'outboundExport',
    'warehouseExport',
    'statementExport',
    'deliveryExport',
    'costExport',
    'purchaseExport',
    'supplierExport',
    'receivableExport',
    'payableExport',
    'stocktakingExport',
    'transferExport'
  ],
  print: ['inboundPrint', 'outboundPrint', 'statementPrint', 'deliveryPrint', 'purchasePrint', 'transferPrint'],
  edit: [
    'canEditOthersQuote',
    'canEditContract',
    'inboundEdit',
    'outboundUpdate',
    'warehouseUpdate',
    'statementUpdate',
    'deliveryEdit',
    'costEdit',
    'costEditStandard',
    'canArchiveContract',
    'purchaseEdit',
    'supplierEdit',
    'receivableEdit',
    'payableEdit',
    'transferEdit',
    'productionEdit',
    'productionEditBom'
  ],
  import: ['inboundImport', 'deliveryImport'],
  special: [
    'inboundInspect',
    'outboundCancel',
    'outboundReverse',
    'statementVoid',
    'statementPay',
    'purchaseOrder',
    'purchaseReceive',
    'purchaseInspect',
    'purchaseComplete',
    'purchaseCancel',
    'supplierEvaluate',
    'supplierBlacklist',
    'workflowDelegate',
    'workflowAddApprover',
    'workflowCancel',
    'workflowDesign',
    'stocktakingExecute',
    'stocktakingAdjust',
    'transferShip',
    'transferReceive',
    'productionRelease',
    'productionStart',
    'productionQualityCheck',
    'productionComplete',
    'productionCancel',
    'productionIssueMaterial',
    'receivableAging',
    'payableAging'
  ]
}

export const usePermissionStore = defineStore('permission', () => {
  const roles = ref(load(ROLES_KEY, [...defaultRoles]))
  const matrix = ref(load(STORAGE_KEY, {}))
  const lastSaved = ref('')
  const changeCount = ref(0)

  const totalPerms = computed(() => {
    let count = 0
    defaultModules.forEach((m) => {
      count += m.perms.length
    })
    return count * roles.value.length
  })

  const roleCount = computed(() => roles.value.length)

  // 获取某角色某模块某权限的值
  function getPerm(role, moduleKey, perm) {
    /* 管理员和总经理拥有所有权限，不受权限矩阵数据影响 */
    if (['管理员', '总经理'].includes(role)) {
      return true
    }
    const key = `${role}.${moduleKey}.${perm}`
    return matrix.value[key] || false
  }

  // 设置某角色某模块某权限的值
  function setPerm(role, moduleKey, perm, value) {
    const key = `${role}.${moduleKey}.${perm}`
    matrix.value[key] = value
    changeCount.value++
  }

  // 保存权限配置
  function savePermissions() {
    persist(STORAGE_KEY, matrix.value)
    persist(ROLES_KEY, roles.value)
    lastSaved.value = new Date().toISOString().slice(0, 19).replace('T', ' ')
    changeCount.value = 0
  }

  // 重置权限配置（清空矩阵，恢复默认）
  function resetPermissions() {
    matrix.value = {}
    changeCount.value = 0
    applyTemplate('standard')
    savePermissions()
  }

  // 新增角色
  function addRole(roleName, baseRole) {
    if (roles.value.includes(roleName)) return false
    roles.value.push(roleName)
    // 如果指定了基础角色，复制其权限
    if (baseRole && roles.value.includes(baseRole)) {
      defaultModules.forEach((mod) => {
        mod.perms.forEach((perm) => {
          const srcKey = `${baseRole}.${mod.key}.${perm}`
          const dstKey = `${roleName}.${mod.key}.${perm}`
          matrix.value[dstKey] = matrix.value[srcKey] || false
        })
      })
    }
    persist(ROLES_KEY, roles.value)
    persist(STORAGE_KEY, matrix.value)
    changeCount.value++
    return true
  }

  // 删除角色（管理员和总经理不可删除）
  function removeRole(roleName) {
    if (['管理员', '总经理'].includes(roleName)) return false
    const idx = roles.value.indexOf(roleName)
    if (idx === -1) return false
    roles.value.splice(idx, 1)
    // 清理该角色的所有权限记录
    Object.keys(matrix.value).forEach((key) => {
      if (key.startsWith(roleName + '.')) delete matrix.value[key]
    })
    persist(ROLES_KEY, roles.value)
    persist(STORAGE_KEY, matrix.value)
    changeCount.value++
    return true
  }

  // 应用权限模板
  function applyTemplate(template) {
    matrix.value = {}
    const viewPerms = permCategories.view
    const approvePerms = permCategories.approve
    const deletePerms = permCategories.delete
    const createPerms = permCategories.create
    const editPerms = permCategories.edit
    const exportPerms = permCategories.export
    const printPerms = permCategories.print

    if (template === 'strict') {
      // 严格模式：管理员全权限，总经理仅审批+查看，其他仅查看
      roles.value.forEach((role) => {
        defaultModules.forEach((mod) => {
          mod.perms.forEach((perm) => {
            const key = `${role}.${mod.key}.${perm}`
            if (role === '管理员') {
              matrix.value[key] = true
            } else if (role === '总经理') {
              matrix.value[key] = viewPerms.includes(perm) || approvePerms.includes(perm)
            } else if (['销售主管', '仓库主管', '财务'].includes(role)) {
              matrix.value[key] = viewPerms.includes(perm) || createPerms.includes(perm)
            } else {
              matrix.value[key] = viewPerms.includes(perm)
            }
          })
        })
      })
    } else if (template === 'standard') {
      // 标准模式：管理员/总经理全权限，主管级审批+创建+查看+编辑，普通员工创建+查看
      roles.value.forEach((role) => {
        defaultModules.forEach((mod) => {
          mod.perms.forEach((perm) => {
            const key = `${role}.${mod.key}.${perm}`
            if (['管理员', '总经理'].includes(role)) {
              matrix.value[key] = true
            } else if (['销售主管', '仓库主管', '财务'].includes(role)) {
              matrix.value[key] =
                !deletePerms.includes(perm) &&
                (viewPerms.includes(perm) ||
                  createPerms.includes(perm) ||
                  approvePerms.includes(perm) ||
                  editPerms.includes(perm) ||
                  exportPerms.includes(perm) ||
                  printPerms.includes(perm))
            } else if (['销售员', '仓管员'].includes(role)) {
              matrix.value[key] =
                viewPerms.includes(perm) ||
                createPerms.includes(perm) ||
                editPerms.includes(perm) ||
                printPerms.includes(perm)
            } else {
              matrix.value[key] = viewPerms.includes(perm) || printPerms.includes(perm)
            }
          })
        })
      })
    } else if (template === 'loose') {
      // 宽松模式：全部角色全部权限
      roles.value.forEach((role) => {
        defaultModules.forEach((mod) => {
          mod.perms.forEach((perm) => {
            matrix.value[`${role}.${mod.key}.${perm}`] = true
          })
        })
      })
    }
    changeCount.value++
  }

  // 批量设置权限
  function batchSetPermissions(targetRoles, permKeys, value) {
    targetRoles.forEach((role) => {
      defaultModules.forEach((mod) => {
        permKeys.forEach((perm) => {
          if (mod.perms.includes(perm)) {
            matrix.value[`${role}.${mod.key}.${perm}`] = value
          }
        })
      })
    })
    changeCount.value++
  }

  // 导出权限配置
  function exportPermissions() {
    return JSON.stringify(
      {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        roles: roles.value,
        matrix: matrix.value,
        modules: defaultModules.map((m) => ({ key: m.key, label: m.label, perms: m.perms })),
        permLabels
      },
      null,
      2
    )
  }

  // 导入权限配置
  function importPermissions(jsonStr) {
    try {
      const data = JSON.parse(jsonStr)
      if (!data.roles || !Array.isArray(data.roles)) return false
      if (!data.matrix || typeof data.matrix !== 'object') return false
      roles.value = data.roles
      matrix.value = data.matrix
      persist(ROLES_KEY, roles.value)
      persist(STORAGE_KEY, matrix.value)
      changeCount.value = 0
      return true
    } catch (e) {
      return false
    }
  }

  // 获取角色的权限统计
  function getRolePermStats(role) {
    let total = 0,
      enabled = 0
    defaultModules.forEach((mod) => {
      mod.perms.forEach((perm) => {
        total++
        if (getPerm(role, mod.key, perm)) enabled++
      })
    })
    return { total, enabled, percentage: total > 0 ? Math.round((enabled / total) * 100) : 0 }
  }

  // 获取模块的权限统计
  function getModulePermStats(moduleKey) {
    const mod = defaultModules.find((m) => m.key === moduleKey)
    if (!mod) return { total: 0, enabled: 0 }
    const total = mod.perms.length * roles.value.length
    let enabled = 0
    roles.value.forEach((role) => {
      mod.perms.forEach((perm) => {
        if (getPerm(role, moduleKey, perm)) enabled++
      })
    })
    return { total, enabled, percentage: total > 0 ? Math.round((enabled / total) * 100) : 0 }
  }

  function replaceData(newData) {
    if (newData.roles) {
      roles.value = newData.roles
      persist(ROLES_KEY, roles.value)
    }
    if (newData.matrix) {
      matrix.value = newData.matrix
      persist(STORAGE_KEY, matrix.value)
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    applyTemplate('standard')
    savePermissions()
    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    roles,
    matrix,
    lastSaved,
    changeCount,
    defaultModules,
    permLabels,
    permCategories,
    totalPerms,
    roleCount,
    getPerm,
    setPerm,
    savePermissions,
    resetPermissions,
    addRole,
    removeRole,
    applyTemplate,
    batchSetPermissions,
    exportPermissions,
    importPermissions,
    replaceData,
    initSeedData,
    getRolePermStats,
    getModulePermStats
  }
})
