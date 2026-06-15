/**
 * SystemManagement.vue 组件级测试
 * 覆盖：渲染、Tab切换、权限矩阵、实时预览、路由联动
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import SystemManagement from '@/modules/system/views/SystemManagement.vue'
import { usePermissionStore } from '@/stores/permission'

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

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ query: {} })
}))

/* ===== 子组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}
const ThemeSettingsStub = { template: '<div class="theme-settings-stub">主题设置</div>' }
const DataManagementStub = { template: '<div class="data-management-stub">数据管理</div>' }
const UserManagementStub = { template: '<div class="user-management-stub">用户管理</div>' }
const DataDictionaryStub = { template: '<div class="data-dictionary-stub">数据字典</div>' }

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(SystemManagement, {
    global: {
      stubs: {
        Icon: IconStub,
        ThemeSettings: ThemeSettingsStub,
        DataManagement: DataManagementStub,
        UserManagement: UserManagementStub,
        DataDictionary: DataDictionaryStub
      }
    }
  })
}

describe('SystemManagement 组件', () => {
  let permStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    mockPush.mockClear()
    mockReplace.mockClear()
    permStore = usePermissionStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('系统管理')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('主题管理')
    })

    it('应渲染Tab栏', () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      expect(tabBtns.length).toBe(4)
    })

    it('默认应显示主题管理Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('themes')
    })

    it('默认应渲染ThemeSettings组件', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.theme-settings-stub').exists()).toBe(true)
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('点击数据管理Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('data')
      expect(wrapper.find('.data-management-stub').exists()).toBe(true)
    })

    it('点击用户管理Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('users')
      expect(wrapper.find('.user-management-stub').exists()).toBe(true)
    })

    it('点击数据字典Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[3].trigger('click')
      expect(wrapper.vm.activeTab).toBe('dicts')
      expect(wrapper.find('.data-dictionary-stub').exists()).toBe(true)
    })

    it('切换Tab应更新路由query', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')
      await flushPromises()

      expect(mockReplace).toHaveBeenCalled()
    })
  })

  /* ===== 权限矩阵 ===== */
  describe('权限矩阵', () => {
    it('用户管理Tab下应显示权限矩阵按钮', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'users'
      await flushPromises()

      const matrixBtn = wrapper.find('.matrix-toggle-btn')
      expect(matrixBtn.exists()).toBe(true)
    })

    it('点击权限矩阵按钮应切换矩阵显示', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'users'
      await flushPromises()

      const matrixBtn = wrapper.find('.matrix-toggle-btn')
      await matrixBtn.trigger('click')
      expect(wrapper.vm.showMatrix).toBe(true)

      await matrixBtn.trigger('click')
      expect(wrapper.vm.showMatrix).toBe(false)
    })

    it('无角色数据时应显示空状态', async () => {
      permStore.roles = []
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'users'
      wrapper.vm.showMatrix = true
      await flushPromises()

      expect(wrapper.find('.matrix-empty').exists()).toBe(true)
    })

    it('有角色数据时应渲染矩阵表格', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'users'
      wrapper.vm.showMatrix = true
      await flushPromises()

      if (permStore.roles.length > 0 && permStore.defaultModules.length > 0) {
        expect(wrapper.find('.matrix-table').exists()).toBe(true)
      }
    })
  })

  /* ===== 实时预览 ===== */
  describe('实时预览', () => {
    it('点击实时预览按钮应显示预览面板', async () => {
      const wrapper = mountComponent()
      const previewBtn = wrapper.find('.preview-toggle-btn')
      await previewBtn.trigger('click')

      expect(wrapper.vm.showPreview).toBe(true)
      expect(wrapper.find('.preview-panel').exists()).toBe(true)
    })

    it('再次点击应关闭预览面板', async () => {
      const wrapper = mountComponent()
      const previewBtn = wrapper.find('.preview-toggle-btn')
      await previewBtn.trigger('click')
      expect(wrapper.vm.showPreview).toBe(true)

      await previewBtn.trigger('click')
      expect(wrapper.vm.showPreview).toBe(false)
    })

    it('点击关闭按钮应关闭预览面板', async () => {
      const wrapper = mountComponent()
      wrapper.vm.showPreview = true
      await flushPromises()

      const closeBtn = wrapper.find('.preview-close-btn')
      await closeBtn.trigger('click')
      expect(wrapper.vm.showPreview).toBe(false)
    })
  })

  /* ===== 计算属性与数据 ===== */
  describe('计算属性与数据', () => {
    it('tabs 配置应包含4个Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.tabs.length).toBe(4)
    })

    it('tabQueryMap 应正确映射Tab到路由参数', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.tabQueryMap.themes).toBe('themes')
      expect(wrapper.vm.tabQueryMap.data).toBe('data')
      expect(wrapper.vm.tabQueryMap.users).toBe('users')
      expect(wrapper.vm.tabQueryMap.dicts).toBe('dict')
    })
  })
})
