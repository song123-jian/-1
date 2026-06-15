/**
 * NotFound.vue 组件级测试
 * 覆盖：渲染、交互
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import NotFound from '@/views/NotFound.vue'

/* ===== mock 依赖 ===== */
vi.mock('@/utils/syncEngine', () => ({
  useSyncEngine: () => ({
    recordDeletedId: vi.fn(),
    recordDeletedIds: vi.fn(),
    clearDeletedId: vi.fn()
  })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ roleName: '测试用户' })
}))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(NotFound, {
    global: {
      stubs: { Icon: IconStub },
      mocks: {
        $router: { push: vi.fn() }
      }
    }
  })
}

describe('NotFound 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应渲染 404 标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('h1').text()).toBe('404')
    })

    it('应渲染"页面不存在"提示', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('p').text()).toBe('页面不存在')
    })

    it('应渲染返回首页按钮', () => {
      const wrapper = mountComponent()
      const btn = wrapper.find('.btn-back')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toBe('返回首页')
    })

    it('应包含 not-found-page 容器', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.not-found-page').exists()).toBe(true)
    })
  })

  /* ===== 交互 ===== */
  describe('交互', () => {
    it('点击返回首页按钮应调用 $router.push("/dashboard")', async () => {
      const push = vi.fn()
      const wrapper = mount(NotFound, {
        global: {
          stubs: { Icon: IconStub },
          mocks: { $router: { push } }
        }
      })

      await wrapper.find('.btn-back').trigger('click')
      expect(push).toHaveBeenCalledWith('/dashboard')
    })
  })
})
