/**
 * DocSettings.vue 组件级测试
 * 覆盖：渲染、Tab切换、资质CRUD、开票资料CRUD、搜索过滤、设置保存、合规检查、导出、生命周期
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setupPinia, clearStorage } from '@/__tests__/setup'
import DocSettings from '@/modules/system/views/DocSettings.vue'
import { useDocSettingsStore } from '@/modules/system/stores/docSettings'

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

/* ===== Canvas mock ===== */
const mockCtx = {
  clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(),
  closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
  strokeText: vi.fn(), scale: vi.fn(), save: vi.fn(), restore: vi.fn(), roundRect: vi.fn()
}
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx)
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 400, height: 260, top: 0, left: 0, bottom: 260, right: 400 }))

/* ===== Icon 组件 stub ===== */
const IconStub = {
  props: ['name', 'size'],
  template: '<span class="icon-stub">{{ name }}</span>'
}

/* ===== 辅助：创建并挂载组件 ===== */
function mountComponent() {
  const div = document.createElement('div')
  document.body.appendChild(div)
  return mount(DocSettings, {
    attachTo: div,
    global: {
      stubs: { Icon: IconStub, Teleport: false }
    }
  })
}

/* ===== 辅助：向 store 添加测试数据 ===== */
function seedQualifications(store, count = 3) {
  const types = ['business_license', 'iso_cert', 'import_export']
  const statuses = ['active', 'expiring_soon', 'expired']
  for (let i = 0; i < count; i++) {
    store.qualifications.push({
      id: `q_test_${i}`,
      name: `测试资质${i + 1}`,
      type: types[i % types.length],
      certNo: `CERT-${String(i + 1).padStart(4, '0')}`,
      issuer: `测试发证机关${i + 1}`,
      issueDate: '2023-01-01',
      expiryDate: i === 2 ? '2020-01-01' : '2030-12-31',
      status: statuses[i % statuses.length],
      warning: statuses[i % statuses.length] === 'expired' ? '已过期' : ''
    })
  }
}

function seedInvoices(store, count = 2) {
  for (let i = 0; i < count; i++) {
    store.invoiceProfiles.push({
      id: `inv_test_${i}`,
      companyName: `测试公司${i + 1}`,
      taxNo: `91310000MA${String(i).padStart(8, '0')}`,
      bank: '测试银行',
      bankAccount: `1234 5678 ${String(i).padStart(4, '0')}`,
      address: '测试地址',
      phone: '021-12345678',
      invoiceType: '增值税专用发票',
      isDefault: i === 0
    })
  }
}

describe('DocSettings 组件', () => {
  let dsStore

  beforeEach(() => {
    setupPinia()
    clearStorage()
    dsStore = useDocSettingsStore()
  })

  /* ===== 渲染 ===== */
  describe('渲染', () => {
    it('应正确渲染页面标题和副标题', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.page-header-title').text()).toBe('资质设置')
      expect(wrapper.find('.page-header-subtitle').text()).toContain('资质证照管理')
    })

    it('应渲染Tab栏', () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      expect(tabBtns.length).toBe(5) // 基础配置、资质管理、开票资料、合规报告、操作日志
    })

    it('默认应显示基础配置Tab', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.activeTab).toBe('config')
    })
  })

  /* ===== Tab切换 ===== */
  describe('Tab切换', () => {
    it('点击资质管理Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[1].trigger('click')
      expect(wrapper.vm.activeTab).toBe('quals')
    })

    it('点击开票资料Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[2].trigger('click')
      expect(wrapper.vm.activeTab).toBe('invoice')
    })

    it('点击合规报告Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[3].trigger('click')
      expect(wrapper.vm.activeTab).toBe('compliance')
    })

    it('点击操作日志Tab应切换', async () => {
      const wrapper = mountComponent()
      const tabBtns = wrapper.findAll('.tab-btn')
      await tabBtns[4].trigger('click')
      expect(wrapper.vm.activeTab).toBe('logs')
    })
  })

  /* ===== 基础配置 ===== */
  describe('基础配置', () => {
    it('应显示设置表单', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    })

    it('保存设置应调用store并提示', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      wrapper.vm.editSettings.licenseDays = 60
      await wrapper.vm.saveSettings()

      expect(alertSpy).toHaveBeenCalledWith('设置已保存')
      expect(dsStore.settings.licenseDays).toBe(60)

      alertSpy.mockRestore()
    })

    it('应用预设应更新设置', async () => {
      const wrapper = mountComponent()

      await wrapper.vm.applyPreset('strict')
      expect(wrapper.vm.editSettings.licenseDays).toBe(60)
      expect(wrapper.vm.editSettings.completeness).toBe(95)
    })

    it('合规检查应提示评分', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.checkCompliance()
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('合规评分'))

      alertSpy.mockRestore()
    })
  })

  /* ===== 资质管理 ===== */
  describe('资质管理', () => {
    it('有资质数据时应渲染表格行', async () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(3)
    })

    it('无资质数据时应显示空状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('应显示统计卡片', async () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      const cards = wrapper.findAll('.stat-card')
      expect(cards.length).toBe(4) // 资质总数、有效、即将到期、已过期
    })

    it('按名称搜索应过滤结果', async () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      wrapper.vm.qualSearch = '测试资质1'
      await flushPromises()

      expect(wrapper.vm.filteredQuals.length).toBe(1)
    })

    it('按类型过滤应过滤结果', async () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      wrapper.vm.qualTypeFilter = 'business_license'
      await flushPromises()

      wrapper.vm.filteredQuals.forEach(q => {
        expect(q.type).toBe('business_license')
      })
    })

    it('按状态过滤应过滤结果', async () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'quals'
      await flushPromises()

      wrapper.vm.qualStatusFilter = 'active'
      await flushPromises()

      wrapper.vm.filteredQuals.forEach(q => {
        expect(q.status).toBe('active')
      })
    })
  })

  /* ===== 新增资质 ===== */
  describe('新增资质', () => {
    it('点击新增资质按钮应打开弹窗', async () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('.btn-primary')
      await addBtn.trigger('click')

      expect(wrapper.vm.showQualModal).toBe(true)
    })

    it('新增弹窗表单应有默认值', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.openQualModal()

      expect(wrapper.vm.qualForm.name).toBe('')
      expect(wrapper.vm.qualForm.type).toBe('business_license')
      expect(wrapper.vm.editingQual).toBeNull()
    })

    it('资质名称为空时提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openQualModal()
      wrapper.vm.qualForm.name = ''
      await wrapper.vm.submitQual()

      expect(alertSpy).toHaveBeenCalledWith('请填写资质名称')
      alertSpy.mockRestore()
    })

    it('填写完整信息后提交应新增资质', async () => {
      const wrapper = mountComponent()
      const beforeCount = dsStore.qualifications.length

      await wrapper.vm.openQualModal()
      wrapper.vm.qualForm.name = '测试新资质'
      wrapper.vm.qualForm.type = 'business_license'
      wrapper.vm.qualForm.certNo = 'CERT-NEW-001'
      wrapper.vm.qualForm.issuer = '测试发证机关'
      wrapper.vm.qualForm.issueDate = '2024-01-01'
      wrapper.vm.qualForm.expiryDate = '2030-12-31'

      await wrapper.vm.submitQual()

      expect(dsStore.qualifications.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showQualModal).toBe(false)
    })
  })

  /* ===== 编辑资质 ===== */
  describe('编辑资质', () => {
    it('编辑资质应打开弹窗并填充数据', async () => {
      seedQualifications(dsStore, 1)
      const wrapper = mountComponent()

      const q = dsStore.qualifications[0]
      await wrapper.vm.editQual(q)

      expect(wrapper.vm.showQualModal).toBe(true)
      expect(wrapper.vm.editingQual).toBe(q)
      expect(wrapper.vm.qualForm.name).toBe(q.name)
    })

    it('编辑提交应更新资质数据', async () => {
      seedQualifications(dsStore, 1)
      const wrapper = mountComponent()

      const q = dsStore.qualifications[0]
      await wrapper.vm.editQual(q)
      wrapper.vm.qualForm.name = '更新后的资质名'
      await wrapper.vm.submitQual()

      expect(dsStore.qualifications[0].name).toBe('更新后的资质名')
    })
  })

  /* ===== 资质操作 ===== */
  describe('资质操作', () => {
    it('审核资质应更新状态为active', async () => {
      seedQualifications(dsStore, 1)
      dsStore.qualifications[0].status = 'pending_review'
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.approveQual(dsStore.qualifications[0].id)
      expect(dsStore.qualifications[0].status).toBe('active')
      expect(alertSpy).toHaveBeenCalledWith('审核通过')

      alertSpy.mockRestore()
    })

    it('作废资质应弹出确认', async () => {
      seedQualifications(dsStore, 1)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      await wrapper.vm.revokeQual(dsStore.qualifications[0].id)
      expect(confirmSpy).toHaveBeenCalled()
      expect(dsStore.qualifications[0].status).toBe('revoked')

      confirmSpy.mockRestore()
    })

    it('续期资质应弹出输入框', async () => {
      seedQualifications(dsStore, 1)
      const wrapper = mountComponent()
      const promptSpy = vi.spyOn(globalThis, 'prompt').mockReturnValue('2030-12-31')
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.renewQual(dsStore.qualifications[0])
      expect(promptSpy).toHaveBeenCalled()

      promptSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('查看资质应弹出详情', async () => {
      seedQualifications(dsStore, 1)
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.viewQual(dsStore.qualifications[0])
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining(dsStore.qualifications[0].name))

      alertSpy.mockRestore()
    })
  })

  /* ===== 开票资料 ===== */
  describe('开票资料', () => {
    it('有数据时应渲染表格行', async () => {
      seedInvoices(dsStore, 2)
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'invoice'
      await flushPromises()

      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(2)
    })

    it('无数据时应显示空状态', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'invoice'
      await flushPromises()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
    })

    it('新增开票资料应打开弹窗', async () => {
      const wrapper = mountComponent()
      wrapper.vm.activeTab = 'invoice'
      await flushPromises()

      await wrapper.vm.openInvoiceModal()
      expect(wrapper.vm.showInvoiceModal).toBe(true)
      expect(wrapper.vm.editingInvoice).toBeNull()
    })

    it('必填字段为空时提交应提示错误', async () => {
      const wrapper = mountComponent()
      const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

      await wrapper.vm.openInvoiceModal()
      wrapper.vm.invoiceForm.companyName = ''
      wrapper.vm.invoiceForm.taxNo = ''
      await wrapper.vm.submitInvoice()

      expect(alertSpy).toHaveBeenCalledWith('请填写公司名称和税号')
      alertSpy.mockRestore()
    })

    it('填写完整信息后提交应新增开票资料', async () => {
      const wrapper = mountComponent()
      const beforeCount = dsStore.invoiceProfiles.length

      await wrapper.vm.openInvoiceModal()
      wrapper.vm.invoiceForm.companyName = '新公司'
      wrapper.vm.invoiceForm.taxNo = '91310000MA12345678'
      await wrapper.vm.submitInvoice()

      expect(dsStore.invoiceProfiles.length).toBe(beforeCount + 1)
      expect(wrapper.vm.showInvoiceModal).toBe(false)
    })

    it('编辑开票资料应填充数据', async () => {
      seedInvoices(dsStore, 1)
      const wrapper = mountComponent()

      await wrapper.vm.editInvoice(dsStore.invoiceProfiles[0])
      expect(wrapper.vm.showInvoiceModal).toBe(true)
      expect(wrapper.vm.editingInvoice).toBe(dsStore.invoiceProfiles[0])
      expect(wrapper.vm.invoiceForm.companyName).toBe(dsStore.invoiceProfiles[0].companyName)
    })

    it('设为默认应更新isDefault', async () => {
      seedInvoices(dsStore, 2)
      const wrapper = mountComponent()

      await wrapper.vm.setDefaultInvoice(dsStore.invoiceProfiles[1].id)
      expect(dsStore.invoiceProfiles[1].isDefault).toBe(true)
      expect(dsStore.invoiceProfiles[0].isDefault).toBe(false)
    })

    it('删除开票资料应弹出确认', async () => {
      seedInvoices(dsStore, 1)
      const wrapper = mountComponent()
      const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

      await wrapper.vm.deleteInvoice(dsStore.invoiceProfiles[0].id)
      expect(confirmSpy).toHaveBeenCalled()
      expect(dsStore.invoiceProfiles.length).toBe(0)

      confirmSpy.mockRestore()
    })
  })

  /* ===== 导出 ===== */
  describe('导出功能', () => {
    it('导出资质清单应创建Blob', async () => {
      seedQualifications(dsStore, 2)
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportQuals()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })

    it('导出日志应创建Blob', async () => {
      const wrapper = mountComponent()
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')

      await wrapper.vm.exportLogs()
      expect(createObjectURLSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })
  })

  /* ===== 计算属性 ===== */
  describe('计算属性', () => {
    it('filteredQuals 应根据搜索和过滤条件过滤', () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()

      wrapper.vm.qualSearch = '测试资质1'
      expect(wrapper.vm.filteredQuals.length).toBe(1)
    })

    it('riskItems 应返回过期和即将到期的资质', () => {
      seedQualifications(dsStore, 3)
      const wrapper = mountComponent()

      const risks = wrapper.vm.riskItems
      risks.forEach(q => {
        expect(['expired', 'expiring_soon']).toContain(q.status)
      })
    })

    it('filteredLogs 应根据搜索和日期过滤', () => {
      dsStore.logs = [
        { id: '1', time: '2024-06-15 10:00:00', user: '管理员', action: '新增资质', detail: '', ip: '127.0.0.1' },
        { id: '2', time: '2024-06-14 10:00:00', user: '销售员', action: '修改资质', detail: '', ip: '127.0.0.1' }
      ]
      const wrapper = mountComponent()

      wrapper.vm.logSearch = '管理员'
      expect(wrapper.vm.filteredLogs.length).toBe(1)
    })

    it('qualStatusClass 应返回正确的类名', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.qualStatusClass('active')).toBe('success')
      expect(wrapper.vm.qualStatusClass('expiring_soon')).toBe('warning')
      expect(wrapper.vm.qualStatusClass('expired')).toBe('danger')
      expect(wrapper.vm.qualStatusClass('revoked')).toBe('neutral')
      expect(wrapper.vm.qualStatusClass('pending_review')).toBe('info')
    })
  })

  /* ===== 生命周期 ===== */
  describe('生命周期', () => {
    it('卸载时应清理canvas', () => {
      const wrapper = mountComponent()
      wrapper.unmount()
      // 不应抛出异常
    })
  })
})
