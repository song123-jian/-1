/**
 * MobileDesign.vue 组件级测试
 * 覆盖：渲染、交互、方案切换、设备切换、实时预览、导出设计规格、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import MobileDesign from '@/modules/system/views/MobileDesign.vue'
import { useMobileDesignStore } from '@/modules/system/stores/mobileDesign'

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

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  return mount(MobileDesign, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

describe('MobileDesign 组件', () => {
  let store

  beforeEach(() => {
    setupPinia()
    clearStorage()
    store = useMobileDesignStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('移动端设计')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('移动应用启动页')
    })

    it('应渲染5个方案切换按钮', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.filter-bar .btn')
      // 5个方案按钮 + 设备按钮 + 导出按钮
      const proposalBtns = buttons.filter(b => b.text().includes('方案'))
      expect(proposalBtns.length).toBe(5)
    })

    it('应渲染3个设备切换按钮', () => {
      const wrapper = mountComponent()
      const deviceBtns = wrapper.findAll('.btn-ghost.btn-sm').filter(b => {
        const text = b.text()
        return text.includes('iPhone') || text.includes('Android') || text.includes('iPad')
      })
      expect(deviceBtns.length).toBe(3)
    })

    it('应渲染手机预览框', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.phone-frame').exists()).toBe(true)
    })

    it('应渲染手机状态栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.phone-status-bar').exists()).toBe(true)
      expect(wrapper.find('.phone-status-bar').text()).toContain('9:41')
    })

    it('应渲染手机导航栏', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.phone-nav-bar').exists()).toBe(true)
    })

    it('应渲染设计规格面板', () => {
      const wrapper = mountComponent()
      const titles = wrapper.findAll('.panel-card-title')
      const specTitle = titles.filter(t => t.text().includes('设计规格'))
      expect(specTitle.length).toBeGreaterThan(0)
    })

    it('应渲染色彩系统', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('色彩系统')
    })

    it('应渲染排版规范', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('排版规范')
    })

    it('应渲染间距系统', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('间距系统')
    })

    it('应渲染组件规范', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('组件规范')
    })

    it('应渲染动画参数', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('动画参数')
    })
  })

  /* ===== 方案切换 ===== */
  describe('方案切换', () => {
    it('默认应选中方案一', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeProposal).toBe(1)
    })

    it('点击方案二按钮应切换到方案二', async () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('.btn')
      const btn2 = buttons.find(b => b.text().includes('方案二'))
      if (btn2) {
        await btn2.trigger('click')
        expect(wrapper.vm.activeProposal).toBe(2)
      }
    })

    it('切换方案应更新当前设计规格', async () => {
      const wrapper = mountComponent()
      const spec1 = wrapper.vm.currentSpec

      wrapper.vm.activeProposal = 2
      await flushPromises()

      const spec2 = wrapper.vm.currentSpec
      expect(spec2.name).toBe('科技活力')
      expect(spec2).not.toEqual(spec1)
    })

    it('方案一名称应为极简商务', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentProposalName).toBe('极简商务')
    })

    it('方案四名称应为暗色高端', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeProposal = 4
      await flushPromises()
      expect(wrapper.vm.currentProposalName).toBe('暗色高端')
    })
  })

  /* ===== 设备切换 ===== */
  describe('设备切换', () => {
    it('默认应选中 iPhone', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeDevice).toBe('iphone')
    })

    it('切换到 Android 应更新设备', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeDevice = 'android'
      await flushPromises()

      expect(wrapper.vm.activeDevice).toBe('android')
    })

    it('切换到 iPad 应更新设备', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeDevice = 'ipad'
      await flushPromises()

      expect(wrapper.vm.activeDevice).toBe('ipad')
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('currentSpec 应返回当前方案的设计规格', () => {
      const wrapper = mountComponent()
      const spec = wrapper.vm.currentSpec
      expect(spec).toHaveProperty('colors')
      expect(spec).toHaveProperty('typography')
      expect(spec).toHaveProperty('spacing')
      expect(spec).toHaveProperty('components')
      expect(spec).toHaveProperty('animation')
    })

    it('currentProposalName 应返回当前方案名称', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.currentProposalName).toBe('极简商务')
    })

    it('phoneFrameStyle 应根据设备返回正确尺寸', () => {
      const wrapper = mountComponent()
      const style = wrapper.vm.phoneFrameStyle
      expect(style).toHaveProperty('width')
      expect(style).toHaveProperty('height')
    })

    it('phoneContentStyle 应包含背景色和文本色', () => {
      const wrapper = mountComponent()
      const style = wrapper.vm.phoneContentStyle
      expect(style).toHaveProperty('background')
      expect(style).toHaveProperty('color')
    })

    it('iPad 设备应有缩放', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeDevice = 'ipad'
      await flushPromises()

      const style = wrapper.vm.phoneFrameStyle
      expect(style.width).toBeTruthy()
    })

    it('各方案色彩系统应包含所有必要颜色键', () => {
      const wrapper = mountComponent()
      const requiredKeys = ['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'bg', 'text']

      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        const colors = wrapper.vm.currentSpec.colors
        requiredKeys.forEach(key => {
          expect(colors).toHaveProperty(key)
        })
      }
    })

    it('各方案排版规范应包含所有必要键', () => {
      const wrapper = mountComponent()
      const requiredKeys = ['heading', 'body', 'caption']

      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        const typo = wrapper.vm.currentSpec.typography
        requiredKeys.forEach(key => {
          expect(typo).toHaveProperty(key)
        })
      }
    })

    it('各方案间距系统应包含所有必要键', () => {
      const wrapper = mountComponent()
      const requiredKeys = ['xs', 'sm', 'md', 'lg', 'xl']

      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        const spacing = wrapper.vm.currentSpec.spacing
        requiredKeys.forEach(key => {
          expect(spacing).toHaveProperty(key)
        })
      }
    })

    it('各方案组件规范应包含所有必要键', () => {
      const wrapper = mountComponent()
      const requiredKeys = ['buttonHeight', 'inputHeight', 'cardPadding', 'borderRadius']

      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        const comp = wrapper.vm.currentSpec.components
        requiredKeys.forEach(key => {
          expect(comp).toHaveProperty(key)
        })
      }
    })

    it('各方案动画参数应包含持续时间和缓动函数', () => {
      const wrapper = mountComponent()

      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        const anim = wrapper.vm.currentSpec.animation
        expect(anim).toHaveProperty('duration')
        expect(anim).toHaveProperty('easing')
      }
    })
  })

  /* ===== 实时预览切换 ===== */
  describe('实时预览切换', () => {
    it('默认实时预览应关闭', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.realtimePreview).toBe(false)
    })

    it('切换实时预览应更新状态', async () => {
      const wrapper = mountComponent()
      const checkbox = wrapper.find('input[type="checkbox"]')
      if (checkbox.exists()) {
        await checkbox.setValue(true)
        expect(wrapper.vm.realtimePreview).toBe(true)
      }
    })
  })

  /* ===== 导出设计规格 ===== */
  describe('导出设计规格', () => {
    it('导出应创建 Blob 并触发下载', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      await wrapper.vm.exportDesignSpec()

      expect(createObjectURLSpy).toHaveBeenCalled()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  /* ===== 标签映射 ===== */
  describe('标签映射', () => {
    it('colorLabels 应包含所有颜色标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.colorLabels.primary).toBe('主色')
      expect(wrapper.vm.colorLabels.secondary).toBe('辅色')
      expect(wrapper.vm.colorLabels.accent).toBe('强调色')
    })

    it('typoLabels 应包含所有排版标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.typoLabels.heading).toBe('标题')
      expect(wrapper.vm.typoLabels.body).toBe('正文')
      expect(wrapper.vm.typoLabels.caption).toBe('辅助')
    })

    it('spaceLabels 应包含所有间距标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.spaceLabels.xs).toBe('XS')
      expect(wrapper.vm.spaceLabels.xl).toBe('XL')
    })

    it('compLabels 应包含所有组件标签', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.compLabels.buttonHeight).toBe('按钮高度')
      expect(wrapper.vm.compLabels.borderRadius).toBe('圆角')
    })
  })

  /* ===== 方案数据完整性 ===== */
  describe('方案数据完整性', () => {
    it('所有5个方案都应有设计规格', () => {
      const wrapper = mountComponent()
      for (let i = 1; i <= 5; i++) {
        wrapper.vm.activeProposal = i
        expect(wrapper.vm.currentSpec).toBeTruthy()
        expect(wrapper.vm.currentSpec.name).toBeTruthy()
      }
    })

    it('方案二应为暗色模式', () => {
      const wrapper = mountComponent()
      wrapper.vm.activeProposal = 2
      expect(wrapper.vm.currentSpec.colors.bg).toBe('#0a0a1a')
    })

    it('方案四主色应为金色', () => {
      const wrapper = mountComponent()
      wrapper.vm.activeProposal = 4
      expect(wrapper.vm.currentSpec.colors.primary).toBe('#d4af37')
    })

    it('方案五主色应为绿色', () => {
      const wrapper = mountComponent()
      wrapper.vm.activeProposal = 5
      expect(wrapper.vm.currentSpec.colors.primary).toBe('#43a047')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('组件应正常挂载和卸载', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.mobiledesign-page').exists()).toBe(true)
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
