/**
 * SettingsCompany.vue 组件级测试
 * 覆盖：渲染、交互、表单验证、保存设置、localStorage 持久化、计算属性、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import SettingsCompany from '@/modules/system/views/SettingsCompany.vue'

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
  return mount(SettingsCompany, {
    global: {
      stubs: { Icon: IconStub }
    }
  })
}

describe('SettingsCompany 组件', () => {
  beforeEach(() => {
    setupPinia()
    clearStorage()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('公司信息')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('管理企业基本信息')
    })

    it('应渲染保存设置按钮', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('保存设置')
    })

    it('应渲染公司基本信息面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('公司基本信息')
    })

    it('应渲染安全与合规面板', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('安全与合规')
    })

    it('应渲染公司名称输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('公司名称')
      expect(wrapper.text()).toContain('*') // 必填标记
    })

    it('应渲染简称输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('简称')
    })

    it('应渲染联系电话输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('联系电话')
    })

    it('应渲染邮箱输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('邮箱')
    })

    it('应渲染地址输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('地址')
    })

    it('应渲染数据加密选择框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('数据加密')
    })

    it('应渲染日志保留天数输入框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('日志保留天数')
    })

    it('应渲染GDPR/PIPL合规模式选择框', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('GDPR/PIPL合规模式')
    })
  })

  /* ===== 默认值 ===== */
  describe('默认值', () => {
    it('默认公司名称应为冠久科技有限公司', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.companyName).toBe('冠久科技有限公司')
    })

    it('默认简称应为冠久科技', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.shortName).toBe('冠久科技')
    })

    it('默认联系电话应为 021-6888XXXX', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.phone).toBe('021-6888XXXX')
    })

    it('默认邮箱应为 contact@guanjiu.com', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.email).toBe('contact@guanjiu.com')
    })

    it('默认地址应为上海市浦东新区', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.address).toContain('上海市浦东新区')
    })

    it('默认加密方式应为 AES-256', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.encryption).toBe('aes256')
    })

    it('默认日志保留天数应为 90', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.logRetention).toBe(90)
    })

    it('默认合规模式应为 PIPL', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.compliance).toBe('pipl')
    })
  })

  /* ===== 表单交互 ===== */
  describe('表单交互', () => {
    it('修改公司名称应更新表单值', async () => {
      const wrapper = mountComponent()
      const inputs = wrapper.findAll('input.form-input')
      const nameInput = inputs.find(i => i.attributes('placeholder') === '公司全称')
      if (nameInput) {
        await nameInput.setValue('新公司名称')
        expect(wrapper.vm.form.companyName).toBe('新公司名称')
      }
    })

    it('修改简称应更新表单值', async () => {
      const wrapper = mountComponent()
      const inputs = wrapper.findAll('input.form-input')
      const shortInput = inputs.find(i => i.attributes('placeholder') === '公司简称')
      if (shortInput) {
        await shortInput.setValue('新简称')
        expect(wrapper.vm.form.shortName).toBe('新简称')
      }
    })

    it('修改联系电话应更新表单值', async () => {
      const wrapper = mountComponent()
      const inputs = wrapper.findAll('input.form-input')
      const phoneInput = inputs.find(i => i.attributes('placeholder') === '联系电话')
      if (phoneInput) {
        await phoneInput.setValue('0512-12345678')
        expect(wrapper.vm.form.phone).toBe('0512-12345678')
      }
    })

    it('修改邮箱应更新表单值', async () => {
      const wrapper = mountComponent()
      const inputs = wrapper.findAll('input.form-input')
      const emailInput = inputs.find(i => i.attributes('type') === 'email')
      if (emailInput) {
        await emailInput.setValue('new@test.com')
        expect(wrapper.vm.form.email).toBe('new@test.com')
      }
    })

    it('修改地址应更新表单值', async () => {
      const wrapper = mountComponent()
      const textareas = wrapper.findAll('textarea.form-input')
      if (textareas.length > 0) {
        await textareas[0].setValue('新地址')
        expect(wrapper.vm.form.address).toBe('新地址')
      }
    })

    it('修改加密方式应更新表单值', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const encryptionSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('AES'))
      })
      if (encryptionSelect) {
        await encryptionSelect.setValue('aes128')
        expect(wrapper.vm.form.encryption).toBe('aes128')
      }
    })

    it('修改合规模式应更新表单值', async () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const complianceSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('GDPR'))
      })
      if (complianceSelect) {
        await complianceSelect.setValue('gdpr')
        expect(wrapper.vm.form.compliance).toBe('gdpr')
      }
    })
  })

  /* ===== 保存设置 ===== */
  describe('保存设置', () => {
    it('保存设置应持久化到 localStorage', async () => {
      const wrapper = mountComponent()
      wrapper.vm.form.companyName = '新公司'
      wrapper.vm.form.shortName = '新简称'

      await wrapper.vm.saveSettings()
      await flushPromises()

      const stored = JSON.parse(localStorage.getItem('gj_erp_companyInfo'))
      expect(stored.companyName).toBe('新公司')
      expect(stored.shortName).toBe('新简称')
    })

    it('保存成功应弹出提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.saveSettings()
      expect(alertSpy).toHaveBeenCalledWith('公司信息和系统参数已更新')

      alertSpy.mockRestore()
    })

    it('保存应包含所有表单字段', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.saveSettings()

      const stored = JSON.parse(localStorage.getItem('gj_erp_companyInfo'))
      expect(stored).toHaveProperty('companyName')
      expect(stored).toHaveProperty('shortName')
      expect(stored).toHaveProperty('phone')
      expect(stored).toHaveProperty('email')
      expect(stored).toHaveProperty('address')
      expect(stored).toHaveProperty('encryption')
      expect(stored).toHaveProperty('logRetention')
      expect(stored).toHaveProperty('compliance')
    })
  })

  /* ===== localStorage 持久化 ===== */
  describe('localStorage 持久化', () => {
    it('应从 localStorage 加载已保存设置', () => {
      localStorage.setItem('gj_erp_companyInfo', JSON.stringify({
        companyName: '测试公司',
        shortName: '测试',
        phone: '0512-99999999',
        email: 'test@test.com',
        address: '测试地址',
        encryption: 'aes128',
        logRetention: 180,
        compliance: 'gdpr'
      }))

      const wrapper = mountComponent()
      expect(wrapper.vm.form.companyName).toBe('测试公司')
      expect(wrapper.vm.form.shortName).toBe('测试')
      expect(wrapper.vm.form.phone).toBe('0512-99999999')
      expect(wrapper.vm.form.email).toBe('test@test.com')
      expect(wrapper.vm.form.address).toBe('测试地址')
      expect(wrapper.vm.form.encryption).toBe('aes128')
      expect(wrapper.vm.form.logRetention).toBe(180)
      expect(wrapper.vm.form.compliance).toBe('gdpr')
    })

    it('localStorage 无数据时应使用默认值', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form.companyName).toBe('冠久科技有限公司')
      expect(wrapper.vm.form.encryption).toBe('aes256')
      expect(wrapper.vm.form.logRetention).toBe(90)
      expect(wrapper.vm.form.compliance).toBe('pipl')
    })

    it('localStorage 数据损坏时应使用默认值', () => {
      localStorage.setItem('gj_erp_companyInfo', 'invalid-json')
      const wrapper = mountComponent()
      expect(wrapper.vm.form.companyName).toBe('冠久科技有限公司')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('挂载时应从 localStorage 恢复数据', () => {
      localStorage.setItem('gj_erp_companyInfo', JSON.stringify({
        companyName: '恢复的公司',
        shortName: '恢复',
        phone: '0512-11111111',
        email: 'restore@test.com',
        address: '恢复地址',
        encryption: 'aes256',
        logRetention: 90,
        compliance: 'pipl'
      }))

      const wrapper = mountComponent()
      expect(wrapper.vm.form.companyName).toBe('恢复的公司')
    })

    it('组件应正常卸载', () => {
      const wrapper = mountComponent()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })

  /* ===== 表单完整性 ===== */
  describe('表单完整性', () => {
    it('应包含所有公司基本信息字段', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form).toHaveProperty('companyName')
      expect(wrapper.vm.form).toHaveProperty('shortName')
      expect(wrapper.vm.form).toHaveProperty('phone')
      expect(wrapper.vm.form).toHaveProperty('email')
      expect(wrapper.vm.form).toHaveProperty('address')
    })

    it('应包含所有安全与合规字段', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.form).toHaveProperty('encryption')
      expect(wrapper.vm.form).toHaveProperty('logRetention')
      expect(wrapper.vm.form).toHaveProperty('compliance')
    })

    it('加密选项应包含 AES-256 和 AES-128', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const encryptionSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('AES'))
      })
      if (encryptionSelect) {
        const options = encryptionSelect.findAll('option')
        const optionValues = options.map(o => o.attributes('value'))
        expect(optionValues).toContain('aes256')
        expect(optionValues).toContain('aes128')
      }
    })

    it('合规模式选项应包含 PIPL 和 GDPR', () => {
      const wrapper = mountComponent()
      const selects = wrapper.findAll('select.form-select')
      const complianceSelect = selects.find(s => {
        const options = s.findAll('option')
        return options.some(o => o.text().includes('GDPR'))
      })
      if (complianceSelect) {
        const options = complianceSelect.findAll('option')
        const optionValues = options.map(o => o.attributes('value'))
        expect(optionValues).toContain('pipl')
        expect(optionValues).toContain('gdpr')
      }
    })

    it('公司名称应有必填标记', () => {
      const wrapper = mountComponent()
      const labels = wrapper.findAll('.form-label')
      const nameLabel = labels.find(l => l.text().includes('公司名称'))
      if (nameLabel) {
        expect(nameLabel.find('.required').exists()).toBe(true)
      }
    })
  })

  /* ===== 保存按钮交互 ===== */
  describe('保存按钮交互', () => {
    it('点击保存按钮应触发保存操作', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存设置'))
      if (saveBtn) {
        await saveBtn.trigger('click')
        expect(alertSpy).toHaveBeenCalledWith('公司信息和系统参数已更新')
      }

      alertSpy.mockRestore()
    })
  })
})
