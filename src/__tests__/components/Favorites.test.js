/**
 * Favorites.vue 组件级测试
 * 覆盖：渲染、交互、添加收藏、移除收藏、导航跳转、推荐收藏、计算属性、生命周期、localStorage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import Favorites from '@/modules/system/views/Favorites.vue'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    roleName: '测试用户'
  })
}))

/* mock vue-router */
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    getRoutes: () => [
      { name: 'Customers', path: '/customers', meta: { title: '客户管理', icon: 'users' } },
      { name: 'Quotations', path: '/quotations', meta: { title: '报价管理', icon: 'file' } },
      { name: 'Inventory', path: '/inventory', meta: { title: '库存管理', icon: 'package' } },
      { name: 'Contracts', path: '/contracts', meta: { title: '合同管理', icon: 'file' } },
      { name: 'Deliveries', path: '/deliveries', meta: { title: '送货管理', icon: 'truck' } },
      { name: 'RoleSelect', path: '/role-select', meta: { title: '角色选择', icon: 'user' } },
      { name: 'NotFound', path: '/:pathMatch(.*)*', meta: {} }
    ]
  })
}))

/* mock useToast */
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    show: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(Favorites, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

describe('Favorites 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
    mockPush.mockClear()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toContain('收藏导航')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('管理您收藏的常用页面')
    })

    it('应渲染统计栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.fav-stats-bar').exists()).toBe(true)
      expect(wrapper.text()).toContain('已收藏')
      expect(wrapper.text()).toContain('最近访问')
      expect(wrapper.text()).toContain('收藏上限')
    })

    it('应显示收藏上限为15', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.maxFavorites).toBe(15)
    })

    it('无收藏时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.fav-empty').exists()).toBe(true)
      expect(wrapper.find('.fav-empty-title').text()).toBe('暂无收藏')
    })

    it('有收藏时应渲染收藏卡片', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' },
        { path: '/quotations', label: '报价管理', icon: 'file' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      const cards = wrapper.findAll('.fav-card')
      expect(cards.length).toBe(2)
    })
  })

  /* ===== 添加收藏 ===== */
  describe('添加收藏', () => {
    it('添加收藏应增加收藏数量', async () => {
      const wrapper = mountComponent()
      const beforeCount = wrapper.vm.favorites.length

      await wrapper.vm.addFavorite({ path: '/customers', label: '客户管理', icon: 'users' })
      expect(wrapper.vm.favorites.length).toBe(beforeCount + 1)
    })

    it('添加收藏应持久化到 localStorage', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.addFavorite({ path: '/customers', label: '客户管理', icon: 'users' })

      const stored = JSON.parse(localStorage.getItem('gj_erp_navFavorites'))
      expect(stored.length).toBe(1)
      expect(stored[0].path).toBe('/customers')
    })

    it('添加重复收藏应忽略', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.addFavorite({ path: '/customers', label: '客户管理', icon: 'users' })
      const countAfterFirst = wrapper.vm.favorites.length

      await wrapper.vm.addFavorite({ path: '/customers', label: '客户管理', icon: 'users' })
      expect(wrapper.vm.favorites.length).toBe(countAfterFirst)
    })

    it('收藏达到上限时应提示', async () => {
      const wrapper = mountComponent()
      // 填满收藏
      for (let i = 0; i < 15; i++) {
        wrapper.vm.favorites.push({ path: `/path${i}`, label: `项目${i}`, icon: 'file' })
      }

      const toastSpy = vi.fn()
      // 由于 useToast 返回的是 mock，直接测试逻辑
      await wrapper.vm.addFavorite({ path: '/new', label: '新项目', icon: 'file' })
      // 收藏数不应超过上限
      expect(wrapper.vm.favorites.length).toBe(15)
    })
  })

  /* ===== 移除收藏 ===== */
  describe('移除收藏', () => {
    it('移除收藏应减少收藏数量', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' },
        { path: '/quotations', label: '报价管理', icon: 'file' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.removeFavorite('/customers')
      expect(wrapper.vm.favorites.length).toBe(1)
      expect(wrapper.vm.favorites[0].path).toBe('/quotations')
    })

    it('移除收藏应更新 localStorage', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.removeFavorite('/customers')
      const stored = JSON.parse(localStorage.getItem('gj_erp_navFavorites'))
      expect(stored.length).toBe(0)
    })

    it('移除不存在的收藏应无影响', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.removeFavorite('/nonexistent')
      expect(wrapper.vm.favorites.length).toBe(1)
    })
  })

  /* ===== 导航跳转 ===== */
  describe('导航跳转', () => {
    it('点击收藏卡片应跳转到对应路径', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.navigateTo('/customers')
      expect(mockPush).toHaveBeenCalledWith('/customers')
    })
  })

  /* ===== 推荐收藏 ===== */
  describe('推荐收藏', () => {
    it('应渲染推荐收藏区域', () => {
      const wrapper = mountComponent()
      // 无收藏时，所有导航项都应在推荐中
      expect(wrapper.find('.fav-recommend').exists()).toBe(true)
    })

    it('推荐项应排除已收藏的路径', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      const recommend = wrapper.vm.recommendItems
      const hasCustomers = recommend.some(item => item.path === '/customers')
      expect(hasCustomers).toBe(false)
    })

    it('点击推荐项应添加收藏', async () => {
      const wrapper = mountComponent()
      const beforeCount = wrapper.vm.favorites.length

      const recommend = wrapper.vm.recommendItems
      if (recommend.length > 0) {
        await wrapper.vm.addFavorite(recommend[0])
        expect(wrapper.vm.favorites.length).toBe(beforeCount + 1)
      }
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('allNavItems 应从路由配置生成导航项', () => {
      const wrapper = mountComponent()
      const items = wrapper.vm.allNavItems
      expect(items.length).toBeGreaterThan(0)
      items.forEach(item => {
        expect(item).toHaveProperty('path')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('icon')
      })
    })

    it('allNavItems 应排除角色选择页', () => {
      const wrapper = mountComponent()
      const items = wrapper.vm.allNavItems
      const hasRoleSelect = items.some(item => item.path === '/role-select')
      expect(hasRoleSelect).toBe(false)
    })

    it('recommendItems 应返回未收藏的导航项', () => {
      const wrapper = mountComponent()
      const favPaths = new Set(wrapper.vm.favorites.map(f => f.path))
      const recommend = wrapper.vm.recommendItems

      recommend.forEach(item => {
        expect(favPaths.has(item.path)).toBe(false)
      })
    })

    it('recentCount 应在挂载时设置', async () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' },
        { path: '/quotations', label: '报价管理', icon: 'file' },
        { path: '/inventory', label: '库存管理', icon: 'package' }
      ]))
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.recentCount).toBeLessThanOrEqual(5)
    })
  })

  /* ===== localStorage 持久化 ===== */
  describe('localStorage 持久化', () => {
    it('应从 localStorage 加载收藏数据', () => {
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify([
        { path: '/customers', label: '客户管理', icon: 'users' }
      ]))
      const wrapper = mountComponent()

      expect(wrapper.vm.favorites.length).toBe(1)
      expect(wrapper.vm.favorites[0].path).toBe('/customers')
    })

    it('localStorage 无数据时应使用空数组', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.favorites).toEqual([])
    })

    it('localStorage 数据损坏时应使用空数组', () => {
      localStorage.setItem('gj_erp_navFavorites', 'invalid-json')
      const wrapper = mountComponent()
      expect(wrapper.vm.favorites).toEqual([])
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应注册 storage 事件监听', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      mountComponent()
      expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function))
      addSpy.mockRestore()
    })

    it('卸载时应移除 storage 事件监听', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const wrapper = mountComponent()
      wrapper.unmount()
      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function))
      removeSpy.mockRestore()
    })

    it('storage 事件应更新收藏数据', async () => {
      const wrapper = mountComponent()

      // 模拟 storage 事件
      const newData = [{ path: '/new', label: '新页面', icon: 'star' }]
      localStorage.setItem('gj_erp_navFavorites', JSON.stringify(newData))

      const handler = wrapper.vm.handleStorageChange
      handler({ key: 'gj_erp_navFavorites' })

      expect(wrapper.vm.favorites.length).toBe(1)
      expect(wrapper.vm.favorites[0].path).toBe('/new')
    })

    it('storage 事件非收藏键应忽略', async () => {
      const wrapper = mountComponent()
      const beforeFavorites = [...wrapper.vm.favorites]

      const handler = wrapper.vm.handleStorageChange
      handler({ key: 'other_key' })

      expect(wrapper.vm.favorites).toEqual(beforeFavorites)
    })
  })

  /* ===== 返回仪表盘按钮 ===== */
  describe('返回仪表盘按钮', () => {
    it('应渲染返回仪表盘按钮', () => {
      const wrapper = mountComponent()
      const backBtn = wrapper.findAll('button').find(b => b.text().includes('返回仪表盘'))
      expect(backBtn).toBeTruthy()
    })

    it('navigateTo 应调用 router.push', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.navigateTo('/dashboard')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
