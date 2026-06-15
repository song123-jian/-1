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
