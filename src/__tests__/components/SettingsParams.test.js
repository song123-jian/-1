/**
 * SettingsParams.vue 组件级测试
 * 覆盖：渲染、交互、表单验证、保存参数、localStorage 持久化、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import SettingsParams from '@/modules/system/views/SettingsParams.vue'

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
  return mount(SettingsParams, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

describe('SettingsParams 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('系统参数')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('配置业务规则')
    })

    it('应渲染保存参数按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('保存参数')
    })

    it('应渲染财务参数面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('财务参数')
    })

    it('应渲染系统运行参数面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('系统运行参数')
    })

    it('应渲染默认货币选择框', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const currencySelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('人民币'))
      })
      expect(currencySelect).toBeTruthy()
    })

    it('应渲染税率输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('税率(%)')
    })

    it('应渲染小数位数选择框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('小数位数')
    })

    it('应渲染库存计价方法选择框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('库存计价方法')
    })

    it('应渲染会话超时输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('会话超时(小时)')
    })

    it('应渲染自动备份选择框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('自动备份')
    })
  })

  /* ===== 默认值 ===== */
  describe('默认值', () => {
    it('默认货币应为 CNY', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.currency).toBe('CNY')
    })

    it('默认税率应为 13', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.taxRate).toBe(13)
    })

    it('默认小数位数应为 2', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.decimals).toBe(2)
    })

    it('默认库存计价方法应为加权平均', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.costingMethod).toBe('weighted_avg')
    })

    it('默认会话超时应为 8 小时', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.sessionTimeout).toBe(8)
    })

    it('默认自动备份应为每日', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.autoBackup).toBe('daily')
    })
  })

  /* ===== 表单交互 ===== */
  describe('表单交互', () => {
    it('修改货币应更新表单值', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const currencySelect = selects[0]
      await currencySelect.setValue('USD')
      await flushPromises()

      expect(wrapper.vm.form.currency).toBe('USD')
    })

    it('修改税率应更新表单值', async () => {
      const wrapper = mountComponent()
      const inputs = wrapper.findAll('input.form-input')
      const taxInput = inputs.find(i => i.attributes('type') === 'number')
      if (taxInput) {
        await taxInput.setValue(6)
        await flushPromises()
        expect(wrapper.vm.form.taxRate).toBe(6)
      }
    })

    it('修改库存计价方法应更新表单值', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      // 库存计价方法在第3个select
      const costingSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('FIFO'))
      })
      if (costingSelect) {
        await costingSelect.setValue('fifo')
        await flushPromises()
        expect(wrapper.vm.form.costingMethod).toBe('fifo')
      }
    })

    it('修改自动备份应更新表单值', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const backupSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('每周'))
      })
      if (backupSelect) {
        await backupSelect.setValue('weekly')
        await flushPromises()
        expect(wrapper.vm.form.autoBackup).toBe('weekly')
      }
    })
  })

  /* ===== 保存参数 ===== */
  describe('保存参数', () => {
    it('有效参数保存应持久化到 localStorage', async () => {
      const wrapper = mountComponent()
      wrapper.vm.form.currency = 'USD'
      wrapper.vm.form.taxRate = 10

      await wrapper.vm.saveParams()
      await flushPromises()

      const stored = JSON.parse(localStorage.getItem('gj_erp_systemParams'))
      expect(stored.currency).toBe('USD')
      expect(stored.taxRate).toBe(10)
    })

    it('保存成功应弹出提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.saveParams()
      expect(alertSpy).toHaveBeenCalledWith('公司信息和系统参数已更新')

      alertSpy.mockRestore()
    })

    it('税率小于0时应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.form.taxRate = -1
      await wrapper.vm.saveParams()

      expect(alertSpy).toHaveBeenCalledWith('税率必须在0-100之间')
      alertSpy.mockRestore()
    })

    it('税率大于100时应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.form.taxRate = 101
      await wrapper.vm.saveParams()

      expect(alertSpy).toHaveBeenCalledWith('税率必须在0-100之间')
      alertSpy.mockRestore()
    })

    it('会话超时小于1时应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.form.sessionTimeout = 0
      await wrapper.vm.saveParams()

      expect(alertSpy).toHaveBeenCalledWith('会话超时必须在1-72小时之间')
      alertSpy.mockRestore()
    })

    it('会话超时大于72时应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.form.sessionTimeout = 73
      await wrapper.vm.saveParams()

      expect(alertSpy).toHaveBeenCalledWith('会话超时必须在1-72小时之间')
      alertSpy.mockRestore()
    })

    it('验证失败时不应保存到 localStorage', async () => {
      const wrapper = mountComponent()
      wrapper.vm.form.taxRate = -1
      await wrapper.vm.saveParams()

      // localStorage 中不应有新保存的数据（或仍为默认值）
      const stored = localStorage.getItem('gj_erp_systemParams')
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.taxRate).not.toBe(-1)
      }
    })
  })

  /* ===== localStorage 持久化 ===== */
  describe('localStorage 持久化', () => {
    it('应从 localStorage 加载已保存参数', () => {
      localStorage.setItem('gj_erp_systemParams', JSON.stringify({
        currency: 'EUR',
        taxRate: 20,
        decimals: 3,
        costingMethod: 'fifo',
        sessionTimeout: 24,
        autoBackup: 'weekly'
      }))

      const wrapper = mountComponent()
      expect(wrapper.vm.form.currency).toBe('EUR')
      expect(wrapper.vm.form.taxRate).toBe(20)
      expect(wrapper.vm.form.decimals).toBe(3)
      expect(wrapper.vm.form.costingMethod).toBe('fifo')
      expect(wrapper.vm.form.sessionTimeout).toBe(24)
      expect(wrapper.vm.form.autoBackup).toBe('weekly')
    })

    it('localStorage 无数据时应使用默认值', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.currency).toBe('CNY')
      expect(wrapper.vm.form.taxRate).toBe(13)
      expect(wrapper.vm.form.decimals).toBe(2)
    })

    it('localStorage 数据损坏时应使用默认值', () => {
      localStorage.setItem('gj_erp_systemParams', 'invalid-json')
      const wrapper = mountComponent()
      expect(wrapper.vm.form.currency).toBe('CNY')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应从 localStorage 恢复数据', () => {
      localStorage.setItem('gj_erp_systemParams', JSON.stringify({
        currency: 'USD',
        taxRate: 10,
        decimals: 2,
        costingMethod: 'weighted_avg',
        sessionTimeout: 8,
        autoBackup: 'daily'
      }))

      const wrapper = mountComponent()
      expect(wrapper.vm.form.currency).toBe('USD')
    })

    it('组件应正常卸载', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  /* ===== 表单完整性 ===== */
  describe('表单完整性', () => {
    it('应包含所有财务参数字段', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form).toHaveProperty('currency')
      expect(wrapper.vm.form).toHaveProperty('taxRate')
      expect(wrapper.vm.form).toHaveProperty('decimals')
    })

    it('应包含所有系统运行参数字段', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form).toHaveProperty('costingMethod')
      expect(wrapper.vm.form).toHaveProperty('sessionTimeout')
      expect(wrapper.vm.form).toHaveProperty('autoBackup')
    })

    it('货币选项应包含 CNY、USD、EUR', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const currencySelect = selects[0]
      const options = currencySelect.findAll('option')
      const optionValues = options.map(o => o.attributes('value'))
      expect(optionValues).toContain('CNY')
      expect(optionValues).toContain('USD')
      expect(optionValues).toContain('EUR')
    })

    it('计价方法选项应包含加权平均和FIFO', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const costingSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('FIFO'))
      })
      if (costingSelect) {
        const options = costingSelect.findAll('option')
        const optionValues = options.map(o => o.attributes('value'))
        expect(optionValues).toContain('weighted_avg')
        expect(optionValues).toContain('fifo')
      }
    })
  })
})
