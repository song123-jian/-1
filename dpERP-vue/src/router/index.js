import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { usePermissionStore } from '@/stores/permission'

/* 需要管理员权限的路由 */
const ADMIN_ONLY_ROUTES = ['Approvals', 'SalesPermission', 'SystemManagement', 'SettingsParams', 'DatabaseConnection']

/* 需要财务权限的路由 */
const FINANCE_ROUTES = ['Collections', 'CostAnalysis', 'MonthlyStats', 'ReceivableManagement', 'PayableManagement']

/* 需要仓储权限的路由 */
const WAREHOUSE_ROUTES = ['WarehouseLocations', 'StocktakingManagement', 'TransferManagement']

/* 路由权限映射：路由名 → 权限模块和操作 */
const ROUTE_PERM_MAP = {
  Quotations: { module: 'quote_contract', action: 'canCreateQuote' },
  Contracts: { module: 'quote_contract', action: 'canCreateContract' },
  InboundManagement: { module: 'inbound', action: 'inboundCreate' },
  InventoryManagement: { module: 'warehouse', action: 'warehouseCreate' },
  OutboundManagement: { module: 'outbound', action: 'outboundCreate' },
  WarehouseLocations: { module: 'warehouse', action: 'warehouseCreate' },
  StocktakingManagement: { module: 'stocktaking', action: 'stocktakingCreate' },
  TransferManagement: { module: 'transfer', action: 'transferCreate' },
  Deliveries: { module: 'delivery', action: 'deliveryCreate' },
  Collections: { module: 'statement', action: 'statementCreate' },
  ReceivableManagement: { module: 'receivable', action: 'receivableView' },
  PayableManagement: { module: 'payable', action: 'payableView' },
  CostAnalysis: { module: 'cost', action: 'costView' },
  PurchaseManagement: { module: 'purchase', action: 'purchaseCreate' },
  SupplierManagement: { module: 'supplier', action: 'supplierCreate' },
  ProductionManagement: { module: 'production', action: 'productionCreate' }
}

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/role-select',
    name: 'RoleSelect',
    component: () => import('@/views/RoleSelect.vue'),
    meta: { title: '角色选择', icon: 'users' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', icon: 'database' }
  },
  {
    path: '/project-tracking',
    name: 'ProjectTracking',
    component: () => import('@/views/ProjectTracking.vue'),
    meta: { title: '项目追踪', icon: 'target' }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/Customers.vue'),
    meta: { title: '客户管理', icon: 'building' }
  },
  {
    path: '/customer-detail',
    name: 'CustomerDetail',
    component: () => import('@/views/CustomerDetail.vue'),
    meta: { title: '客户详情', icon: 'eye' }
  },
  {
    path: '/tag-category',
    name: 'TagCategory',
    component: () => import('@/views/TagCategory.vue'),
    meta: { title: '标签分类', icon: 'tag' }
  },
  {
    path: '/todos',
    name: 'Todos',
    component: () => import('@/views/Todos.vue'),
    meta: { title: '待办事项', icon: 'check' }
  },
  {
    path: '/quotations',
    name: 'Quotations',
    component: () => import('@/views/Quotations.vue'),
    meta: { title: '报价管理', icon: 'list' }
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('@/views/Contracts.vue'),
    meta: { title: '合同管理', icon: 'file' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/views/Transactions.vue'),
    meta: { title: '交易管理', icon: 'dollar' }
  },
  {
    path: '/inbound',
    name: 'InboundManagement',
    component: () => import('@/views/InboundManagement.vue'),
    meta: { title: '入库管理', icon: 'upload' }
  },
  {
    path: '/inventory',
    name: 'InventoryManagement',
    component: () => import('@/views/InventoryManagement.vue'),
    meta: { title: '库存管理', icon: 'package' }
  },
  {
    path: '/outbound',
    name: 'OutboundManagement',
    component: () => import('@/views/OutboundManagement.vue'),
    meta: { title: '出库管理', icon: 'download' }
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/views/Collections.vue'),
    meta: { title: '回款管理', icon: 'dollar' }
  },
  {
    path: '/receivables',
    name: 'ReceivableManagement',
    component: () => import('@/views/ReceivableManagement.vue'),
    meta: { title: '应收管理', icon: 'trendUp' }
  },
  {
    path: '/payables',
    name: 'PayableManagement',
    component: () => import('@/views/PayableManagement.vue'),
    meta: { title: '应付管理', icon: 'arrowDown' }
  },
  {
    path: '/statements',
    name: 'Statements',
    component: () => import('@/views/Statements.vue'),
    meta: { title: '对账管理', icon: 'file' }
  },
  {
    path: '/deliveries',
    name: 'Deliveries',
    component: () => import('@/views/Deliveries.vue'),
    meta: { title: '送货管理', icon: 'truck' }
  },
  {
    path: '/ecommerce',
    name: 'EcommerceIntegration',
    component: () => import('@/views/EcommerceIntegration.vue'),
    meta: { title: '电商对接', icon: 'globe' }
  },
  {
    path: '/production',
    name: 'ProductionManagement',
    component: () => import('@/views/ProductionManagement.vue'),
    meta: { title: '生产管理', icon: 'layers' }
  },
  {
    path: '/suppliers',
    name: 'SupplierManagement',
    component: () => import('@/views/SupplierManagement.vue'),
    meta: { title: '供应商管理', icon: 'building' }
  },
  {
    path: '/purchase',
    name: 'PurchaseManagement',
    component: () => import('@/views/PurchaseManagement.vue'),
    meta: { title: '采购管理', icon: 'clipboard' }
  },
  {
    path: '/warehouse-locations',
    name: 'WarehouseLocations',
    component: () => import('@/views/WarehouseLocations.vue'),
    meta: { title: '仓位管理', icon: 'mapPin' }
  },
  {
    path: '/stocktaking',
    name: 'StocktakingManagement',
    component: () => import('@/views/StocktakingManagement.vue'),
    meta: { title: '盘点管理', icon: 'clipboardCheck' }
  },
  {
    path: '/transfer',
    name: 'TransferManagement',
    component: () => import('@/views/TransferManagement.vue'),
    meta: { title: '调拨管理', icon: 'shuffle' }
  },
  {
    path: '/cost-analysis',
    name: 'CostAnalysis',
    component: () => import('@/views/CostAnalysis.vue'),
    meta: { title: '成本核算', icon: 'calculator' }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue'),
    meta: { title: '报表中心', icon: 'trendUp' }
  },
  {
    path: '/data-screen',
    name: 'DataScreen',
    component: () => import('@/views/DataScreen.vue'),
    meta: { title: '数据大屏', icon: 'database' }
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/views/Approvals.vue'),
    meta: { title: '审批配置', icon: 'check' }
  },
  {
    path: '/workflow',
    name: 'WorkflowDesign',
    component: () => import('@/views/WorkflowDesign.vue'),
    meta: { title: '工作流管理', icon: 'layers' }
  },
  {
    path: '/archives',
    name: 'Archives',
    component: () => import('@/views/Archives.vue'),
    meta: { title: '档案管理', icon: 'archive' }
  },
  {
    path: '/doc-settings',
    name: 'DocSettings',
    component: () => import('@/views/DocSettings.vue'),
    meta: { title: '资质设置', icon: 'shield' }
  },
  {
    path: '/sales-permission',
    name: 'SalesPermission',
    component: () => import('@/views/SalesPermission.vue'),
    alias: '/customer-permissions',
    meta: { title: '销售权限配置', icon: 'shield' }
  },
  {
    path: '/mobile-design',
    name: 'MobileDesign',
    component: () => import('@/views/MobileDesign.vue'),
    meta: { title: '移动端设计', icon: 'mobile' }
  },
  {
    path: '/settings/company',
    name: 'SettingsCompany',
    component: () => import('@/views/SettingsCompany.vue'),
    meta: { title: '公司信息', icon: 'building' }
  },
  {
    path: '/settings/params',
    name: 'SettingsParams',
    component: () => import('@/views/SettingsParams.vue'),
    meta: { title: '系统参数', icon: 'setting' }
  },
  {
    path: '/system',
    name: 'SystemManagement',
    component: () => import('@/views/SystemManagement.vue'),
    meta: { title: '系统管理', icon: 'setting' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/Logs.vue'),
    meta: { title: '操作日志', icon: 'log' }
  },
  {
    path: '/monthly-stats',
    name: 'MonthlyStats',
    component: () => import('@/views/MonthlyStats.vue'),
    meta: { title: '月度统计', icon: 'database' }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
    meta: { title: '收藏导航', icon: 'star' }
  },
  {
    path: '/database-connection',
    name: 'DatabaseConnection',
    component: () => import('@/views/DatabaseConnection.vue'),
    meta: { title: '数据库连接', icon: 'link' }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from) => {
  document.title = `${to.meta.title || '冠久ERP'} - 冠久ERP`

  /* 角色选择页始终可访问 */
  if (to.name === 'RoleSelect') return true

  /* 检查会话：未选择角色则跳转到角色选择页 */
  const sessionStore = useSessionStore()
  if (!sessionStore.isLoggedIn) {
    return { name: 'RoleSelect' }
  }

  /* 更新活跃时间 */
  sessionStore.updateActivity()

  /* 路由级权限检查 */
  const role = sessionStore.currentRole
  const permStore = usePermissionStore()

  /* 管理员专属路由 */
  if (ADMIN_ONLY_ROUTES.includes(to.name) && !['管理员', '总经理'].includes(role)) {
    return { name: 'Dashboard' }
  }

  /* 财务相关路由：财务/管理员/总经理可访问 */
  if (FINANCE_ROUTES.includes(to.name) && !['管理员', '总经理', '财务'].includes(role)) {
    /* 查看者也可以查看月度统计 */
    if (to.name === 'MonthlyStats' && role === '查看者') return true
    return { name: 'Dashboard' }
  }

  /* 仓位管理：仓储角色/管理员/总经理可访问 */
  if (WAREHOUSE_ROUTES.includes(to.name) && !['管理员', '总经理', '仓库主管', '仓管员'].includes(role)) {
    return { name: 'Dashboard' }
  }

  /* 基于权限矩阵的路由权限检查 */
  const routePerm = ROUTE_PERM_MAP[to.name]
  if (routePerm) {
    const hasPerm = permStore.getPerm(role, routePerm.module, routePerm.action)
    if (!hasPerm) {
      return { name: 'Dashboard' }
    }
  }
})

export default router
