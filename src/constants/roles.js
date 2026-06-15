export const Roles = {
  ADMIN: '管理员',
  GM: '总经理',
  SALES_MANAGER: '销售主管',
  SALES: '销售员',
  WAREHOUSE_MANAGER: '仓库主管',
  WAREHOUSE: '仓管员',
  FINANCE: '财务',
  VIEWER: '查看者'
}

export const RoleGroups = {
  ADMIN_AND_GM: [Roles.ADMIN, Roles.GM],
  FINANCE_ACCESS: [Roles.ADMIN, Roles.GM, Roles.FINANCE],
  WAREHOUSE_ACCESS: [Roles.ADMIN, Roles.GM, Roles.WAREHOUSE_MANAGER, Roles.WAREHOUSE]
}

/* 角色分组（用于身份选择页面展示） */
export const RoleCategories = [
  {
    label: '管理',
    roles: [
      { name: Roles.ADMIN, icon: 'users', desc: '系统配置与全部权限' },
      { name: Roles.GM, icon: 'building', desc: '全局数据查看与审批' }
    ]
  },
  {
    label: '销售',
    roles: [
      { name: Roles.SALES_MANAGER, icon: 'table', desc: '销售团队管理与审批' },
      { name: Roles.SALES, icon: 'dollar', desc: '客户与报价订单管理' }
    ]
  },
  {
    label: '仓储',
    roles: [
      { name: Roles.WAREHOUSE_MANAGER, icon: 'package', desc: '仓库管理与库存审批' },
      { name: Roles.WAREHOUSE, icon: 'tool', desc: '出入库与库存操作' }
    ]
  },
  {
    label: '财务',
    roles: [
      { name: Roles.FINANCE, icon: 'calculator', desc: '回款对账与财务报表' },
      { name: Roles.VIEWER, icon: 'eye', desc: '只读查看所有数据' }
    ]
  }
]
