import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const PAGES_KEY = 'gj_erp_mobilePages'
const NAV_KEY = 'gj_erp_mobileNav'
const THEME_KEY = 'gj_erp_mobileTheme'
const INIT_KEY = 'gj_erp_mobileDesign_initialized'

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
    /* ignore */
  }
}
function genId(prefix) {
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

const pageTypeLabels = {
  dashboard: '仪表盘',
  list: '列表页',
  form: '表单页',
  detail: '详情页',
  chart: '图表页',
  custom: '自定义'
}

export const useMobileDesignStore = defineStore('mobileDesign', () => {
  const pages = ref(load(PAGES_KEY, []))
  const navItems = ref(load(NAV_KEY, []))
  const theme = ref(
    load(THEME_KEY, {
      primaryColor: '#4F46E5',
      fontSize: 14,
      borderRadius: 8,
      darkMode: false,
      fontFamily: 'system',
      compactMode: false
    })
  )

  const pageCount = computed(() => pages.value.length)
  const publishedCount = computed(() => pages.value.filter((p) => p.status === 'published').length)
  const draftCount = computed(() => pages.value.filter((p) => p.status === 'draft').length)
  const navCount = computed(() => navItems.value.length)

  function _persistPages() {
    persist(PAGES_KEY, pages.value)
  }
  function _persistNav() {
    persist(NAV_KEY, navItems.value)
  }
  function _persistTheme() {
    persist(THEME_KEY, theme.value)
  }

  function addPage(data) {
    const item = {
      id: genId('mp'),
      name: data.name || '未命名页面',
      type: data.type || 'custom',
      status: data.status || 'draft',
      layout: data.layout || 'single',
      components: data.components || [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      publishedAt: ''
    }
    pages.value.push(item)
    _persistPages()
    return item
  }

  function updatePage(id, updates) {
    const idx = pages.value.findIndex((p) => p.id === id)
    if (idx === -1) return null
    pages.value[idx] = { ...pages.value[idx], ...updates, updatedAt: new Date().toISOString().slice(0, 10) }
    _persistPages()
    return pages.value[idx]
  }

  function deletePage(id) {
    const idx = pages.value.findIndex((p) => p.id === id)
    if (idx === -1) return false
    pages.value.splice(idx, 1)
    _persistPages()
    return true
  }

  function publishPage(id) {
    return updatePage(id, { status: 'published', publishedAt: new Date().toISOString().slice(0, 10) })
  }

  function unpublishPage(id) {
    return updatePage(id, { status: 'draft' })
  }

  function addNavItem(data) {
    const item = {
      id: genId('nav'),
      label: data.label || '',
      icon: data.icon || '[文档]',
      pageId: data.pageId || '',
      order: data.order ?? navItems.value.length + 1,
      visible: data.visible !== false
    }
    navItems.value.push(item)
    _persistNav()
    return item
  }

  function updateNavItem(id, updates) {
    const idx = navItems.value.findIndex((n) => n.id === id)
    if (idx === -1) return null
    navItems.value[idx] = { ...navItems.value[idx], ...updates }
    _persistNav()
    return navItems.value[idx]
  }

  function deleteNavItem(id) {
    const idx = navItems.value.findIndex((n) => n.id === id)
    if (idx === -1) return false
    navItems.value.splice(idx, 1)
    _persistNav()
    return true
  }

  function reorderNav(newOrder) {
    navItems.value = newOrder
      .map((id, i) => {
        const item = navItems.value.find((n) => n.id === id)
        return item ? { ...item, order: i + 1 } : null
      })
      .filter(Boolean)
    _persistNav()
  }

  function saveTheme(newTheme) {
    theme.value = { ...theme.value, ...newTheme }
    _persistTheme()
  }

  function resetTheme() {
    theme.value = {
      primaryColor: '#4F46E5',
      fontSize: 14,
      borderRadius: 8,
      darkMode: false,
      fontFamily: 'system',
      compactMode: false
    }
    _persistTheme()
  }

  function replaceData(newData) {
    if (newData.pages) {
      pages.value = newData.pages
      _persistPages()
    }
    if (newData.navItems) {
      navItems.value = newData.navItems
      _persistNav()
    }
  }

  function initSeedData() {
    if (localStorage.getItem(INIT_KEY)) return
    pages.value = [
      {
        id: 'mp1',
        name: '销售首页',
        type: 'dashboard',
        status: 'published',
        layout: 'single',
        components: ['销售概览', '快捷操作', '待办事项'],
        createdAt: '2024-01-15',
        updatedAt: '2024-06-20',
        publishedAt: '2024-01-20'
      },
      {
        id: 'mp2',
        name: '产品列表',
        type: 'list',
        status: 'published',
        layout: 'single',
        components: ['搜索栏', '筛选器', '产品卡片列表'],
        createdAt: '2024-02-10',
        updatedAt: '2024-05-15',
        publishedAt: '2024-02-15'
      },
      {
        id: 'mp3',
        name: '订单详情',
        type: 'detail',
        status: 'published',
        layout: 'single',
        components: ['订单信息', '物流跟踪', '操作按钮'],
        createdAt: '2024-03-01',
        updatedAt: '2024-06-10',
        publishedAt: '2024-03-05'
      },
      {
        id: 'mp4',
        name: '报表中心',
        type: 'chart',
        status: 'draft',
        layout: 'grid',
        components: ['销售趋势图', '客户分布图', '库存统计'],
        createdAt: '2024-04-20',
        updatedAt: '2024-06-25',
        publishedAt: ''
      },
      {
        id: 'mp5',
        name: '审批表单',
        type: 'form',
        status: 'draft',
        layout: 'single',
        components: ['表单字段', '附件上传', '审批流程'],
        createdAt: '2024-05-10',
        updatedAt: '2024-06-30',
        publishedAt: ''
      }
    ]
    _persistPages()

    if (navItems.value.length === 0) {
      navItems.value = [
        { id: 'nav1', label: '首页', icon: '[首页]', pageId: 'mp1', order: 1, visible: true },
        { id: 'nav2', label: '产品', icon: '[库存]', pageId: 'mp2', order: 2, visible: true },
        { id: 'nav3', label: '订单', icon: '[列表]', pageId: 'mp3', order: 3, visible: true },
        { id: 'nav4', label: '报表', icon: '[统计]', pageId: 'mp4', order: 4, visible: true },
        { id: 'nav5', label: '审批', icon: '[确认]', pageId: 'mp5', order: 5, visible: true }
      ]
      _persistNav()
    }

    localStorage.setItem(INIT_KEY, '1')
  }

  return {
    pages,
    navItems,
    theme,
    pageTypeLabels,
    pageCount,
    publishedCount,
    draftCount,
    navCount,
    addPage,
    updatePage,
    deletePage,
    publishPage,
    unpublishPage,
    addNavItem,
    updateNavItem,
    deleteNavItem,
    reorderNav,
    saveTheme,
    resetTheme,
    replaceData,
    initSeedData
  }
})
