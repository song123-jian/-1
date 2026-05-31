import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', icon: '📊' }
  },
  {
    path: '/project-tracking',
    name: 'ProjectTracking',
    component: () => import('@/views/ProjectTracking.vue'),
    meta: { title: '项目追踪', icon: '🎯' }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/Customers.vue'),
    meta: { title: '客户管理', icon: '🏢' }
  },
  {
    path: '/tag-category',
    name: 'TagCategory',
    component: () => import('@/views/TagCategory.vue'),
    meta: { title: '标签分类', icon: '🏷️' }
  },
  {
    path: '/todos',
    name: 'Todos',
    component: () => import('@/views/Todos.vue'),
    meta: { title: '待办事项', icon: '📋' }
  },
  {
    path: '/quotations',
    name: 'Quotations',
    component: () => import('@/views/Quotations.vue'),
    meta: { title: '报价管理', icon: '📝' }
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('@/views/Contracts.vue'),
    meta: { title: '合同管理', icon: '📄' }
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/views/Transactions.vue'),
    meta: { title: '交易管理', icon: '💱' }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    meta: { title: '库存查询系统', icon: '📦' }
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/views/Collections.vue'),
    meta: { title: '回款管理', icon: '💰' }
  },
  {
    path: '/statements',
    name: 'Statements',
    component: () => import('@/views/Statements.vue'),
    meta: { title: '对账管理', icon: '📑' }
  },
  {
    path: '/deliveries',
    name: 'Deliveries',
    component: () => import('@/views/Deliveries.vue'),
    meta: { title: '送货管理', icon: '🚚' }
  },
  {
    path: '/cost-analysis',
    name: 'CostAnalysis',
    component: () => import('@/views/CostAnalysis.vue'),
    meta: { title: '成本核算', icon: '💹' }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue'),
    meta: { title: '报表中心', icon: '📈' }
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/views/Approvals.vue'),
    meta: { title: '审批配置', icon: '🔐' }
  },
  {
    path: '/archives',
    name: 'Archives',
    component: () => import('@/views/Archives.vue'),
    meta: { title: '档案管理', icon: '📁' }
  },
  {
    path: '/doc-settings',
    name: 'DocSettings',
    component: () => import('@/views/DocSettings.vue'),
    meta: { title: '资质设置', icon: '📋' }
  },
  {
    path: '/sales-permission',
    name: 'SalesPermission',
    component: () => import('@/views/SalesPermission.vue'),
    meta: { title: '销售权限配置', icon: '🔑' }
  },
  {
    path: '/mobile-design',
    name: 'MobileDesign',
    component: () => import('@/views/MobileDesign.vue'),
    meta: { title: '移动端设计', icon: '📱' }
  },
  {
    path: '/settings/company',
    name: 'SettingsCompany',
    component: () => import('@/views/SettingsCompany.vue'),
    meta: { title: '公司信息', icon: '🏢' }
  },
  {
    path: '/settings/params',
    name: 'SettingsParams',
    component: () => import('@/views/SettingsParams.vue'),
    meta: { title: '系统参数', icon: '⚙️' }
  },
  {
    path: '/system',
    name: 'SystemManagement',
    component: () => import('@/views/SystemManagement.vue'),
    meta: { title: '系统管理', icon: '🛠️' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/Logs.vue'),
    meta: { title: '操作日志', icon: '📜' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '冠久ERP'} - 冠久ERP`
})

export default router
