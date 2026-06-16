/**
 * RoleSelect.vue 组件级测试
 * 覆盖：渲染、交互、角色选择、进入系统、在线成员
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import { useSessionStore } from '@/stores/session'
import RoleSelect from '@/views/RoleSelect.vue'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ path: '/' })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent(options = {}) {
  return mount(RoleSelect, {
    global: {
      stubs: { Icon: IconStub },
      ...options
    }
  })
}

describe('RoleSelect 组件', () => {
  let sessionStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    sessionStore = useSessionStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应渲染页面标题"冠久ERP"', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.role-title').text()).toBe('冠久ERP')
    })

    it('应渲染副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.role-subtitle').text()).toContain('选择您的身份')
    })

    it('应渲染8个角色卡片', () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.role-card')
      expect(cards.length).toBe(8)
    })

    it('应渲染所有角色名称', () => {
      const wrapper = mountComponent()
      const names = wrapper.findAll('.role-card-name').map(el => el.text())
      expect(names).toContain('管理员')
      expect(names).toContain('总经理')
      expect(names).toContain('销售主管')
      expect(names).toContain('销售员')
      expect(names).toContain('仓库主管')
      expect(names).toContain('仓管员')
      expect(names).toContain('财务')
      expect(names).toContain('查看者')
    })

    it('应渲染"进入系统"按钮', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.enter-btn')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('进入系统')
    })

    it('未选择角色时按钮应被禁用', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.enter-btn')
      expect(btn.attributes('disabled')).toBeDefined()
    })

    it('应渲染在线成员区域（非单人模式）', () => {
      const wrapper = mountComponent()
      /* 默认非单人模式，应显示在线成员区域 */
      expect(wrapper.find('.online-section').exists()).toBe(true)
    })

    it('无在线成员时应显示空状态', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.online-empty').exists()).toBe(true)
      expect(wrapper.find('.online-empty').text()).toContain('暂无其他成员在线')
    })

    it('单人模式下应隐藏在线成员区域', async () => {
      sessionStore.isSoloMode = true
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.online-section').exists()).toBe(false)
    })

    it('应渲染底部文字', () => {
      const wrapper = mountComponent()
      /* 默认非单人模式显示团队共享模式 */
      expect(wrapper.find('.role-footer').text()).toContain('团队共享模式')
    })

    it('单人模式下底部应显示个人使用模式', async () => {
      sessionStore.isSoloMode = true
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.role-footer').text()).toContain('个人使用模式')
    })
  })

  /* ===== 角色选择交互 ===== */
  describe('角色选择交互', () => {
    it('点击角色卡片应选中该角色', async () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.role-card')
      await cards[0].trigger('click')

      expect(wrapper.vm.selectedRole).toBe('管理员')
      expect(cards[0].classes()).toContain('selected')
    })

    it('点击不同角色应切换选中状态', async () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.role-card')

      await cards[0].trigger('click')
      expect(wrapper.vm.selectedRole).toBe('管理员')

      await cards[2].trigger('click')
      expect(wrapper.vm.selectedRole).toBe('销售主管')
    })

    it('选中角色后按钮应变为可用', async () => {
      const wrapper = mountComponent()
      const cards = wrapper.findAll('.role-card')
      await cards[0].trigger('click')

      const btn = wrapper.find('.enter-btn')
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })

  /* ===== 进入系统 ===== */
  describe('进入系统', () => {
    it('点击进入系统应调用 sessionStore.selectRole 并跳转', async () => {
      const wrapper = mountComponent()
      const selectRoleSpy = vi.spyOn(sessionStore, 'selectRole')

      // 选择角色
      await wrapper.findAll('.role-card')[0].trigger('click')
      // 点击进入
      await wrapper.find('.enter-btn').trigger('click')

      expect(selectRoleSpy).toHaveBeenCalledWith('管理员', false)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')

      selectRoleSpy.mockRestore()
    })

    it('未选择角色时点击进入系统不应执行任何操作', async () => {
      const wrapper = mountComponent()
      mockPush.mockClear()

      await wrapper.find('.enter-btn').trigger('click')
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时若有已恢复的会话应跳转到仪表盘', async () => {
      const sessionStore = useSessionStore()
      vi.spyOn(sessionStore, 'restoreSession').mockReturnValue(true)
      mockReplace.mockClear()

      mountComponent()

      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })

    it('挂载时若无已恢复的会话不应跳转', async () => {
      const sessionStore = useSessionStore()
      vi.spyOn(sessionStore, 'restoreSession').mockReturnValue(false)
      mockReplace.mockClear()

      mountComponent()

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  /* ===== 在线成员 ===== */
  describe('在线成员', () => {
    it('有在线成员时应渲染成员列表', async () => {
      const sessionStore = useSessionStore()
      sessionStore.onlineMembers = ['张三', '李四']

      const wrapper = mountComponent()
      await flushPromises()

      const members = wrapper.findAll('.online-member')
      expect(members.length).toBe(2)
      expect(members[0].text()).toContain('张三')
      expect(members[1].text()).toContain('李四')
    })

    it('应显示在线人数', async () => {
      const sessionStore = useSessionStore()
      sessionStore.onlineMembers = ['张三', '李四', '王五']

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.find('.online-count').text()).toBe('3人')
    })
  })

  /* ===== 记住身份 ===== */
  describe('记住身份', () => {
    it('应渲染记住身份复选框', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.remember-check').exists()).toBe(true)
      expect(wrapper.find('.remember-label').text()).toBe('记住我的身份')
    })

    it('勾选记住身份后进入系统应传入 remember=true', async () => {
      const wrapper = mountComponent()
      const selectRoleSpy = vi.spyOn(sessionStore, 'selectRole')

      await wrapper.findAll('.role-card')[0].trigger('click')
      await wrapper.find('input[type="checkbox"]').setValue(true)
      await wrapper.find('.enter-btn').trigger('click')

      expect(selectRoleSpy).toHaveBeenCalledWith('管理员', true)
      selectRoleSpy.mockRestore()
    })

    it('有记住的角色时应自动选中该角色', async () => {
      sessionStore.rememberedRole = '财务'
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.selectedRole).toBe('财务')
      expect(wrapper.vm.rememberRole).toBe(true)
    })
  })
})
