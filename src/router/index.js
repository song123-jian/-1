import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { usePermissionStore } from '@/stores/permission'
import { RoleGroups } from '@/constants/roles'

const ADMIN_ONLY_ROUTES = ['Approvals', 'SalesPermission', 'SystemManagement', 'SettingsParams', 'DatabaseConnection']
const FINANCE_ROUTES = ['Collections', 'CostAnalysis', 'MonthlyStats', 'ReceivableManagement', 'PayableManagement']
const WAREHOUSE_ROUTES = ['WarehouseLocations', 'StocktakingManagement', 'TransferManagement']

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
  { path: '/', redirect: '/dashboard' },
  {
    path: '/role-select',
    name: 'RoleSelect',
    component: () => import('@/views/RoleSelect.vue'),
    meta: { title: 'Role Select' }
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
    component: () => import('@/modules/customer/views/Customers.vue'),
    meta: { title: '客户管理', icon: 'building' }
  },
  {
    path: '/customer-detail',
    name: 'CustomerDetail',
    component: () => import('@/modules/customer/views/CustomerDetail.vue'),
    meta: { title: '客户详情', icon: 'eye' }
  },
  {
    path: '/tag-category',
    name: 'TagCategory',
    component: () => import('@/modules/customer/views/TagCategory.vue'),
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
    component: () => import('@/modules/sales/views/Quotations.vue'),
    meta: { title: '报价管理', icon: 'list' }
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('@/modules/sales/views/Contracts.vue'),
    meta: { title: '合同管理', icon: 'file' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/modules/sales/views/Transactions.vue'),
    meta: { title: '交易管理', icon: 'dollar' }
  },
  {
    path: '/inbound',
    name: 'InboundManagement',
    component: () => import('@/modules/warehouse/views/InboundManagement.vue'),
    meta: { title: '入库管理', icon: 'upload' }
  },
  {
    path: '/inventory',
    name: 'InventoryManagement',
    component: () => import('@/modules/warehouse/views/InventoryManagement.vue'),
    meta: { title: '库存管理', icon: 'package' }
  },
  {
    path: '/outbound',
    name: 'OutboundManagement',
    component: () => import('@/modules/warehouse/views/OutboundManagement.vue'),
    meta: { title: '出库管理', icon: 'download' }
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/modules/finance/views/Collections.vue'),
    meta: { title: '回款管理', icon: 'dollar' }
  },
  {
    path: '/receivables',
    name: 'ReceivableManagement',
    component: () => import('@/modules/finance/views/ReceivableManagement.vue'),
    meta: { title: '应收管理', icon: 'trendUp' }
  },
  {
    path: '/payables',
    name: 'PayableManagement',
    component: () => import('@/modules/finance/views/PayableManagement.vue'),
    meta: { title: '应付管理', icon: 'arrowDown' }
  },
  {
    path: '/statements',
    name: 'Statements',
    component: () => import('@/modules/finance/views/Statements.vue'),
    meta: { title: '对账管理', icon: 'file' }
  },
  {
    path: '/deliveries',
    name: 'Deliveries',
    component: () => import('@/views/Deliveries.vue'),
    meta: { title: '送货管理', icon: 'truck' }
  },
  {
    path: '/production',
    name: 'ProductionManagement',
    component: () => import('@/modules/production/views/ProductionManagement.vue'),
    meta: { title: '生产管理', icon: 'layers' }
  },
  {
    path: '/suppliers',
    name: 'SupplierManagement',
    component: () => import('@/modules/purchase/views/SupplierManagement.vue'),
    meta: { title: '供应商管理', icon: 'building' }
  },
  {
    path: '/purchase',
    name: 'PurchaseManagement',
    component: () => import('@/modules/purchase/views/PurchaseManagement.vue'),
    meta: { title: '采购管理', icon: 'clipboard' }
  },
  {
    path: '/warehouse-locations',
    name: 'WarehouseLocations',
    component: () => import('@/modules/warehouse/views/WarehouseLocations.vue'),
    meta: { title: '库位管理', icon: 'mapPin' }
  },
  {
    path: '/stocktaking',
    name: 'StocktakingManagement',
    component: () => import('@/modules/warehouse/views/StocktakingManagement.vue'),
    meta: { title: '盘点管理', icon: 'clipboardCheck' }
  },
  {
    path: '/transfer',
    name: 'TransferManagement',
    component: () => import('@/modules/warehouse/views/TransferManagement.vue'),
    meta: { title: '调拨管理', icon: 'shuffle' }
  },
  {
    path: '/cost-analysis',
    name: 'CostAnalysis',
    component: () => import('@/modules/finance/views/CostAnalysis.vue'),
    meta: { title: '成本核算', icon: 'calculator' }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/modules/report/views/Reports.vue'),
    meta: { title: '报表中心', icon: 'trendUp' }
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/modules/system/views/Approvals.vue'),
    meta: { title: '审批配置', icon: 'check' }
  },
  {
    path: '/workflow',
    name: 'WorkflowDesign',
    component: () => import('@/modules/system/views/WorkflowDesign.vue'),
    meta: { title: '工作流设计', icon: 'layers' }
  },
  {
    path: '/archives',
    name: 'Archives',
    component: () => import('@/modules/system/views/Archives.vue'),
    meta: { title: '档案管理', icon: 'archive' }
  },
  {
    path: '/doc-settings',
    name: 'DocSettings',
    component: () => import('@/modules/system/views/DocSettings.vue'),
    meta: { title: '资质设置', icon: 'shield' }
  },
  {
    path: '/sales-permission',
    name: 'SalesPermission',
    component: () => import('@/modules/system/views/SalesPermission.vue'),
    alias: '/customer-permissions',
    meta: { title: '销售权限配置', icon: 'shield' }
  },
  {
    path: '/settings/company',
    name: 'SettingsCompany',
    component: () => import('@/modules/system/views/SettingsCompany.vue'),
    meta: { title: '公司信息', icon: 'building' }
  },
  {
    path: '/settings/params',
    name: 'SettingsParams',
    component: () => import('@/modules/system/views/SettingsParams.vue'),
    meta: { title: '系统参数', icon: 'setting' }
  },
  {
    path: '/system',
    name: 'SystemManagement',
    component: () => import('@/modules/system/views/SystemManagement.vue'),
    meta: { title: '系统管理', icon: 'setting' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/modules/system/views/Logs.vue'),
    meta: { title: '操作日志', icon: 'log' }
  },
  {
    path: '/monthly-stats',
    name: 'MonthlyStats',
    component: () => import('@/modules/report/views/MonthlyStats.vue'),
    meta: { title: '月度统计', icon: 'database' }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/modules/system/views/Favorites.vue'),
    meta: { title: '收藏导航', icon: 'star' }
  },
  {
    path: '/database-connection',
    name: 'DatabaseConnection',
    component: () => import('@/modules/system/views/DatabaseConnection.vue'),
    meta: { title: '数据库连接', icon: 'link' }
  },
  { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const sessionStore = useSessionStore()

  if (to.name === 'RoleSelect') {
    if (sessionStore.isLoggedIn) {
      return { name: 'Dashboard' }
    }
    return true
  }

  if (!sessionStore.isLoggedIn) {
    return { name: 'RoleSelect', query: { redirect: to.fullPath } }
  }
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '冠久ERP'} - 冠久ERP`

  const sessionStore = useSessionStore()
  sessionStore.updateActivity()

  const role = sessionStore.currentRole
  const permStore = usePermissionStore()

  if (ADMIN_ONLY_ROUTES.includes(to.name) && !RoleGroups.ADMIN_AND_GM.includes(role)) {
    return { name: 'Dashboard' }
  }

  if (FINANCE_ROUTES.includes(to.name) && !RoleGroups.FINANCE_ACCESS.includes(role)) {
    if (to.name === 'MonthlyStats' && role === '查看者') return true
    return { name: 'Dashboard' }
  }

  if (WAREHOUSE_ROUTES.includes(to.name) && !RoleGroups.WAREHOUSE_ACCESS.includes(role)) {
    return { name: 'Dashboard' }
  }

  const routePerm = ROUTE_PERM_MAP[to.name]
  if (routePerm) {
    if (RoleGroups.ADMIN_AND_GM.includes(role)) {
      return true
    }
    const hasPerm = permStore.getPerm(role, routePerm.module, routePerm.action)
    if (!hasPerm) {
      return { name: 'Dashboard' }
    }
  }
})

export default router
